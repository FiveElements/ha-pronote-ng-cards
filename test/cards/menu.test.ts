import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/menu';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-menu': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const menu = (state: string, attributes: Record<string, unknown> = {}) =>
  makeHass([
    {
      key: 'sensor:menu_today',
      entity_id: 'sensor.abc_menu_du_jour',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte menu', () => {
  it('rend les plats groupés par section', async () => {
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('4', {
        first_meal: ['Carottes râpées'],
        main_meal: ['Poulet rôti'],
        dessert: ['Yaourt'],
        is_lunch: true,
      })
    );
    const t = text(el);
    expect(t).toContain('Entrée');
    expect(t).toContain('Carottes râpées');
    expect(t).toContain('Plat');
    expect(t).toContain('Poulet rôti');
    expect(t).toContain('Dessert');
  });

  it('accepte une chaîne simple comme un tableau d’objets', async () => {
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('2', { main_meal: 'Gratin', dessert: [{ name: 'Compote' }] })
    );
    const t = text(el);
    expect(t).toContain('Gratin');
    expect(t).toContain('Compote');
  });

  it('dit « pas de menu publié » sur une liste vide, pas « indisponible »', async () => {
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, menu('0', {}));
    const t = text(el);
    expect(t).toContain('Pas de menu publié');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, menu('unavailable'));
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:menu_today');
  });

  it('bascule sur demain quand day vaut tomorrow', async () => {
    const hass = makeHass([
      {
        key: 'sensor:menu_tomorrow',
        entity_id: 'sensor.abc_menu_demain',
        device: 'dev_enfant',
        state: '1',
        attributes: { main_meal: 'Poisson' },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant', day: 'tomorrow' },
      hass
    );
    expect(text(el)).toContain('Poisson');
  });
});
