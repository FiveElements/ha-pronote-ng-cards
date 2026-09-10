import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/devoirs';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';
import type { MountableElement } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-devoirs': HTMLElement & MountableElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const items = [
  { id: 'h1', subject: 'Maths', description: 'Exercices 4 à 7', due: '2026-09-09', done: false },
  {
    id: 'h2',
    subject: 'Anglais',
    description: 'Lire le chapitre 3',
    due: '2026-09-10',
    done: false,
  },
];

const hw = (
  attributes: Record<string, unknown>,
  state = '2',
  extra: Parameters<typeof makeHass>[0] = []
) =>
  makeHass([
    {
      key: 'sensor:homework_todo',
      entity_id: 'sensor.abc_devoirs_a_faire',
      device: 'dev_enfant',
      state,
      attributes,
    },
    ...extra,
  ]);

const withTodoList = (attributes: Record<string, unknown>, features: number) =>
  hw(attributes, '2', [
    {
      key: 'todo:homework',
      entity_id: 'todo.abc_devoirs',
      device: 'dev_enfant',
      state: '2',
      attributes: { supported_features: features },
    },
  ]);

/** Le texte des pastilles de probleme, dans l'ordre du DOM. */
const pastilles = (el: HTMLElement & MountableElement): string[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.chip.problem') ?? []).map(
    (n) => n.textContent?.trim() ?? ''
  );

/** Les fins de ligne, celles qui portent le retard et l'echeance. */
const fins = (el: HTMLElement & MountableElement): string[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.row .trailing') ?? []).map(
    (n) => n.textContent?.trim() ?? ''
  );

/** Les intertitres de groupe. */
const titres = (el: HTMLElement & MountableElement): string[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.title') ?? []).map(
    (n) => n.textContent?.trim() ?? ''
  );

/**
 * La hauteur annoncee, prise sur le `CardSpec` plutot que sur l'element.
 *
 * Le parametre est type explicitement plutot que force depuis un objet de
 * cles libres : `PronoteCardConfig` porte une signature d'index, donc une
 * assertion aurait retreci un type large vers `Config` sans que rien ne
 * verifie les valeurs. Ici `filter` est contraint a ses trois valeurs.
 */
const taille = (options: {
  filter?: 'todo' | 'tomorrow' | 'all';
  limit?: number;
  max_lines?: number;
}): number => {
  const { size } = SPEC;
  if (typeof size !== 'function') throw new Error('size doit etre une fonction');
  return size({ type: 'custom:pronote-ng-devoirs', device_id: 'dev_enfant', ...options });
};

/** Un seul devoir, dont on choisit l'enonce. Echeance lointaine : pas de retard. */
const unDevoir = (description_text: string) => [
  { id: 'h1', subject: 'Maths', description_text, due: '2099-01-01', done: false },
];

/** Le bloc repliable de l'enonce, s'il a ete emis. */
const details = (el: HTMLElement & MountableElement): HTMLElement | null =>
  el.shadowRoot?.querySelector('details.enonce') ?? null;

/** La ligne des noms de pieces jointes, si elle a ete emise. */
const piecesJointes = (el: HTMLElement & MountableElement): HTMLElement | null =>
  el.shadowRoot?.querySelector('.devoirs-pieces') ?? null;

/**
 * Un `hass` avec le capteur de retard, dont on choisit les attributs.
 *
 * Les devoirs ont une echeance LOINTAINE : aucune ligne n'est donc en retard
 * d'elle-meme, et toute pastille observee vient du bandeau. Sans ca, une
 * assertion sur le bandeau mesurerait les deux sources melangees.
 */
const avecCapteurRetard = (
  attributes: Record<string, unknown>,
  devoirs: unknown[] = [{ id: 'h1', subject: 'Maths', description_text: 'X', due: '2099-01-01' }]
) =>
  hw({ items: devoirs }, String(devoirs.length), [
    {
      key: 'binary_sensor:homework_overdue',
      entity_id: 'binary_sensor.abc_devoirs_en_retard',
      device: 'dev_enfant',
      state: 'on',
      attributes,
    },
  ]);

describe('carte devoirs', () => {
  // `calendar:homework` porte la prochaine échéance telle que le calendrier la
  // voit. Elle n'est lue que dans ses ATTRIBUTS : récupérer la liste de ses
  // évènements demanderait un appel de service, donc une collecte au rendu.
  const withCalendar = (attributes: Record<string, unknown>, calendar: Record<string, unknown>) =>
    hw(attributes, '2', [
      {
        key: 'calendar:homework',
        entity_id: 'calendar.abc_devoirs',
        device: 'dev_enfant',
        state: 'off',
        attributes: calendar,
      },
    ]);

  const nextEvent = { message: 'DM de physique', start_time: '2026-09-15T08:00:00+02:00' };

  it('nomme la prochaine échéance depuis le calendrier, que le filtre masque', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', filter: 'todo' },
      withCalendar({ items }, nextEvent)
    );
    const t = text(el);
    expect(t).toContain('Prochaine échéance');
    expect(t).toContain('DM de physique');
    // Assertion positive : la liste est toujours là, la ligne s'ajoute.
    expect(t).toContain('Maths');
  });

  it('garde la prochaine échéance quand la fenêtre choisie est vide', async () => {
    // Le moment où cette ligne sert le plus : rien à rendre dans la fenêtre
    // demandée, mais une échéance existe plus loin.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', filter: 'todo' },
      withCalendar({ items: [] }, nextEvent)
    );
    const t = text(el);
    expect(t).toContain('Prochaine échéance');
    expect(t).toContain('DM de physique');
  });

  it('tait la prochaine échéance avec le filtre « tous », où la liste montre déjà tout', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', filter: 'all' },
      makeHass([
        {
          key: 'sensor:homework',
          entity_id: 'sensor.abc_devoirs',
          device: 'dev_enfant',
          state: '2',
          attributes: { items },
        },
        {
          key: 'calendar:homework',
          entity_id: 'calendar.abc_devoirs',
          device: 'dev_enfant',
          state: 'off',
          attributes: nextEvent,
        },
      ])
    );
    const t = text(el);
    expect(t).not.toContain('Prochaine échéance');
    expect(t).toContain('Maths');
  });

  it('ne dit rien quand le calendrier n’a aucun évènement à venir', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', filter: 'todo' },
      withCalendar({ items }, {})
    );
    const t = text(el);
    expect(t).not.toContain('Prochaine échéance');
    expect(t).toContain('Maths');
  });

  it('liste les devoirs avec matière et énoncé', async () => {
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hw({ items }));
    const t = text(el);
    expect(t).toContain('Maths');
    expect(t).toContain('Exercices 4 à 7');
    expect(t).toContain('Anglais');
  });

  it('respecte limit', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', limit: 1 },
      hw({ items })
    );
    const t = text(el);
    expect(t).toContain('Maths');
    expect(t).not.toContain('Anglais');
  });

  it('dit « rien à faire » sur une liste vide', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [] }, '0')
    );
    const t = text(el);
    expect(t).toContain('Rien à faire');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({}, 'unavailable')
    );
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:homework_todo');
  });

  // --- Critique n°3 : `items` mal formé ne doit jamais faire disparaître la carte. ---

  it("ne casse pas le rendu quand l'attribut items est un objet", async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: {} })
    );
    expect(text(el)).toContain('Rien à faire');
  });

  it("ne casse pas le rendu quand l'attribut items est une chaîne", async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: 'x' })
    );
    expect(text(el)).toContain('Rien à faire');
  });

  it('ignore un élément null dans le tableau items sans lever', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [null, items[0]] })
    );
    expect(text(el)).toContain('Maths');
  });

  // --- Critique n°1 : le bon bit de supported_features. ---

  it.each([4, 5])(
    'rend la case à cocher quand supported_features=%i porte UPDATE_TODO_ITEM',
    async (features) => {
      const el = await mountCard(
        'pronote-ng-devoirs',
        { device_id: 'dev_enfant' },
        withTodoList({ items }, features)
      );
      expect(el.shadowRoot?.querySelectorAll('input').length).toBeGreaterThan(0);
    }
  );

  it('ne rend aucune case quand supported_features=2 (DELETE_TODO_ITEM, pas UPDATE_TODO_ITEM)', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      withTodoList({ items }, 2)
    );
    expect(el.shadowRoot?.querySelector('input')).toBeNull();
    expect(text(el)).toContain('Maths');
  });

  it("ne rend aucune case à cocher si l'écriture n'est pas activée", async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      withTodoList({ items }, 0)
    );
    expect(el.shadowRoot?.querySelector('input')).toBeNull();
    expect(text(el)).toContain('Maths');
  });

  // --- Critique n°2 : désignation du devoir par id, pas par énoncé libre. ---

  it("appelle todo.update_item avec l'identifiant du devoir, pas son énoncé", async () => {
    const hass = withTodoList({ items }, 4);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    const box = el.shadowRoot?.querySelector('input');
    expect(box).not.toBeNull();
    if (box) {
      box.checked = true;
      box.dispatchEvent(new Event('change'));
    }
    await el.updateComplete;
    expect(spy).toHaveBeenCalledWith(
      'todo',
      'update_item',
      expect.objectContaining({ item: 'h1', status: 'completed' }),
      expect.objectContaining({ entity_id: 'todo.abc_devoirs' })
    );
  });

  it('désigne le bon devoir même quand deux devoirs partagent le même énoncé', async () => {
    const dup = [
      { id: 'h1', subject: 'Maths', description: 'Réviser', due: '2026-09-09', done: false },
      { id: 'h2', subject: 'Anglais', description: 'Réviser', due: '2026-09-09', done: false },
    ];
    const hass = withTodoList({ items: dup }, 4);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    const boxes = el.shadowRoot?.querySelectorAll('input');
    expect(boxes?.length).toBe(2);
    const second = boxes?.[1];
    expect(second).toBeTruthy();
    if (second) {
      second.checked = true;
      second.dispatchEvent(new Event('change'));
    }
    await el.updateComplete;
    expect(spy).toHaveBeenCalledWith(
      'todo',
      'update_item',
      expect.objectContaining({ item: 'h2', status: 'completed' }),
      expect.anything()
    );
  });

  // --- Critique n°4 : la case coche/décoche vraiment, et se corrige si l'appel échoue. ---

  it('envoie needs_action en décochant un devoir déjà fait', async () => {
    const done = [{ id: 'h1', subject: 'Maths', description: 'X', due: '2026-09-09', done: true }];
    const hass = withTodoList({ items: done }, 4);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    const box = el.shadowRoot?.querySelector('input');
    expect(box?.checked).toBe(true);
    if (box) {
      box.checked = false;
      box.dispatchEvent(new Event('change'));
    }
    await el.updateComplete;
    expect(spy).toHaveBeenCalledWith(
      'todo',
      'update_item',
      expect.objectContaining({ status: 'needs_action' }),
      expect.anything()
    );
  });

  it("restaure la case à cocher si l'appel échoue", async () => {
    const todo = [{ id: 'h1', subject: 'Maths', description: 'X', due: '2026-09-09', done: false }];
    const hass = withTodoList({ items: todo }, 4);
    hass.callService = vi.fn().mockRejectedValue(new Error('échec'));
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    const box = el.shadowRoot?.querySelector('input');
    expect(box?.checked).toBe(false);
    if (box) {
      box.checked = true;
      box.dispatchEvent(new Event('change'));
    }
    await el.updateComplete;
    // Laisse le `catch` de la promesse rejetée s'exécuter avant d'observer la case.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(box?.checked).toBe(false);
  });

  // --- Important n°5 : pastille « en retard » et lignes en retard marquées. ---

  it('affiche une pastille « en retard » quand homework_overdue est on, et marque les lignes en retard', async () => {
    const overdueItems = [
      { id: 'h1', subject: 'Maths', description: 'Passé', due: '2020-01-01', done: false },
      { id: 'h2', subject: 'Anglais', description: 'Futur', due: '2099-01-01', done: false },
    ];
    const hass = hw({ items: overdueItems }, '2', [
      {
        key: 'binary_sensor:homework_overdue',
        entity_id: 'binary_sensor.abc_devoirs_en_retard',
        device: 'dev_enfant',
        state: 'on',
        attributes: {},
      },
    ]);
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('en retard');
    // Une pastille pour le bandeau d'en-tête, une pour la ligne en retard.
    expect(el.shadowRoot?.querySelectorAll('.chip.problem').length).toBe(2);
  });

  it('sépare la pastille de BANDEAU, qui suit le capteur, de celle de LIGNE, qui suit la date', async () => {
    // Ce test attendait zéro pastille sur la fixture partagée, et il est tombé
    // à minuit : l'échéance de `items[0]` était « aujourd'hui » le jour où il
    // a été écrit, elle est devenue « hier ». La carte n'a pas changé, le
    // calendrier oui — `isOverdue` compare à `new Date()` et cette carte n'a
    // aucune couture d'horloge, contrairement à la vue journée.
    //
    // Il dit maintenant ce qu'il voulait dire, sur des dates qui ne peuvent
    // plus dériver : le BANDEAU suit `binary_sensor:homework_overdue`, la
    // pastille de LIGNE suit la DATE, et les deux sont indépendantes. La
    // version précédente ne prouvait rien de cette séparation — elle comptait
    // zéro parce qu'aucune des deux ne s'était déclenchée.
    const capteurEteint = [
      {
        key: 'binary_sensor:homework_overdue',
        entity_id: 'binary_sensor.abc_devoirs_en_retard',
        device: 'dev_enfant' as const,
        state: 'off',
        attributes: {},
      },
    ];
    const futur = [
      { id: 'h1', subject: 'Maths', description: 'X', due: '2099-01-01', done: false },
    ];
    const passe = [
      { id: 'h1', subject: 'Maths', description: 'X', due: '2020-01-01', done: false },
    ];

    const rien = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: futur }, '1', capteurEteint)
    );
    expect(rien.shadowRoot?.querySelectorAll('.chip.problem').length).toBe(0);
    // Appariement positif : la carte rend bien sa ligne, elle n'est pas vide.
    expect(text(rien)).toContain('Maths');

    const uneSeule = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: passe }, '1', capteurEteint)
    );
    // Une seule : la ligne. Pas le bandeau, puisque le capteur est éteint.
    expect(uneSeule.shadowRoot?.querySelectorAll('.chip.problem').length).toBe(1);
  });

  // --- Important n°6 : tri par vraie date, affichage via formatDayLabel. ---

  it("trie par échéance réelle (pas par comparaison de chaînes) et rend une date lisible, pas l'ISO brut", async () => {
    const mixed = [
      { id: 'h1', subject: 'Anglais', description: 'B', due: '2026-09-20' },
      { id: 'h2', subject: 'Maths', description: 'A', due: '2026-09-01' },
      { id: 'h3', subject: 'Histoire', description: 'C' },
    ];
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: mixed })
    );
    const primaries = Array.from(el.shadowRoot?.querySelectorAll('.row .primary') ?? []).map(
      (n) => n.textContent ?? ''
    );
    const iMaths = primaries.findIndex((p) => p.includes('Maths'));
    const iAnglais = primaries.findIndex((p) => p.includes('Anglais'));
    const iHistoire = primaries.findIndex((p) => p.includes('Histoire'));
    expect(iMaths).toBeGreaterThanOrEqual(0);
    expect(iMaths).toBeLessThan(iAnglais);
    expect(iAnglais).toBeLessThan(iHistoire);

    const t = text(el);
    expect(t).not.toContain('2026-09-01');
    expect(t).toContain('septembre');
  });

  // --- Important n°7 : group_by groupe vraiment, avec de vrais intitulés. ---

  it('groupe par matière avec de vrais intitulés de groupe, pas seulement un tri', async () => {
    const bySubject = [
      { id: 'h1', subject: 'Maths', description: 'A', due: '2026-09-09' },
      { id: 'h2', subject: 'Anglais', description: 'B', due: '2026-09-09' },
      { id: 'h3', subject: 'Maths', description: 'C', due: '2026-09-10' },
    ];
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      hw({ items: bySubject })
    );
    const titles = Array.from(el.shadowRoot?.querySelectorAll('.title') ?? []).map(
      (n) => n.textContent
    );
    expect(titles).toEqual(['Anglais', 'Maths']);
  });

  it('préfère `description_text` publié par l’intégration au HTML nettoyé ici', async () => {
    // La conversion appartient au module qui SAIT que le champ est du HTML :
    // trois cartes avec trois nettoyeurs donneraient trois réponses au même
    // `&amp;amp;`. Mon nettoyage reste le repli pour une intégration
    // antérieure à ce champ — d'où les deux champs, volontairement
    // divergents, dans cette fixture.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({
        items: [
          {
            id: 'h1',
            subject: 'Anglais',
            description: '<div>Version HTML</div>',
            description_text: 'Version texte de l’intégration',
            due: '2026-09-11',
            done: false,
          },
        ],
      })
    );
    const t = text(el);
    expect(t).toContain('Version texte de l’intégration');
    expect(t).not.toContain('Version HTML');
  });

  it('affiche l’énoncé en texte lisible, pas le balisage que PRONOTE envoie', async () => {
    // Forme réelle : l'intégration recopie le HTML du serveur. La carte
    // affichait les balises et les entités à l'écran.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({
        items: [
          {
            id: 'h1',
            subject: 'Anglais',
            description: '<div>Prenez votre cahier.<br>Pensez à l&#039;acheter !</div>',
            due: '2026-09-11',
            done: false,
          },
        ],
      })
    );
    const t = text(el);
    expect(t).toContain('Prenez votre cahier.');
    expect(t).toContain("Pensez à l'acheter !");
    expect(t).not.toContain('<div>');
    expect(t).not.toContain('&#039;');
  });
});

describe('carte devoirs — le lot du 10 septembre 2026', () => {
  /**
   * Les trois défauts corrigés ici ont été trouvés en mesurant la carte sur
   * une instance, pas en relisant le code : les portes étaient vertes.
   *
   * Ce qu'aucune fixture ne combinait avant, et qui explique que les trois
   * soient passés : une échéance passée AVEC `done: true`, et `limit` à une
   * autre valeur que 1.
   */

  const passeFait = {
    id: 'h1',
    subject: 'Maths',
    description: 'Rendu',
    due: '2020-01-01',
    done: true,
  };
  const passeAFaire = {
    id: 'h2',
    subject: 'Anglais',
    description: 'En souffrance',
    due: '2020-01-01',
    done: false,
  };

  // `withCalendar` et `nextEvent` vivent dans l'autre `describe` : hors de
  // portee ici, donc le calendrier ET le capteur de retard sont montes ici,
  // ensemble, parce que le cas `limit: 0` a besoin des deux a la fois.
  const withCalendarEtRetard = (attributes: Record<string, unknown>) =>
    hw(attributes, '2', [
      {
        key: 'calendar:homework',
        entity_id: 'calendar.abc_devoirs',
        device: 'dev_enfant',
        state: 'off',
        attributes: { message: 'DM de physique', start_time: '2026-09-15T08:00:00+02:00' },
      },
      {
        key: 'binary_sensor:homework_overdue',
        entity_id: 'binary_sensor.abc_devoirs_en_retard',
        device: 'dev_enfant',
        state: 'on',
        attributes: {},
      },
    ]);

  // --- 1. `done` fait partie de la definition du retard. ---

  it('ne dit pas « en retard » d’un devoir fait dont l’échéance est passée', async () => {
    // Le cas NORMAL, pas un cas de coin : on coche après avoir fait, et
    // l'échéance passe ensuite. Aucun capteur de bandeau dans cette fixture,
    // donc toute pastille vient forcément d'une LIGNE.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [passeFait, passeAFaire] })
    );
    // Appariement positif : les deux devoirs sont bien rendus.
    expect(text(el)).toContain('Rendu');
    expect(text(el)).toContain('En souffrance');
    // Et une seule pastille pour deux échéances également passées.
    expect(pastilles(el)).toEqual(['en retard']);
  });

  it('pose la pastille sur la ligne du devoir non fait, et non sur sa voisine', async () => {
    // Compter les pastilles ne suffit pas : une pastille posée sur la
    // mauvaise ligne donnerait le même compte. On regarde donc OÙ elle est.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [passeFait, passeAFaire] })
    );
    const lignes = Array.from(el.shadowRoot?.querySelectorAll('.row') ?? []);
    const ligneRendue = lignes.find((r) => r.textContent?.includes('Rendu'));
    const ligneSouffrante = lignes.find((r) => r.textContent?.includes('En souffrance'));
    expect(ligneRendue).toBeDefined();
    expect(ligneSouffrante).toBeDefined();
    expect(ligneRendue?.querySelector('.chip.problem')).toBeNull();
    expect(ligneSouffrante?.querySelector('.chip.problem')).not.toBeNull();
  });

  it('laisse le BANDEAU au capteur, même quand aucune ligne visible n’est en retard', async () => {
    // La séparation des deux sources ne doit pas avoir bougé : le bandeau
    // suit `binary_sensor:homework_overdue`, qui porte le compte de l'élève
    // entier, pas celui de la fenêtre affichée.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [passeFait] }, '1', [
        {
          key: 'binary_sensor:homework_overdue',
          entity_id: 'binary_sensor.abc_devoirs_en_retard',
          device: 'dev_enfant',
          state: 'on',
          attributes: {},
        },
      ])
    );
    // Une pastille : celle du bandeau. La ligne, elle, n'en porte pas.
    expect(pastilles(el)).toEqual(['en retard']);
    const ligne = Array.from(el.shadowRoot?.querySelectorAll('.row') ?? []).find((r) =>
      r.textContent?.includes('Rendu')
    );
    expect(ligne?.querySelector('.chip.problem')).toBeNull();
  });

  // --- 2. `limit: 0` dit pourquoi il n'y a rien. ---

  it('explique pourquoi rien ne s’affiche quand limit vaut zéro', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', limit: 0 },
      hw({ items })
    );
    const t = text(el);
    // La cause est nommée, et le remède avec elle.
    expect(t).toContain("l'option de limite est à zéro");
    // Et surtout PAS le message d'état vide ordinaire : « rien à faire »
    // au-dessus de devoirs à faire serait faux.
    expect(t).not.toContain('Rien à faire');
    expect(t).not.toContain('Maths');
    expect(t).not.toContain('Anglais');
    expect(titres(el)).toEqual([]);
  });

  it('garde la prochaine échéance et le bandeau sous limit zéro', async () => {
    // Ni l'une ni l'autre ne dépend de la liste affichée, et c'est le moment
    // où elles servent le plus : la carte ne montre aucun devoir, donc tout ce
    // qui reste doit porter.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', limit: 0 },
      withCalendarEtRetard({ items })
    );
    const t = text(el);
    expect(t).toContain('Prochaine échéance');
    expect(t).toContain('DM de physique');
    expect(t).toContain("l'option de limite est à zéro");
    expect(pastilles(el)).toEqual(['en retard']);
  });

  it('distingue limit zéro d’une liste réellement vide', async () => {
    // Les deux rendent zéro devoir ; ils ne disent pas la même chose, et
    // c'est tout l'objet de la correction.
    const zero = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', limit: 0 },
      hw({ items })
    );
    const vide = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [] }, '0')
    );
    expect(text(zero)).toContain("l'option de limite est à zéro");
    expect(text(vide)).toContain('Rien à faire');
    expect(text(vide)).not.toContain("l'option de limite");
  });

  it('ne déclenche pas la garde pour une limite négative, qui veut dire « tout »', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', limit: -1 },
      hw({ items })
    );
    expect(text(el)).toContain('Maths');
    expect(text(el)).toContain('Anglais');
    expect(text(el)).not.toContain("l'option de limite");
  });

  // --- 3. L'echeance ne se repete plus sous son propre titre. ---

  it('ne répète pas l’échéance en fin de ligne quand elle titre déjà le groupe', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'date' },
      hw({ items })
    );
    // Positif : la date est bien là, une fois, en titre de groupe.
    const t = titres(el);
    expect(t.length).toBe(2);
    expect(t[0]).toContain('septembre');
    // Et nulle part ailleurs.
    expect(fins(el).every((f) => !f.includes('septembre'))).toBe(true);
    expect(text(el)).not.toContain('pour le');
  });

  it('garde l’échéance en fin de ligne quand le groupe est une matière', async () => {
    // Le contrepoids : groupée par matière, la date est la seule chose qui
    // situe le devoir. Sans ce cas, retirer `dueLabel` partout passerait le
    // test précédent — mesuré, il passe.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      hw({ items })
    );
    expect(text(el)).toContain('pour le');
    expect(fins(el).some((f) => f.includes('septembre'))).toBe(true);
  });

  it('ne pose pas de fin de ligne vide quand il n’y a rien à y mettre', async () => {
    // `listRow` teste la PRÉSENCE de `trailing`, et un gabarit est toujours
    // vrai : groupée par échéance, chaque ligne sans retard aurait posé une
    // boîte vide dans la tête du bloc.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'date' },
      hw(
        {
          items: [{ id: 'h1', subject: 'Maths', description: 'X', due: '2099-01-01', done: false }],
        },
        '1'
      )
    );
    expect(text(el)).toContain('Maths');
    expect(el.shadowRoot?.querySelectorAll('.row .trailing').length).toBe(0);
  });
});

describe('carte devoirs — la hauteur annoncée et l’énoncé repliable', () => {
  /**
   * Les deux bouts du même problème : la carte est haute parce que les
   * énoncés sont longs. `size` doit l'avouer, et `max_lines` permet de la
   * raccourcir sans rien cacher en silence.
   *
   * Ce que ce fichier ne peut PAS mesurer : la coupe elle-même. jsdom
   * n'applique pas `-webkit-line-clamp` et ne peint pas les points de
   * suspension. Cette partie a été mesurée dans Chrome le 10 septembre 2026
   * — 85 pixels sans coupe, 34 à deux lignes, 51 à trois, et les points de
   * suspension vérifiés à la capture. Ici on vérifie la STRUCTURE émise et
   * le nombre de lignes transmis, qui sont ce que la carte contrôle.
   */

  // Plus de 160 caracteres, donc plus de deux lignes a 80 par ligne.
  const ENONCE_LONG =
    'Exercices 12 à 18 page 132, puis relire le chapitre entier et préparer ' +
    'les trois questions de synthèse pour la semaine prochaine sans oublier ' +
    'le matériel demandé en début de cours.';
  const ENONCE_COURT = 'Exercices 4 à 7.';

  // --- 4. la hauteur annoncee dit la verite, a l'ordre de grandeur pres. ---

  it('annonce une hauteur du bon ordre de grandeur, et non plus cinq', async () => {
    // Mesuré le 10 septembre 2026 : 1 376 pixels avec le filtre « à faire »,
    // soit environ 27 unités de 50 pixels. La valeur figée de 5 annonçait
    // 250 pixels — un facteur cinq, et la carte la plus haute des onze se
    // déclarait parmi les plus courtes.
    const parDefaut = taille({});
    expect(parDefaut).toBeGreaterThan(20);
    expect(parDefaut).toBeLessThan(40);
    // Et surtout : plus la valeur qui mentait.
    expect(parDefaut).not.toBe(5);
  });

  it('rend exactement les hauteurs que la documentation publie', async () => {
    /**
     * Les autres cas de ce bloc portent sur des ordres et des bornes,
     * exprès : la formule doit pouvoir être affinée sans casser la suite.
     * Celui-ci fait l'inverse et épingle des valeurs exactes, pour une
     * raison précise : **ces quatre nombres sont écrits dans
     * `docs/tableaux-de-bord.md`**, dans le tableau des hauteurs.
     *
     * Son travail n'est donc pas de figer le code, c'est de tomber le jour
     * où la page devient fausse. Si vous ajustez la formule, ce test vous
     * dira quelle page corriger — ce qu'aucune borne n'aurait fait.
     *
     * Ils ont déjà divergé une fois : la formule était en décimaux et
     * `max_lines: 3` rendait 27 par erreur de représentation, alors que le
     * calcul à la main donne 28. Voir le commentaire de `size`.
     */
    expect(taille({})).toBe(31);
    expect(taille({ filter: 'all' })).toBe(40);
    expect(taille({ filter: 'tomorrow' })).toBe(13);
    expect(taille({ max_lines: 3 })).toBe(28);
  });

  it('classe les trois filtres dans l’ordre de leur hauteur réelle', async () => {
    // C'est le seul usage que Home Assistant fait de `size` : équilibrer des
    // colonnes. Un classement juste vaut donc plus qu'un nombre exact.
    const demain = taille({ filter: 'tomorrow' });
    const aFaire = taille({ filter: 'todo' });
    const tous = taille({ filter: 'all' });
    expect(demain).toBeLessThan(aFaire);
    expect(aFaire).toBeLessThan(tous);
  });

  it('préfère un limit explicite à son estimation par filtre', async () => {
    // Un `limit` est exact, là où les nombres par filtre sont des ordres de
    // grandeur relevés sur une instance.
    const estime = taille({ filter: 'all' });
    const borne = taille({ filter: 'all', limit: 3 });
    expect(borne).toBeLessThan(estime);
  });

  it('tombe au plancher quand la carte ne rend qu’une phrase', async () => {
    // `limit: 0` ne rend que le message, le bandeau et la prochaine
    // échéance : trois unités, pas trente.
    expect(taille({ limit: 0 })).toBe(3);
  });

  it('annonce moins haut quand l’énoncé est replié', async () => {
    const deplie = taille({ filter: 'todo' });
    const replie = taille({ filter: 'todo', max_lines: 2 });
    expect(replie).toBeLessThan(deplie);
  });

  it('ne s’annonce JAMAIS plus haut replié que déplié', async () => {
    // Le piège de la formule : un `max_lines` généreux ne doit pas faire
    // gonfler l'estimation au-delà du cas sans repli, puisque replier ne
    // peut que raccourcir.
    const deplie = taille({ filter: 'todo' });
    for (const max_lines of [2, 3, 5, 12, 20]) {
      expect(taille({ filter: 'todo', max_lines })).toBeLessThanOrEqual(deplie);
    }
  });

  // --- 7. l'enonce se replie, et seulement quand il depasse. ---

  it('n’emballe rien sans l’option : les configurations existantes ne bougent pas', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: unDevoir(ENONCE_LONG) }, '1')
    );
    expect(details(el)).toBeNull();
    // Appariement positif : l'énoncé entier est bien rendu, en clair.
    expect(text(el)).toContain(ENONCE_LONG);
  });

  it('replie un énoncé qui dépasse, et lui transmet le nombre de lignes', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 2 },
      hw({ items: unDevoir(ENONCE_LONG) }, '1')
    );
    const d = details(el);
    expect(d).not.toBeNull();
    expect(d?.getAttribute('style')?.trim()).toBe('--pronote-max-lines: 2');
    // Le repli est fermé au départ : c'est lui qui raccourcit la carte.
    expect(d?.hasAttribute('open')).toBe(false);
  });

  it('garde le texte ENTIER dans le DOM pendant qu’il est replié', async () => {
    // Le point qui rend le dispositif acceptable : un lecteur d'écran et une
    // recherche dans la page trouvent tout. Seule la peinture est coupée.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 2 },
      hw({ items: unDevoir(ENONCE_LONG) }, '1')
    );
    const corps = el.shadowRoot?.querySelector('.enonce > .enonce-tete > .enonce-corps');
    expect(corps?.textContent).toBe(ENONCE_LONG);
  });

  it('laisse en clair un énoncé qui tient déjà dans les lignes demandées', async () => {
    // L'honnêteté du dispositif : un bloc dépliable sans rien dedans
    // s'annonce à un lecteur d'écran comme du contenu caché, et il irait
    // chercher ce qui n'existe pas.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 3 },
      hw({ items: unDevoir(ENONCE_COURT) }, '1')
    );
    expect(details(el)).toBeNull();
    expect(text(el)).toContain(ENONCE_COURT);
  });

  it('compte les retours à la ligne, pas seulement les caractères', async () => {
    // La forme la plus courante d'un énoncé : une liste courte sur plusieurs
    // lignes. Soixante caractères en six lignes occupent six lignes, et un
    // simple compte de caractères les aurait laissés dépliés.
    const liste = [
      'Be / Have',
      'Il y a',
      'Les couleurs',
      'Les nombres',
      'Les jours',
      'Les mois',
    ].join('\n');
    expect(liste.length).toBeLessThan(80);
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 3 },
      hw({ items: unDevoir(liste) }, '1')
    );
    expect(details(el)).not.toBeNull();
  });

  it('ignore une valeur qui n’est pas un nombre de lignes utilisable', async () => {
    // Montes en parallele plutot qu'un `await` par tour : la regle de lint
    // a raison, rien ici ne depend du tour precedent.
    const montes = await Promise.all(
      ['trois', null, -2, 0].map((max_lines) =>
        mountCard(
          'pronote-ng-devoirs',
          { device_id: 'dev_enfant', max_lines },
          hw({ items: unDevoir(ENONCE_LONG) }, '1')
        )
      )
    );
    for (const el of montes) {
      expect(details(el)).toBeNull();
      expect(text(el)).toContain(ENONCE_LONG);
    }
  });

  it('tronque une valeur fractionnaire au lieu de la transmettre telle quelle', async () => {
    // Une fraction dans `-webkit-line-clamp` n'a pas de sens, et le champ
    // vient d'un YAML écrit à la main.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 2.9 },
      hw({ items: unDevoir(ENONCE_LONG) }, '1')
    );
    // Égalité EXACTE, pas `toContain` : la première version de ce test
    // cherchait « 2 » dans l'attribut, et « 2.9 » le contient. Mesuré en
    // retirant le `Math.trunc` : le test passait quand même, donc il ne
    // mesurait rien.
    expect(details(el)?.getAttribute('style')?.trim()).toBe('--pronote-max-lines: 2');
  });

  it('replie chaque devoir séparément, selon SA longueur', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 2 },
      hw(
        {
          items: [
            { id: 'h1', subject: 'Maths', description_text: ENONCE_LONG, due: '2099-01-01' },
            { id: 'h2', subject: 'Anglais', description_text: ENONCE_COURT, due: '2099-01-01' },
          ],
        },
        '2'
      )
    );
    // Un seul repli pour deux devoirs.
    expect(el.shadowRoot?.querySelectorAll('details.enonce').length).toBe(1);
    // Et les deux énoncés sont là.
    expect(text(el)).toContain(ENONCE_LONG);
    expect(text(el)).toContain(ENONCE_COURT);
  });
});

describe('carte devoirs — le compte des retards et les pièces jointes', () => {
  /**
   * Deux informations que l'intégration publiait et que la carte jetait.
   * Trouvées en listant les attributs réels plutôt qu'en relisant la carte :
   * `count` sur le capteur de retard, `attachments` sur chaque devoir.
   */

  // --- 5. le bandeau dit COMBIEN. ---

  it('annonce le nombre de devoirs en retard au lieu du seul mot', async () => {
    // Mesuré le 10 septembre 2026 : l'intégration publiait quatre, la carte
    // n'affichait que « en retard ». Le chiffre est le seul élément qui dise
    // s'il faut s'en occuper ce soir.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({ count: 4 })
    );
    expect(pastilles(el)).toEqual(['4 en retard']);
  });

  it('compte au singulier sans changer de forme', async () => {
    // Les quatre traductions emploient une locution invariable exprès : une
    // seule forme doit servir tous les comptes.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({ count: 1 })
    );
    expect(pastilles(el)).toEqual(['1 en retard']);
  });

  it('retombe sur le libellé nu quand l’intégration ne publie pas le compte', async () => {
    // Une intégration antérieure à l'attribut ne doit pas perdre le bandeau.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({})
    );
    expect(pastilles(el)).toEqual(['en retard']);
  });

  it('n’écrit jamais « 0 en retard » sur un bandeau rouge', async () => {
    // Un zéro publié pendant que l'état vaut `on` est une contradiction de
    // l'intégration. La carte n'a pas à la répéter : elle montre le bandeau,
    // qui suit l'état, sans le chiffre qui le démentirait.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({ count: 0 })
    );
    expect(pastilles(el)).toEqual(['en retard']);
    expect(text(el)).not.toContain('0 en retard');
  });

  it('ignore un compte qui n’est pas un nombre', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({ count: 'quatre' })
    );
    expect(pastilles(el)).toEqual(['en retard']);
  });

  it('laisse la pastille de LIGNE sans compte : le chiffre est au bandeau', async () => {
    // Le discriminant. « 4 en retard » sur la ligne d'un devoir dirait que
    // CE devoir est en retard de quatre, ce qui ne veut rien dire. Le compte
    // porte sur l'élève, la pastille de ligne sur la date du devoir.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      avecCapteurRetard({ count: 4 }, [
        { id: 'h1', subject: 'Maths', description_text: 'Passé', due: '2020-01-01', done: false },
      ])
    );
    // Deux pastilles : le bandeau chiffré, puis la ligne au libellé nu.
    expect(pastilles(el)).toEqual(['4 en retard', 'en retard']);
  });

  // --- 6. les pieces jointes existent enfin. ---

  const DEUX_PIECES = [
    {
      id: 'h1',
      subject: 'Maths',
      description_text: 'Exercices 4 à 7.',
      due: '2099-01-01',
      attachments: ['fiche-revision.pdf', 'schema.png'],
    },
  ];

  it('nomme les pièces jointes d’un devoir', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: DEUX_PIECES }, '1')
    );
    const ligne = piecesJointes(el);
    expect(ligne).not.toBeNull();
    expect(ligne?.textContent).toContain('Pièces jointes');
    expect(ligne?.textContent).toContain('fiche-revision.pdf');
    expect(ligne?.textContent).toContain('schema.png');
  });

  it('accorde le libellé au nombre de pièces', async () => {
    const une = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [{ ...DEUX_PIECES[0], attachments: ['fiche-revision.pdf'] }] }, '1')
    );
    expect(piecesJointes(une)?.textContent).toContain('Pièce jointe');
    expect(piecesJointes(une)?.textContent).not.toContain('Pièces jointes');
  });

  it('n’affiche aucune ligne quand le devoir n’a pas de pièce', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: [
            { id: 'h1', subject: 'Maths', description_text: 'Sans pièce', due: '2099-01-01' },
          ],
        },
        '1'
      )
    );
    expect(piecesJointes(el)).toBeNull();
    // Appariement positif : la ligne du devoir est bien rendue.
    expect(text(el)).toContain('Sans pièce');
  });

  it('écarte ce qui n’est pas un nom utilisable', async () => {
    // Une version future qui passerait à des objets ferait sinon afficher
    // « [object Object] », et une chaîne vide un séparateur solitaire.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        { items: [{ ...DEUX_PIECES[0], attachments: [{ url: 'x' }, '', '   ', 'vrai.pdf'] }] },
        '1'
      )
    );
    const ligne = piecesJointes(el);
    expect(ligne?.textContent).toContain('vrai.pdf');
    expect(ligne?.textContent).not.toContain('object');
    // Une seule pièce retenue, donc le singulier.
    expect(ligne?.textContent).toContain('Pièce jointe');
  });

  it('n’affiche pas de ligne quand aucune pièce n’est utilisable', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [{ ...DEUX_PIECES[0], attachments: [{ url: 'x' }, ''] }] }, '1')
    );
    expect(piecesJointes(el)).toBeNull();
    expect(text(el)).toContain('Exercices 4 à 7.');
  });

  it('se tait quand show_attachments vaut faux', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', show_attachments: false },
      hw({ items: DEUX_PIECES }, '1')
    );
    expect(piecesJointes(el)).toBeNull();
    expect(text(el)).not.toContain('fiche-revision.pdf');
    // Appariement positif : le devoir est toujours là.
    expect(text(el)).toContain('Exercices 4 à 7.');
  });

  it('garde les pièces jointes VISIBLES quand l’énoncé est replié', async () => {
    // C'est justement le devoir dont on ne lira que les trois premières
    // lignes : s'il porte un document, il doit continuer à le dire. La ligne
    // vit donc hors du bloc dépliable.
    const long = 'Exercices 12 à 18 page 132, puis relire le chapitre entier et préparer '.repeat(
      3
    );
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', max_lines: 2 },
      hw({ items: [{ ...DEUX_PIECES[0], description_text: long }] }, '1')
    );
    expect(details(el)).not.toBeNull();
    const ligne = piecesJointes(el);
    expect(ligne).not.toBeNull();
    // Hors du bloc repliable, et non dedans.
    expect(details(el)?.contains(ligne)).toBe(false);
  });

  it('rend la ligne même quand le devoir n’a pas d’énoncé', async () => {
    // `listRow` teste la présence de `secondary` : un devoir sans énoncé
    // mais avec une pièce ne doit pas la perdre au passage.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        { items: [{ id: 'h1', subject: 'Maths', due: '2099-01-01', attachments: ['seule.pdf'] }] },
        '1'
      )
    );
    expect(piecesJointes(el)?.textContent).toContain('seule.pdf');
  });

  it('ne fait de la pièce jointe ni un lien ni rien de cliquable', async () => {
    // La carte ne peut pas ouvrir un document : il faudrait un appel de
    // service, interdit au rendu. Un nom souligné inviterait à cliquer sur
    // ce qui ne répond pas.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: DEUX_PIECES }, '1')
    );
    const ligne = piecesJointes(el);
    expect(ligne?.querySelectorAll('a, button').length).toBe(0);
    expect(ligne?.textContent).toContain('fiche-revision.pdf');
  });
});
