import { beforeAll, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { PronoteCardEditor } from '../src/core/editor';
import { localize } from '../src/localize';
import type { CardSpec } from '../src/core/types';
import { makeHass } from './fixtures/hass';

const SPEC: CardSpec = {
  type: 'pronote-ng-test-editor',
  name: 'Test',
  description: 'Carte de test',
  key: 'notes',
  scope: 'child',
  requires: () => ['sensor:next_lesson'],
  optional: () => ['sensor:menu_today'],
  schema: () => [],
  render: () => html``,
};

beforeAll(() => {
  if (!customElements.get('pronote-ng-card-editor-test')) {
    customElements.define('pronote-ng-card-editor-test', class extends PronoteCardEditor {});
  }
});

const mount = async (config: Record<string, unknown>, hass: unknown) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- document.createElement ne connaît que HTMLElement ; les propriétés propres à l'élément personnalisé (setConfig, hass, spec) ne peuvent être annoncées que par une assertion.
  const el = document.createElement('pronote-ng-card-editor-test') as HTMLElement & {
    setConfig: (c: unknown) => void;
    hass: unknown;
    spec: CardSpec;
  };
  el.spec = SPEC;
  el.setConfig({ type: 'custom:pronote-ng-test-editor', ...config });
  el.hass = hass;
  document.body.appendChild(el);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `updateComplete` appartient à LitElement, invisible du type HTMLElement ci-dessus.
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
};

const text = (el: HTMLElement) => el.shadowRoot?.textContent ?? '';

describe('PronoteCardEditor — diagnostic de résolution', () => {
  it('signale les clés trouvées et les clés introuvables', async () => {
    const hass = makeHass([
      { key: 'sensor:next_lesson', entity_id: 'sensor.abc_pc', device: 'dev_enfant' },
    ]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('sensor:next_lesson');
    expect(text(el)).toContain('sensor:menu_today');
    expect(text(el)).toContain('introuvable');
  });

  it("avertit quand l'utilisateur choisit l'appareil de compte", async () => {
    const el = await mount({ device_id: 'dev_compte' }, makeHass([]));
    expect(text(el)).toContain('est un compte, pas un enfant');
  });

  it("n'affiche pas de diagnostic sans appareil choisi", async () => {
    const el = await mount({}, makeHass([]));
    expect(text(el)).not.toContain('introuvable');
  });

  it('émet config-changed quand ha-form remonte une valeur', async () => {
    const el = await mount({ device_id: 'dev_enfant' }, makeHass([]));
    let received: unknown;
    el.addEventListener('config-changed', (e) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- addEventListener ne type l'évènement qu'en Event ; `config-changed` est un CustomEvent, comme tout évènement personnalisé du DOM.
      received = (e as CustomEvent).detail.config;
    });
    el.shadowRoot?.querySelector('ha-form')?.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: { device_id: 'dev_enfant', title: 'École' } },
      })
    );
    expect(received).toMatchObject({ title: 'École' });
  });

  it('remplace la config plutôt que la fusionner — un champ vidé doit rester vide', async () => {
    const el = await mount({ device_id: 'dev_enfant', title: 'École' }, makeHass([]));
    let received: unknown;
    el.addEventListener('config-changed', (e) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- addEventListener ne type l'évènement qu'en Event ; `config-changed` est un CustomEvent, comme tout évènement personnalisé du DOM.
      received = (e as CustomEvent).detail.config;
    });
    // ha-form remonte l'objet complet, sans la clé « title » : l'utilisateur l'a vidée.
    el.shadowRoot?.querySelector('ha-form')?.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: { device_id: 'dev_enfant' } },
      })
    );
    expect(received).not.toHaveProperty('title');
  });

  it('résout le libellé d’un champ propre à la carte via sa racine de catalogue, et retombe sur editor. pour un champ de base', async () => {
    const el = await mount({ device_id: 'dev_enfant' }, makeHass([]));
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- accès délibéré à un membre privé pour prouver le repli de libellé ; `computeLabel` n'est pas exposé autrement.
    const withLabel = el as unknown as { computeLabel: (s: { name: string }) => string };
    expect(withLabel.computeLabel({ name: 'sections' })).toBe(localize('notes.sections'));
    expect(withLabel.computeLabel({ name: 'title' })).toBe(localize('editor.title'));
  });
});
