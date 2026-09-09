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

  it('ignore un objet dont le nom n’est pas une chaîne, plutôt que d’afficher « null »', async () => {
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('1', { dessert: [{ name: null }, { name: 'Fruit' }] })
    );
    const t = text(el);
    expect(t).toContain('Fruit');
    expect(t).not.toContain('null');
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

  // L'intégration laisse l'état à `unknown` même quand la collecte a réussi :
  // « zéro plat » affirmerait qu'un menu existe. C'est donc `published` qui
  // porte la distinction, et cette carte est la seule à pouvoir la faire —
  // d'où `attributeDriven`. Avant, un parent lisait « pas encore collectée »
  // pour une donnée qui n'existe pas.
  it('dit « pas de menu publié » sur un état inconnu mais `published: false`', async () => {
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('unknown', {
        published: false,
        first_meal: [],
        main_meal: [],
        side_meal: [],
        other_meal: [],
        cheese: [],
        dessert: [],
        is_lunch: null,
      })
    );
    const t = text(el);
    expect(t).toContain('Pas de menu publié');
    expect(t).not.toContain('pas encore collectée');
  });

  it('rend les plats sur un état inconnu quand la collecte a réussi', async () => {
    // L'état reste `unknown` par construction : sans `attributeDriven`, le
    // socle écartait la carte et le menu n'était jamais affiché.
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('unknown', { published: true, main_meal: ['Poulet rôti'] })
    );
    expect(text(el)).toContain('Poulet rôti');
  });

  it('dit « pas encore collectée » sur un état inconnu sans aucun attribut', async () => {
    // Rien n'est encore arrivé : ni `published`, ni les sept clés. C'est le
    // seul cas où cette carte reprend le message du socle à son compte.
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, menu('unknown'));
    const t = text(el);
    expect(t).toContain('pas encore collectée');
    expect(t).not.toContain('Pas de menu publié');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:menu_today');
  });

  it('bascule sur demain quand day vaut tomorrow', async () => {
    const hass = makeHass([
      {
        key: 'sensor:menu_tomorrow',
        entity_id: 'sensor.abc_menu_de_demain',
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
    const t = text(el);
    expect(t).toContain('Poisson');
    expect(t).toContain('Demain');
  });

  it("affiche un intitulé « Aujourd'hui » en tête quand day vaut today (ou est absent)", async () => {
    const el = await mountCard(
      'pronote-ng-menu',
      { device_id: 'dev_enfant' },
      menu('1', { main_meal: 'Gratin' })
    );
    expect(text(el)).toContain("Aujourd'hui");
  });

  it('affiche l’intitulé du jour même quand le menu est vide', async () => {
    const el = await mountCard('pronote-ng-menu', { device_id: 'dev_enfant' }, menu('0', {}));
    expect(text(el)).toContain("Aujourd'hui");
  });

  it('demande au catalogue les libellés des options today/tomorrow du sélecteur day', () => {
    const paths: string[] = [];
    const monT = (path: string): string => {
      paths.push(path);
      return `[${path}]`;
    };
    const fields = SPEC.schema({ type: 'x' }, monT);
    const day = fields.find((f) => f.name === 'day');
    expect(paths).toContain('menu.today');
    expect(paths).toContain('menu.tomorrow');
    if (!day) throw new Error('champ day introuvable dans le schéma');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- `HaFormSchema.selector` est typé `Record<string, unknown>` (forme libre commune à tous les sélecteurs HA) ; ce test connaît la forme précise posée juste au-dessus, dans ce même fichier.
    const selector = day.selector as {
      select: { options: { value: string; label: string }[] };
    };
    expect(selector.select.options).toEqual([
      { value: 'today', label: '[menu.today]' },
      { value: 'tomorrow', label: '[menu.tomorrow]' },
    ]);
  });
});
