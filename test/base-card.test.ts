import { beforeAll, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { defineCard } from '../src/core/registry';
import type { CardSpec } from '../src/core/types';
import { makeHass } from './fixtures/hass';

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

const mount = async (config: Record<string, unknown>, hass: unknown) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- document.createElement ne connaît que HTMLElement ; les propriétés propres à l'élément personnalisé (setConfig, hass) ne peuvent être annoncées que par une assertion.
  const el = document.createElement('pronote-ng-test') as HTMLElement & {
    setConfig: (c: unknown) => void;
    hass: unknown;
  };
  el.setConfig({ type: 'custom:pronote-ng-test', ...config });
  el.hass = hass;
  document.body.appendChild(el);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `updateComplete` appartient à LitElement, invisible du type HTMLElement ci-dessus.
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
};

const text = (el: HTMLElement) => el.shadowRoot?.textContent ?? '';

beforeAll(() => defineCard(SPEC));

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
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(el.shadowRoot?.querySelector('.ok')).not.toBeNull();
  });

  it('dit « entité absente » et nomme la clé attendue', async () => {
    const hass = makeHass([]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
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
    const el = await mount({ device_id: 'dev_enfant' }, hass);
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
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
    expect(text(el)).not.toContain('introuvable');
  });

  it('demande de choisir un enfant sans device_id', async () => {
    const el = await mount({}, makeHass([]));
    expect(text(el)).toContain('Choisissez un enfant');
  });

  it('rejette une config sans type', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- document.createElement ne connaît que HTMLElement ; `setConfig` n'y existe que sur l'élément personnalisé.
    const el = document.createElement('pronote-ng-test') as HTMLElement & {
      setConfig: (c: unknown) => void;
    };
    expect(() => el.setConfig(null)).toThrow();
  });

  it('rend dans la langue de Home Assistant, pas en français par défaut', async () => {
    // Monte une carte dont l'entité requise est absente, en italien : le message
    // « donnée pas encore collectée / introuvable » doit venir du catalogue italien.
    const el = await mount({ device_id: 'dev_enfant' }, makeHass([], 'it'));
    const out = text(el);
    expect(out).toContain('Entità non trovata su questo dispositivo:');
    expect(out).not.toContain('Entité introuvable');
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
