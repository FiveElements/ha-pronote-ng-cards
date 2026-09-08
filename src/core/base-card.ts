import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from './ha-types';
import { resolveDevice, resolveEntities } from './resolve';
import type {
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

export function makeCardClass(spec: CardSpec): CustomElementConstructor {
  class PronoteCardBase extends LitElement {
    static styles = sharedStyles;

    @property({ attribute: false }) hass?: HomeAssistant;
    @state() private config?: PronoteCardConfig;
    @state() private refreshedAt = 0;

    private resolved = new Map<EntityKey, string>();
    // Langue de Home Assistant, jamais un repli français codé en dur — sauf
    // en setConfig, où hass n'est pas encore posé (voir cette méthode).
    private t: Translate = (path, vars) => localize(path, vars, this.hass?.language);

    setConfig(config: PronoteCardConfig): void {
      if (!config || typeof config !== 'object') {
        throw new Error(this.t('common.bad_config'));
      }
      this.config = config;
    }

    getCardSize(): number {
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
      this.resolved = resolveEntities(hass, config.device_id, spec.scope, all, config.entities);

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
      return {
        hass,
        config,
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
        refresh: async (tier?: string) => {
          // Ne place aucun appel PRONOTE : relève une priorité auprès de
          // l'ordonnanceur, qui reste soumis au limiteur.
          await hass.callService(
            'pronote_ng',
            'refresh',
            tier ? { tier } : {},
            config.device_id ? { device_id: config.device_id } : undefined
          );
          this.refreshedAt = Date.now();
        },
        refreshCoolingDown: Date.now() - this.refreshedAt < REFRESH_COOLDOWN_MS,
      };
    }
  }

  return PronoteCardBase;
}
