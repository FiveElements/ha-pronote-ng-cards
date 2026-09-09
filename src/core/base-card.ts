import { LitElement, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from './ha-types';
import { createResolveCache, resolveDevice } from './resolve';
import type {
  AllowedCall,
  CardSpec,
  EntityKey,
  EntityStatus,
  PronoteCardConfig,
  RenderCtx,
  Translate,
} from './types';
import { sharedStyles } from './ui/styles';
import { missingState, unavailableState } from './ui/parts';
import { localize } from '../localize';

/** Un boost est plafonné à un par palier et par intervalle côté intégration. */
export const REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

const ABSENT_STATES = new Set(['unknown', 'unavailable']);

/**
 * La garde de rafraîchissement survit au rechargement de la page.
 *
 * Elle vivait en mémoire d'instance : recharger l'onglet réarmait le bouton
 * alors que le serveur, lui, refusait toujours le boost. L'utilisateur
 * appuyait, rien ne se passait, et il recommençait — exactement le
 * comportement que le plafond existe pour éviter, sur un serveur qui
 * sanctionne l'adresse IP.
 *
 * La clé porte l'appareil : deux enfants ont chacun leur garde. Le stockage
 * peut être refusé (navigation privée, réglages du navigateur) ; dans ce cas
 * on retombe silencieusement sur le comportement d'avant, dégradé mais jamais
 * bloquant.
 *
 * Ce que cela ne corrige PAS : la garde reste globale par appareil, alors que
 * le plafond serveur est par palier. Deux paliers différents partagent donc
 * une garde qu'ils ne devraient pas partager. Le remède complet est une
 * entité de diagnostic côté intégration, qui n'existe pas.
 */
const GUARD_PREFIX = 'pronote-ng-cards:refreshed-at:';

const readGuard = (deviceId: string | undefined): number => {
  if (!deviceId) return 0;
  try {
    return Number(globalThis.localStorage?.getItem(GUARD_PREFIX + deviceId)) || 0;
  } catch {
    return 0;
  }
};

const writeGuard = (deviceId: string | undefined, at: number): void => {
  if (!deviceId) return;
  try {
    globalThis.localStorage?.setItem(GUARD_PREFIX + deviceId, String(at));
  } catch {
    // Stockage indisponible : la garde reste celle de l'instance.
  }
};

export function makeCardClass(spec: CardSpec): CustomElementConstructor {
  class PronoteCardBase extends LitElement {
    static styles = sharedStyles;

    @property({ attribute: false }) hass?: HomeAssistant;
    @state() private config?: PronoteCardConfig;
    @state() private refreshedAt = 0;
    @state() private refreshFailed = false;
    // Bascule à chaque tour de la minuterie déclarative (spec.tickMs) : sa
    // seule fonction est de forcer un repeint pour les cartes qui dépendent
    // de Date.now() sans qu'aucune propriété réactive ne change (compte à
    // rebours, créneau en cours, bouton grisé du limiteur).
    @state() private tick = 0;
    private tickTimer?: ReturnType<typeof setInterval>;

    private resolved = new Map<EntityKey, string>();
    // Langue de Home Assistant, jamais un repli français codé en dur — sauf
    // en setConfig, où hass n'est pas encore posé (voir cette méthode).
    private t: Translate = (path, vars) => localize(path, vars, this.hass?.language);

    // Mémoïse le balayage du registre (Object.values(hass.entities).filter(...))
    // sur l'identité de hass.entities ET hass.devices, partagé avec
    // l'éditeur (voir editor.ts) : Home Assistant remplace tout l'objet hass
    // à chaque mise à jour d'état, mais ces deux sous-objets ne changent que
    // si le registre lui-même a changé. resolveEntities consulte les deux
    // (via resolveDevice) : oublier devices rendrait une résolution périmée
    // quand un appareil apparaît/disparaît.
    private resolveCache = createResolveCache();

    connectedCallback(): void {
      super.connectedCallback();
      if (spec.tickMs !== undefined) {
        this.tickTimer = setInterval(() => {
          this.tick++;
        }, spec.tickMs);
      }
    }

    disconnectedCallback(): void {
      super.disconnectedCallback();
      // Une fuite d'intervalle sur un tableau de bord ouvert en permanence
      // est un vrai défaut : la minuterie ne doit jamais survivre à la carte.
      if (this.tickTimer !== undefined) {
        clearInterval(this.tickTimer);
        this.tickTimer = undefined;
      }
    }

    setConfig(config: PronoteCardConfig): void {
      if (!config || typeof config !== 'object' || typeof config.type !== 'string') {
        throw new Error(this.t('common.bad_config'));
      }
      this.config = config;
    }

    getCardSize(): number {
      if (typeof spec.size === 'function') {
        // Home Assistant peut interroger la taille avant `setConfig` : dans ce
        // cas la carte n'a rien à mesurer, et le repli vaut mieux qu'un appel
        // sur une configuration absente.
        return this.config ? spec.size(this.config) : 3;
      }
      return spec.size ?? 3;
    }

    static getConfigElement(): HTMLElement {
      const el = document.createElement('pronote-ng-card-editor') as HTMLElement & {
        spec?: CardSpec;
      };
      el.spec = spec;
      return el;
    }

    static getStubConfig(): Partial<PronoteCardConfig> {
      return { type: `custom:${spec.type}`, ...spec.stub };
    }

    private entityKeys(config: PronoteCardConfig): {
      required: EntityKey[];
      any: EntityKey[];
      all: EntityKey[];
    } {
      const required = spec.requires(config);
      const any = spec.requiresAny?.(config) ?? [];
      return { required, any, all: [...required, ...any, ...spec.optional(config)] };
    }

    /**
     * Home Assistant remplace l'objet `hass` à chaque mise à jour d'état, et
     * le `hasChanged` par défaut de Lit est `!==` : sans ce garde-fou,
     * `render()` — et donc le balayage du registre — partirait à chaque
     * évènement d'état de la maison, y compris sans rapport avec cette carte.
     * On ne laisse passer que : la config a changé, un refresh vient d'avoir
     * lieu, le registre (entities/devices) a changé d'identité, ou l'état
     * d'une entité déjà résolue par cette carte a changé.
     *
     * Le registre compte au moins autant que les états : une carte qui
     * affiche « entité introuvable » attend précisément que l'entité
     * apparaisse au registre (le propriétaire active le palier concerné) ;
     * sans ce déclencheur, elle ne se repeindrait jamais. Même chose pour
     * `devices`, qui alimente la branche « appareil introuvable ».
     */
    protected shouldUpdate(changed: PropertyValues): boolean {
      if (!this.hasUpdated) return true;
      // Ces changements locaux doivent toujours repeindre, qu'ils
      // s'accompagnent ou non d'un changement de `hass` : la config, un
      // refresh qui vient d'aboutir ou d'échouer, et un tour de la
      // minuterie déclarative (spec.tickMs).
      if (
        changed.has('config') ||
        changed.has('refreshedAt') ||
        changed.has('refreshFailed') ||
        changed.has('tick')
      ) {
        return true;
      }
      if (!changed.has('hass')) return true;
      const oldHass = changed.get('hass');
      const hass = this.hass;
      if (
        !hass ||
        typeof oldHass !== 'object' ||
        oldHass === null ||
        !('states' in oldHass) ||
        !('entities' in oldHass) ||
        !('devices' in oldHass)
      ) {
        return true;
      }
      if (oldHass.entities !== hass.entities || oldHass.devices !== hass.devices) return true;
      const oldStates = oldHass.states;
      for (const id of this.resolved.values()) {
        if (oldStates[id] !== hass.states[id]) return true;
      }
      return false;
    }

    private resolveAll(
      hass: HomeAssistant,
      config: PronoteCardConfig,
      keys: EntityKey[]
    ): Map<EntityKey, string> {
      return this.resolveCache.resolve(hass, config.device_id, spec.scope, keys, config.entities);
    }

    protected render(): TemplateResult | typeof nothing {
      const hass = this.hass;
      const config = this.config;
      if (!hass || !config) return nothing;

      if (!config.device_id && !config.entities) {
        return this.frame(html`<div class="notice">${this.t('common.no_device')}</div>`);
      }
      if (config.device_id && !hass.devices[config.device_id]) {
        return this.frame(
          html`<div class="notice problem">${this.t('common.unknown_device')}</div>`
        );
      }

      const { required, any, all } = this.entityKeys(config);
      this.resolved = this.resolveAll(hass, config, all);

      // État 1 — entité absente du registre pour cet appareil.
      const missingRequired = required.filter((k) => !this.resolved.has(k));
      const anyUnsatisfied = any.length > 0 && !any.some((k) => this.resolved.has(k));
      if (missingRequired.length > 0 || anyUnsatisfied) {
        const keys = missingRequired.length > 0 ? missingRequired : any;
        return this.frame(missingState(keys, this.t));
      }

      // État 2 — entité présente, état non collecté. Transitoire, pas une erreur.
      const anchors = any.length > 0 ? any.filter((k) => this.resolved.has(k)) : required;
      const hasUsable = anchors.some((k) => {
        const e = this.entityFor(k);
        return e !== undefined && !ABSENT_STATES.has(e.state);
      });
      if (anchors.length > 0 && !hasUsable) {
        return this.frame(unavailableState(this.t));
      }

      // État 3 — la carte décide, le vide lui appartient.
      return this.frame(spec.render(this.makeCtx(hass, config)));
    }

    private frame(body: TemplateResult): TemplateResult {
      const title = this.config?.title;
      return html`
        <ha-card>
          ${title ? html`<div class="title">${title}</div>` : ''}
          <div class="body">${body}</div>
        </ha-card>
      `;
    }

    private entityFor(key: EntityKey): HassEntity | undefined {
      const id = this.resolved.get(key);
      return id ? this.hass?.states[id] : undefined;
    }

    private makeCtx(hass: HomeAssistant, config: PronoteCardConfig): RenderCtx {
      const deviceId = resolveDevice(hass, config.device_id, spec.scope);
      const device = deviceId ? hass.devices[deviceId] : undefined;

      // Seul point d'appel de service ouvert à la carte : `AllowedCall`
      // ferme la liste à la compilation. `hass.callService` lui-même reste
      // hors de `ctx.hass` (voir HassView dans types.ts) : ce découpage sur
      // le point est le seul endroit du socle qui reconstitue domaine et
      // service.
      const callService = async (
        call: AllowedCall,
        data?: Record<string, unknown>,
        target?: Record<string, unknown>
      ): Promise<void> => {
        const sep = call.indexOf('.');
        const domain = call.slice(0, sep);
        const service = call.slice(sep + 1);
        await hass.callService(domain, service, data, target);
      };

      return {
        hass,
        config,
        language: hass.language,
        timeZone: hass.locale.time_zone,
        deviceName: device?.name_by_user ?? device?.name ?? '',
        entityId: (k) => this.resolved.get(k),
        entity: (k) => this.entityFor(k),
        status: (k): EntityStatus => {
          if (!this.resolved.has(k)) return 'missing';
          const e = this.entityFor(k);
          if (!e || ABSENT_STATES.has(e.state)) return 'unavailable';
          return 'ok';
        },
        // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- `T` est une commodité d'écriture pour lire un attribut d'entité Home Assistant, qui n'est typé nulle part (voir RenderCtx.attr dans types.ts) : ce n'est pas une garantie de type, l'appelant reste responsable de ce qu'il annonce.
        attr: <T>(k: EntityKey, name: string) =>
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- même justification : lecture d'un attribut d'entité, jamais typé côté registre.
          this.entityFor(k)?.attributes[name] as T | undefined,
        // Site correct : hass est déjà connu ici, sa langue toujours définie.
        t: (path, vars) => localize(path, vars, hass.language),
        callService,
        refresh: async (tier?: string) => {
          // Posé AVANT l'appel : un double-clic pendant l'attente doit
          // retomber sous le refroidissement, pas en envoyer un second — la
          // seule carte qui touche au budget de requêtes en dépend.
          this.refreshedAt = Date.now();
          writeGuard(config.device_id, this.refreshedAt);
          this.refreshFailed = false;
          try {
            await callService(
              'pronote_ng.refresh',
              tier ? { tier } : {},
              config.device_id ? { device_id: config.device_id } : undefined
            );
          } catch {
            // Le rejet doit remonter à l'utilisateur, pas disparaître : la
            // carte reste seule juge de la façon de le montrer.
            this.refreshFailed = true;
          }
        },
        // La garde retenue est la plus récente des deux : celle de l'instance
        // et celle relue du stockage. Un rechargement de page ne réarme donc
        // plus le bouton avant l'heure.
        refreshCoolingDown:
          Date.now() - Math.max(this.refreshedAt, readGuard(config.device_id)) <
          REFRESH_COOLDOWN_MS,
        refreshFailed: this.refreshFailed,
      };
    }
  }

  return PronoteCardBase;
}
