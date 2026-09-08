import { beforeAll, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { defineCard } from '../src/core/registry';
import type { CardSpec } from '../src/core/types';
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

describe('defineCard', () => {
  it('enregistre la carte dans window.customCards', () => {
    const cards = window.customCards ?? [];
    expect(cards.some((c) => c.type === 'pronote-ng-test')).toBe(true);
  });
  it('enregistre aussi l’éditeur', () => {
    expect(customElements.get('pronote-ng-card-editor')).toBeDefined();
  });
});
