import { beforeAll, describe, expect, it, vi } from 'vitest';
import { html } from 'lit';
import { defineCard } from '../src/core/registry';
import { resolveTimeZone } from '../src/core/base-card';
import type { CardSpec, RenderCtx } from '../src/core/types';
import { makeHass } from './fixtures/hass';
import { mountCard, text } from './fixtures/mount';


const SPEC: CardSpec = {
  type: 'pronote-ng-test',
  name: 'Test',
  description: 'Carte de test',
  key: 'test',
  scope: 'child',
  requires: () => ['sensor:next_lesson'],
  optional: () => [],
  schema: () => [],
  render: (ctx) => html`<p class="ok">${ctx.entity('sensor:next_lesson')?.state}</p>`,
};

// Deuxième carte, dédiée à la branche requiresAny : aucune des deux cartes
// de test ne peut couvrir les deux logiques (toutes obligatoires / au moins
// une) avec le même schéma de clés.
const SPEC_ANY: CardSpec = {
  type: 'pronote-ng-test-any',
  name: 'Test requiresAny',
  description: 'Carte de test — requiresAny',
  key: 'test',
  scope: 'child',
  requires: () => [],
  requiresAny: () => ['sensor:a', 'sensor:b'],
  optional: () => [],
  schema: () => [],
  render: (ctx) =>
    html`<p class="ok">${ctx.entity('sensor:a')?.state ?? ctx.entity('sensor:b')?.state}</p>`,
};

const btnOf = (el: Element) => el.shadowRoot?.querySelector('button.refresh-btn');

const mountRefreshCard = (hass: ReturnType<typeof makeHass>) =>
  mountCard(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SPEC_REFRESH (plus bas) est enregistrée dynamiquement ; ce fichier de test n'augmente pas HTMLElementTagNameMap pour cette balise supplémentaire.
    'pronote-ng-test-refresh' as 'pronote-ng-test',
    { device_id: 'dev_enfant' },
    hass
  );

const probeRefresh = (hass: ReturnType<typeof makeHass>): void => {
  hass.states['sensor.abc_refresh_probe'] = {
    entity_id: 'sensor.abc_refresh_probe',
    state: 'ready',
    attributes: {},
    last_changed: '2026-09-08T07:00:00+00:00',
    last_updated: '2026-09-08T07:00:00+00:00',
  };
  hass.entities['sensor.abc_refresh_probe'] = {
    entity_id: 'sensor.abc_refresh_probe',
    device_id: 'dev_enfant',
    labels: [],
    platform: 'pronote_ng',
    translation_key: 'refresh_probe',
    has_entity_name: true,
  };
};

const withNextLessonEntity = () =>
  makeHass([
    {
      key: 'sensor:next_lesson',
      entity_id: 'sensor.abc_prochain_cours',
      device: 'dev_enfant',
      state: '2026-09-08T08:30:00+02:00',
    },
  ]);

interface TestCardElement extends HTMLElement {
  setConfig(config: unknown): void;
  hass: unknown;
  readonly updateComplete: Promise<unknown>;
}

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-test': TestCardElement;
    'pronote-ng-test-any': TestCardElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
  defineCard(SPEC_ANY);
});

describe('PronoteCardBase — les trois états', () => {
  it('rend la carte quand la donnée est là', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
      },
    ]);
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, hass);
    expect(el.shadowRoot?.querySelector('.ok')).not.toBeNull();
  });

  it('dit « entité absente » et nomme la clé attendue', async () => {
    const hass = makeHass([]);
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('sensor:next_lesson');
    expect(el.shadowRoot?.querySelector('.ok')).toBeNull();
  });

  it('se repeint quand l’entité apparaît au registre après coup — pas seulement quand son état change', async () => {
    // Reproduit exactement la boucle frustrante que shouldUpdate doit éviter :
    // le propriétaire active le palier correspondant, l'entité apparaît au
    // registre. hass.entities change d'identité ; hass.states aussi, pour une
    // entité qui n'était même pas dans l'ancien this.resolved (elle en était
    // absente). Si shouldUpdate ignore le registre, ce test échoue.
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:next_lesson');
    expect(el.shadowRoot?.querySelector('.ok')).toBeNull();

    el.hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
      },
    ]);
    await el.updateComplete;

    expect(el.shadowRoot?.querySelector('.ok')).not.toBeNull();
    expect(text(el)).not.toContain('sensor:next_lesson');
  });

  it('dit « indisponible » quand l’entité existe mais n’a pas d’état', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
  });

  it('distingue « au registre mais non chargée » de « absente »', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        unloaded: true,
      },
    ]);
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
    expect(text(el)).not.toContain('introuvable');
  });

  it('demande de choisir un enfant sans device_id', async () => {
    const el = await mountCard('pronote-ng-test', {}, makeHass([]));
    expect(text(el)).toContain('Choisissez un enfant');
  });

  it("affiche « cet appareil n'existe plus » quand device_id est inconnu du registre", async () => {
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_disparu' }, makeHass([]));
    expect(text(el)).toContain("n'existe plus");
  });

  it('résout via la surcharge config.entities même sans registre', async () => {
    const hass = makeHass([]);
    hass.states['sensor.override'] = {
      entity_id: 'sensor.override',
      state: 'valeur-directe',
      attributes: {},
      last_changed: '2026-09-08T07:00:00+00:00',
      last_updated: '2026-09-08T07:00:00+00:00',
    };
    const el = await mountCard(
      'pronote-ng-test',
      { device_id: 'dev_enfant', entities: { 'sensor:next_lesson': 'sensor.override' } },
      hass
    );
    expect(el.shadowRoot?.querySelector('.ok')?.textContent).toBe('valeur-directe');
  });

  it('valide la présence du champ type', () => {
    const el = document.createElement('pronote-ng-test');
    expect(() => el.setConfig({})).toThrow();
  });

  it('rend dans la langue de Home Assistant, pas en français par défaut', async () => {
    // Monte une carte dont l'entité requise est absente, en italien : le message
    // « donnée pas encore collectée / introuvable » doit venir du catalogue italien.
    const el = await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, makeHass([], 'it'));
    const out = text(el);
    expect(out).toContain('Entità non trovata su questo dispositivo:');
    expect(out).not.toContain('Entité introuvable');
  });

  describe('requiresAny', () => {
    it('aucune des clés ne résout → « entité absente »', async () => {
      const el = await mountCard('pronote-ng-test-any', { device_id: 'dev_enfant' }, makeHass([]));
      expect(text(el)).toContain('sensor:a');
      expect(text(el)).toContain('sensor:b');
      expect(el.shadowRoot?.querySelector('.ok')).toBeNull();
    });

    it('une clé résout mais sans état exploitable → « indisponible »', async () => {
      const hass = makeHass([
        { key: 'sensor:a', entity_id: 'sensor.abc_a', device: 'dev_enfant', state: 'unavailable' },
      ]);
      const el = await mountCard('pronote-ng-test-any', { device_id: 'dev_enfant' }, hass);
      expect(text(el)).toContain('pas encore collectée');
    });
  });

  it('getConfigElement crée un éditeur porteur de la spec de la carte', () => {
    const ctor = customElements.get('pronote-ng-test');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `getConfigElement` est un statique propre aux cartes Pronote NG, absent de l'interface DOM générique CustomElementConstructor.
    const el = (ctor as unknown as { getConfigElement(): HTMLElement }).getConfigElement();
    expect(el.tagName.toLowerCase()).toBe('pronote-ng-card-editor');
  });
});

describe('RenderCtx — la promesse de sécurité de docs/limites.md est vraie côté type', () => {
  it('ctx.hass n’expose pas callService : vérifié à la compilation, pas seulement documenté', () => {
    // Une carte qui écrirait `ctx.hass.callService(...)` ne compile plus :
    // c'est exactement l'écart entre docs/limites.md et le type d'avant
    // cette correction. `npm run typecheck` échoue si la ligne suivante ne
    // déclenche plus d'erreur (directive @ts-expect-error inutilisée).
    const spec: CardSpec = {
      type: 'pronote-ng-test-hassview',
      name: 'Test',
      description: 'Carte de test',
      key: 'test',
      scope: 'child',
      requires: () => [],
      optional: () => [],
      schema: () => [],
      render: (ctx) => {
        // @ts-expect-error callService est absent de HassView (types.ts) : ctx.hass n'est plus un moyen d'appeler un service.
        void ctx.hass.callService;
        return html``;
      },
    };
    expect(spec.type).toBe('pronote-ng-test-hassview');
  });

  it('ctx.callService refuse à la compilation un appel hors de la liste close AllowedCall', () => {
    const spec: CardSpec = {
      type: 'pronote-ng-test-allowedcall',
      name: 'Test',
      description: 'Carte de test',
      key: 'test',
      scope: 'child',
      requires: () => [],
      optional: () => [],
      schema: () => [],
      render: (ctx) => {
        // @ts-expect-error 'light.turn_on' n'appartient pas à AllowedCall (types.ts) : seuls pronote_ng.refresh et todo.update_item le sont.
        void ctx.callService('light.turn_on');
        return html``;
      },
    };
    expect(spec.type).toBe('pronote-ng-test-allowedcall');
  });

  it('expose ctx.language et ctx.timeZone comme commodités dérivées de hass', async () => {
    let captured: RenderCtx | undefined;
    const spec: CardSpec = {
      type: 'pronote-ng-test-lang',
      name: 'Test',
      description: 'Carte de test',
      key: 'test',
      scope: 'child',
      requires: () => [],
      optional: () => [],
      schema: () => [],
      render: (ctx) => {
        captured = ctx;
        return html``;
      },
    };
    defineCard(spec);
    const hass = makeHass([], 'it');
    await mountCard(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ce spec est enregistré ci-dessus ; ce fichier de test n'augmente pas HTMLElementTagNameMap pour cette balise supplémentaire.
      'pronote-ng-test-lang' as 'pronote-ng-test',
      { device_id: 'dev_enfant' },
      hass
    );
    expect(captured?.language).toBe('it');
    expect(captured?.timeZone).toBe('Europe/Paris');
  });
});

describe('ctx.refresh — chemin d’échec et horodatage', () => {
  const SPEC_REFRESH: CardSpec = {
    type: 'pronote-ng-test-refresh',
    name: 'Test',
    description: 'Carte de test — refresh',
    key: 'test',
    scope: 'child',
    requires: () => ['sensor:refresh_probe'],
    optional: () => [],
    schema: () => [],
    render: (ctx) => html`
      <button
        class="refresh-btn"
        ?disabled=${ctx.refreshCoolingDown}
        @click=${() => {
          void ctx.refresh();
        }}
      ></button>
      <p class="failed">${ctx.refreshFailed ? 'échoué' : 'ok'}</p>
    `,
  };

  beforeAll(() => {
    defineCard(SPEC_REFRESH);
  });

  it('pose refreshedAt avant l’appel : le bouton se grise dès le clic, avant même la résolution du service', async () => {
    const hass = makeHass([]);
    probeRefresh(hass);
    let resolveCall: (() => void) | undefined;
    hass.callService = () =>
      new Promise((resolve) => {
        resolveCall = () => resolve(undefined);
      });
    const el = await mountRefreshCard(hass);
    const btn = () => el.shadowRoot?.querySelector('button.refresh-btn');
    expect(btn()?.hasAttribute('disabled')).toBe(false);

    btn()?.dispatchEvent(new MouseEvent('click'));
    // this.refreshedAt est posé de façon synchrone, avant le premier await
    // de refresh() : le nouveau rendu doit déjà griser le bouton.
    await el.updateComplete;
    expect(btn()?.hasAttribute('disabled')).toBe(true);

    resolveCall?.();
  });

  it('entoure l’appel d’un try/catch et expose l’échec sur refreshFailed, sans laisser le rejet filer sans traitement', async () => {
    const hass = makeHass([]);
    probeRefresh(hass);
    hass.callService = () => Promise.reject(new Error('service indisponible'));
    const el = await mountRefreshCard(hass);
    expect(text(el)).toContain('ok');

    el.shadowRoot?.querySelector('button.refresh-btn')?.dispatchEvent(new MouseEvent('click'));
    await el.updateComplete;
    // Laisse le rejet se propager jusqu'au catch avant de vérifier le rendu.
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    expect(text(el)).toContain('échoué');
  });

  it('garde le bouton grisé après un remontage : un rechargement de page ne réarme pas avant l’heure', async () => {
    // La garde vivait en mémoire d'instance : recharger l'onglet réarmait le
    // bouton alors que le serveur refusait toujours le boost. L'utilisateur
    // appuyait, rien ne se passait, il recommençait — sur un serveur qui
    // sanctionne l'adresse IP.
    const hass = makeHass([]);
    probeRefresh(hass);
    hass.callService = () => Promise.resolve(undefined);

    const first = await mountRefreshCard(hass);
    btnOf(first)?.dispatchEvent(new MouseEvent('click'));
    await first.updateComplete;
    expect(btnOf(first)?.hasAttribute('disabled')).toBe(true);

    // Nouveau montage : l'instance précédente et son refreshedAt sont perdus,
    // exactement comme après un rechargement de page.
    const second = await mountRefreshCard(hass);
    expect(btnOf(second)?.hasAttribute('disabled')).toBe(true);
  });
});

describe('spec.tickMs — minuterie déclarative pour les rendus qui dépendent de Date.now()', () => {
  const SPEC_TICK: CardSpec = {
    type: 'pronote-ng-test-tick',
    name: 'Test',
    description: 'Carte de test — tick',
    key: 'test',
    scope: 'child',
    tickMs: 1000,
    requires: () => ['sensor:next_lesson'],
    optional: () => [],
    schema: () => [],
    render: () => html`<p class="ok">${Date.now()}</p>`,
  };

  beforeAll(() => {
    defineCard(SPEC_TICK);
  });

  it('ne pose aucun intervalle quand spec.tickMs est absent', async () => {
    const setSpy = vi.spyOn(globalThis, 'setInterval');
    await mountCard('pronote-ng-test', { device_id: 'dev_enfant' }, withNextLessonEntity());
    expect(setSpy).not.toHaveBeenCalled();
    setSpy.mockRestore();
  });

  it('pose un intervalle à connectedCallback quand spec.tickMs est défini, et le retire à disconnectedCallback', async () => {
    const setSpy = vi.spyOn(globalThis, 'setInterval');
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const el = await mountCard(
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SPEC_TICK est enregistrée ci-dessus ; ce fichier de test n'augmente pas HTMLElementTagNameMap pour cette balise supplémentaire.
      'pronote-ng-test-tick' as 'pronote-ng-test',
      { device_id: 'dev_enfant' },
      withNextLessonEntity()
    );
    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0]?.[1]).toBe(1000);
    const timerId = setSpy.mock.results[0]?.value;

    // Une fuite d'intervalle sur un tableau de bord ouvert en permanence est
    // un vrai défaut : il doit disparaître exactement au détachement.
    el.remove();
    expect(clearSpy).toHaveBeenCalledWith(timerId);

    setSpy.mockRestore();
    clearSpy.mockRestore();
  });

  it('repeint périodiquement sans qu’aucune propriété réactive ne change', async () => {
    vi.useFakeTimers();
    try {
      const el = await mountCard(
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SPEC_TICK est enregistrée ci-dessus ; ce fichier de test n'augmente pas HTMLElementTagNameMap pour cette balise supplémentaire.
        'pronote-ng-test-tick' as 'pronote-ng-test',
        { device_id: 'dev_enfant' },
        withNextLessonEntity()
      );
      const before = el.shadowRoot?.querySelector('.ok')?.textContent;
      vi.advanceTimersByTime(1000);
      await el.updateComplete;
      const after = el.shadowRoot?.querySelector('.ok')?.textContent;
      expect(after).not.toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});


describe('resolveTimeZone', () => {
  // `hass.locale.time_zone` est une PRÉFÉRENCE, pas un identifiant IANA. La
  // passer telle quelle à `Intl.DateTimeFormat` lève une `RangeError`, et une
  // exception dans `render()` laisse la carte entièrement vide : c'est
  // exactement la panne observée sur une instance réelle, où la valeur vaut
  // « local » par défaut.
  const browser = new Intl.DateTimeFormat().resolvedOptions().timeZone;

  it('rend le fuseau du navigateur sur la préférence « local »', () => {
    const tz = resolveTimeZone({ locale: { time_zone: 'local' }, config: { time_zone: 'Asia/Tokyo' } });
    expect(tz).toBe(browser);
    expect(() => new Intl.DateTimeFormat('fr', { timeZone: tz })).not.toThrow();
  });

  it('rend le fuseau de l’instance sur la préférence « server »', () => {
    expect(
      resolveTimeZone({ locale: { time_zone: 'server' }, config: { time_zone: 'Asia/Tokyo' } })
    ).toBe('Asia/Tokyo');
  });

  it('retombe sur le navigateur quand « server » ne publie aucun fuseau', () => {
    expect(resolveTimeZone({ locale: { time_zone: 'server' } })).toBe(browser);
  });

  it('n’émet jamais un fuseau que `Intl` refuse', () => {
    for (const locale of [{ time_zone: 'Pas/Un/Fuseau' }, { time_zone: '' }, undefined]) {
      const tz = resolveTimeZone({ locale });
      expect(() => new Intl.DateTimeFormat('fr', { timeZone: tz })).not.toThrow();
    }
  });

  it('accepte un identifiant IANA écrit directement dans la préférence', () => {
    expect(resolveTimeZone({ locale: { time_zone: 'Europe/Paris' } })).toBe('Europe/Paris');
  });
});

describe('rendu qui lève', () => {
  const SPEC_THROWS: CardSpec = {
    type: 'pronote-ng-test-throws',
    name: 'Test exception',
    description: 'Carte de test — render qui lève',
    key: 'test',
    scope: 'child',
    requires: () => ['sensor:next_lesson'],
    optional: () => [],
    schema: () => [],
    render: () => {
      throw new Error('boum');
    },
  };

  it('affiche un message plutôt que de disparaître de la page', async () => {
    defineCard(SPEC_THROWS);
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const el = await mountCard(
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SPEC_THROWS est enregistrée juste au-dessus ; ce fichier de test n'augmente pas HTMLElementTagNameMap pour cette balise supplémentaire.
        'pronote-ng-test-throws' as 'pronote-ng-test',
        { device_id: 'dev_enfant' },
        withNextLessonEntity()
      );
      // Sans le filet, Lit laisse la racine d'ombre VIDE : l'assertion
      // positive est celle qui compte.
      expect(text(el)).toContain("Cette carte n'a pas pu s'afficher.");
      expect(erreurs).toHaveBeenCalled();
    } finally {
      erreurs.mockRestore();
    }
  });
});

describe('defineCard', () => {
  it('enregistre la carte dans window.customCards', () => {
    const cards = window.customCards ?? [];
    expect(cards.some((c) => c.type === 'pronote-ng-test')).toBe(true);
  });
  it('enregistre aussi l’éditeur', () => {
    expect(customElements.get('pronote-ng-card-editor')).toBeDefined();
  });
});
