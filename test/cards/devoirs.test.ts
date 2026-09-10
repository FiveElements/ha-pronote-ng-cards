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

/** Le groupe des pieces jointes d'un devoir, s'il a ete emis. */
const piecesJointes = (el: HTMLElement & MountableElement): HTMLElement | null =>
  el.shadowRoot?.querySelector('.devoirs-pieces') ?? null;

/**
 * Le nom accessible du groupe de pieces jointes.
 *
 * Depuis le passage en pastilles, << Pieces jointes >> n'est plus du texte
 * visible : il coutait une ligne entiere pour ce qu'un nom de fichier dans
 * une pastille dit deja. Il vit sur `aria-label`, donc il se lit la et pas
 * dans `textContent` -- et c'est pour ca que ce lecteur existe plutot que
 * de laisser les assertions chercher dans le texte rendu.
 */
const nomGroupePieces = (el: HTMLElement & MountableElement): string | null =>
  piecesJointes(el)?.getAttribute('aria-label') ?? null;

/** Les pastilles du groupe : la pastille est l'idiome visuel du depot. */
const pastillesPieces = (el: HTMLElement & MountableElement): HTMLElement[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.devoirs-piece > .chip') ?? []).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  );

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

/** Les elements de la liste des pieces jointes, dans l'ordre du rendu. */
const elementsPieces = (el: HTMLElement & MountableElement): HTMLElement[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.devoirs-piece[role="listitem"]') ?? []).filter(
    (n): n is HTMLElement => n instanceof HTMLElement
  );

/** Les liens de la liste des pieces jointes. */
const liensPieces = (el: HTMLElement & MountableElement): HTMLAnchorElement[] =>
  Array.from(el.shadowRoot?.querySelectorAll('.devoirs-piece a') ?? []).filter(
    (n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement
  );

/** Les échéances rendues, groupées sous leur intitulé de matière. */
  const parGroupe = (el: HTMLElement & MountableElement): { titre: string; jours: string[] }[] => {
    const out: { titre: string; jours: string[] }[] = [];
    for (const n of Array.from(el.shadowRoot?.querySelectorAll('.title, .row') ?? [])) {
      if (n.classList.contains('title')) {
        out.push({ titre: (n.textContent ?? '').trim(), jours: [] });
        continue;
      }
      const groupe = out[out.length - 1];
      if (!groupe) continue;
      const fin = n.querySelector('.trailing');
      groupe.jours.push((fin?.textContent ?? '').replace(/\s+/g, ' ').trim());
    }
    return out;
  };

/** Un devoir dont on choisit les DEUX listes : les noms, et les ouvrables. */
const devoirDeuxListes = (attachments: unknown[], attachment_links: unknown[]) => [
  {
    id: 'h1',
    subject: 'Anglais',
    description_text: 'Acheter le cahier.',
    due: '2099-01-01',
    attachments,
    attachment_links,
  },
];

/** Un devoir dont on choisit les pieces jointes. */
const devoirAvecPieces = (attachments: unknown[]) => [
  {
    id: 'h1',
    subject: 'Maths',
    description_text: 'Exercices 4 a 7.',
    due: '2099-01-01',
    attachments,
  },
];

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
    // Le libellé nomme le groupe pour un lecteur d'écran, il n'est plus
    // écrit à l'écran : deux noms de fichiers dans deux pastilles disent
    // déjà ce qu'une ligne « Pièces jointes : » répétait.
    expect(nomGroupePieces(el)).toContain('Pièces jointes');
    expect(ligne?.textContent).not.toContain('Pièces jointes');
    expect(ligne?.textContent).toContain('fiche-revision.pdf');
    expect(ligne?.textContent).toContain('schema.png');
  });

  it('accorde le libellé au nombre de pièces', async () => {
    const une = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: [{ ...DEUX_PIECES[0], attachments: ['fiche-revision.pdf'] }] }, '1')
    );
    expect(nomGroupePieces(une)).toContain('Pièce jointe');
    expect(nomGroupePieces(une)).not.toContain('Pièces jointes');
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
    expect(nomGroupePieces(el)).toContain('Pièce jointe');
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

  it('ne rend cliquable que ce qui porte une adresse', async () => {
    // Un nom seul ne devient pas un lien. La raison n'est pas une
    // interdiction du projet -- un `href` n'appelle aucun service, et un
    // commentaire d'ici l'a affirmé à tort -- c'est qu'il n'y a rien à
    // ouvrir. Inviter à cliquer sur ce qui ne répond pas est pire que de
    // n'afficher qu'un nom.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: DEUX_PIECES }, '1')
    );
    const ligne = piecesJointes(el);
    expect(ligne?.querySelectorAll('a, button').length).toBe(0);
    expect(ligne?.textContent).toContain('fiche-revision.pdf');
  });

  it('rend chaque pièce en pastille, l’idiome visuel du dépôt', async () => {
    /**
     * La forme a été choisie, pas héritée : le propriétaire a demandé
     * l'intégration adaptée à Home Assistant plutôt que le gabarit du site
     * web de PRONOTE. La pastille est déjà le vocabulaire de quatre cartes
     * d'ici, elle tire ses couleurs des variables du thème, et elle donne une
     * cible de clic — ce qu'un nom précédé d'un tiret n'était pas.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: DEUX_PIECES }, '1')
    );
    const rendues = pastillesPieces(el);
    expect(rendues.length).toBe(2);
    expect(rendues.map((n) => n.textContent?.trim())).toEqual([
      'fiche-revision.pdf',
      'schema.png',
    ]);
    // Sans adresse, la pastille est un span : rien qui invite au clic.
    expect(rendues.every((n) => n.tagName === 'SPAN')).toBe(true);
  });
});

describe('carte devoirs — la liste des pièces jointes et son lien', () => {
  /**
   * Deux demandes du propriétaire le 10 septembre 2026 : une **liste**, pour
   * distinguer plusieurs documents sur un même devoir, et un lien qui
   * s'ouvre dans le navigateur — le nom d'un PDF ne permet pas de lire
   * l'exercice qui est dedans.
   *
   * Ce qui bloque la seconde, et que ces tests ne peuvent pas débloquer :
   * l'intégration publie des **noms seuls**. Mesuré sur une instance, douze
   * pièces sans schéma ni barre oblique, et aucune adresse dans les
   * soixante-sept entités. La carte est donc prête et attend la donnée :
   * c'est exactement ce que les cas « lien » ci-dessous établissent, avec des
   * adresses synthétiques.
   */

  // --- la liste ---

  it('rend une vraie liste, un élément par pièce', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirAvecPieces(['fiche.pdf', 'corrige.pdf']) }, '1')
    );
    // La sémantique de liste, pour qu'un lecteur d'écran annonce « deux
    // éléments » : deux noms mis à la suite sur une ligne ne disaient pas où
    // s'arrêtait le premier.
    expect(el.shadowRoot?.querySelector('[role="list"]')).not.toBeNull();
    const elements = elementsPieces(el);
    expect(elements.length).toBe(2);
    expect(elements.map((n) => n.textContent?.trim())).toEqual(['fiche.pdf', 'corrige.pdf']);
  });

  it('nomme le groupe pour un lecteur d’écran, accordé au nombre', async () => {
    /**
     * Le libellé a quitté l'écran mais pas la carte. Une liste de pastilles
     * sans nom s'annonce « liste, deux éléments, fiche.pdf » : le lecteur
     * saurait qu'il y a une liste sans savoir de quoi. Le nom accessible
     * répond à ça, sans coûter la ligne que le libellé visible coûtait.
     */
    const deux = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirAvecPieces(['a.pdf', 'b.pdf']) }, '1')
    );
    expect(nomGroupePieces(deux)).toContain('Pièces jointes');
    // Et surtout : il ne s'écrit plus, sinon la ligne serait revenue.
    expect(piecesJointes(deux)?.textContent).not.toContain('Pièces jointes');
    const une = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirAvecPieces(['a.pdf']) }, '1')
    );
    expect(nomGroupePieces(une)).toContain('Pièce jointe');
    expect(elementsPieces(une).length).toBe(1);
  });

  it('n’invente aucun lien sur ce que l’intégration publie aujourd’hui', async () => {
    // L'état réel : des noms. Aucun `a` ne doit apparaître, sinon la carte
    // proposerait d'ouvrir ce qu'elle ne peut pas ouvrir.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirAvecPieces(['fiche-revision.pdf', 'chanson.mp3']) }, '1')
    );
    expect(elementsPieces(el).length).toBe(2);
    expect(liensPieces(el).length).toBe(0);
    expect(piecesJointes(el)?.textContent).toContain('chanson.mp3');
  });

  // --- le lien, le jour ou l'adresse arrivera ---

  it('ouvre la pièce quand l’intégration publie son adresse', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirAvecPieces([
            { name: 'chanson.mp3', url: 'https://demo.example.invalid/pj/chanson.mp3' },
          ]),
        },
        '1'
      )
    );
    const liens = liensPieces(el);
    expect(liens.length).toBe(1);
    expect(liens[0]?.getAttribute('href')).toBe('https://demo.example.invalid/pj/chanson.mp3');
    expect(liens[0]?.textContent?.trim()).toBe('chanson.mp3');
    // Le lien EST la pastille, il n'est pas dedans : une ancre qui envelopperait
    // un span serait une cible de clic plus petite que ce qu'elle a l'air d'etre.
    expect(liens[0]?.classList.contains('chip')).toBe(true);
    expect(liens[0]?.classList.contains('chip-lien')).toBe(true);
    // Nouvel onglet, et pas de fuite de l'adresse Home Assistant en
    // référent : le document est sur un serveur tiers.
    expect(liens[0]?.getAttribute('target')).toBe('_blank');
    expect(liens[0]?.getAttribute('rel')).toContain('noreferrer');
  });

  it('accepte une chaîne qui est elle-même une adresse, et la nomme lisiblement', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        { items: devoirAvecPieces(['https://demo.example.invalid/pj/le%20corrig%C3%A9.pdf']) },
        '1'
      )
    );
    const liens = liensPieces(el);
    expect(liens.length).toBe(1);
    // Le dernier segment, décodé : une adresse entière en guise de nom serait
    // illisible sur une ligne de carte.
    expect(liens[0]?.textContent?.trim()).toBe('le corrigé.pdf');
  });

  it('met un libellé générique quand l’adresse ne porte pas de nom de fichier', async () => {
    /**
     * Le cas réel, et il a été trouvé en regardant une adresse que le
     * propriétaire a fournie : une pièce jointe PRONOTE s'atteint par un
     * chemin qui se termine par « link », suivi d'un paramètre de session.
     * Le titre du document n'apparaît nulle part dedans.
     *
     * La première version affichait donc « link » comme nom de document, ce
     * qui est pire que muet. L'adresse ci-dessous est synthétique et porte la
     * même FORME, jamais un vrai jeton — une adresse de pièce jointe ouvre le
     * document sans demander d'identifiant.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirAvecPieces([
            'https://demo.example.invalid/pronote/FichiersExternes/JETON/link?Session=1',
          ]),
        },
        '1'
      )
    );
    const liens = liensPieces(el);
    expect(liens.length).toBe(1);
    expect(liens[0]?.textContent?.trim()).toBe('Ouvrir la pièce jointe');
    // Et surtout pas le dernier segment du chemin.
    expect(liens[0]?.textContent?.trim()).not.toBe('link');
  });

  it('lit les variantes de nom de champ qu’une intégration écrit naturellement', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirAvecPieces([
            { filename: 'par-filename.pdf', href: 'https://demo.example.invalid/a.pdf' },
            { title: 'par-title.pdf', link: 'https://demo.example.invalid/b.pdf' },
          ]),
        },
        '1'
      )
    );
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual([
      'par-filename.pdf',
      'par-title.pdf',
    ]);
    expect(liensPieces(el).length).toBe(2);
  });

  it('dérive un nom quand l’objet n’en porte pas', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirAvecPieces([{ url: 'https://demo.example.invalid/pj/sujet.pdf' }]) }, '1')
    );
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual(['sujet.pdf']);
  });

  // --- le filtre de schema ---

  it('refuse tout schéma autre que http et https, et garde le nom en texte', async () => {
    /**
     * Le point le plus important de ce bloc. Cette valeur vient du serveur et
     * atterrit dans un attribut `href` : un `javascript:` y exécuterait du
     * code dans la page Home Assistant de l'utilisateur, un `data:` y
     * servirait un document arbitraire.
     *
     * Le nom, lui, reste affiché : écarter le lien ne doit pas faire
     * disparaître l'information que le devoir porte une pièce.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirAvecPieces([
            { name: 'piege.pdf', url: 'javascript:alert(1)' },
            { name: 'donnee.pdf', url: 'data:text/html,<script></script>' },
            { name: 'relative.pdf', url: '/pronote/piece.pdf' },
          ]),
        },
        '1'
      )
    );
    expect(liensPieces(el).length).toBe(0);
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual([
      'piege.pdf',
      'donnee.pdf',
      'relative.pdf',
    ]);
    expect(el.shadowRoot?.innerHTML).not.toContain('javascript:');
  });

  it('écarte une pièce qui ne donne ni nom ni adresse utilisable', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirAvecPieces([{ url: 'javascript:alert(1)' }, {}, '', 42, null, 'vraie.pdf']),
        },
        '1'
      )
    );
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual(['vraie.pdf']);
    expect(nomGroupePieces(el)).toContain('Pièce jointe');
  });
});

describe('carte devoirs — les pièces ouvrables, adressées à part', () => {
  /**
   * L'intégration publie **deux** listes sur chaque devoir : `attachments`,
   * les noms de toutes les pièces, et `attachment_links`, les seules pièces
   * ouvrables sous la forme `{ name, url }`. Le rapprochement se fait par le
   * nom, la même chaîne des deux côtés.
   *
   * Pourquoi deux listes plutôt qu'une adresse ajoutée dans la première :
   * `attachments` porte des chaînes depuis l'origine, et y mettre des objets
   * casserait tout gabarit qui la joint par des virgules — la façon normale
   * d'écrire une notification. Le coût a été pesé contre une ligne de carte.
   *
   * Mesuré sur une instance le 10 septembre 2026 : quatre pièces ouvrables
   * sur douze, sur quatre devoirs de vingt. Les huit autres sont des fichiers,
   * dont l'adresse est un artefact de session que l'intégration ne publie
   * pas. Le cas courant reste donc la pastille muette.
   */

  it('ouvre la pièce dont le nom figure dans la liste des liens', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['Lien du cahier', 'corrige.pdf'],
            [{ name: 'Lien du cahier', url: 'https://demo.example.invalid/cahier' }]
          ),
        },
        '1'
      )
    );
    // Les deux pièces sont là, dans l'ordre de `attachments`.
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual([
      'Lien du cahier',
      'corrige.pdf',
    ]);
    // Une seule s'ouvre, et c'est celle qui a une adresse.
    const liens = liensPieces(el);
    expect(liens.length).toBe(1);
    expect(liens[0]?.textContent?.trim()).toBe('Lien du cahier');
    expect(liens[0]?.getAttribute('href')).toBe('https://demo.example.invalid/cahier');
    expect(liens[0]?.getAttribute('target')).toBe('_blank');
  });

  it('garde l’ordre de la première liste, pas celui des liens', async () => {
    /**
     * Un tri qui remonterait les pièces ouvrables ferait bouger les pastilles
     * d'un devoir à l'autre sans qu'aucun lecteur puisse le prévoir. L'ordre
     * de `attachments` est celui que PRONOTE envoie.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['a.pdf', 'ouvrable', 'b.pdf'],
            [{ name: 'ouvrable', url: 'https://demo.example.invalid/x' }]
          ),
        },
        '1'
      )
    );
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual([
      'a.pdf',
      'ouvrable',
      'b.pdf',
    ]);
    expect(liensPieces(el).length).toBe(1);
  });

  it('n’ouvre rien quand la liste des liens est vide', async () => {
    // Le cas courant, et le seul qui existait avant : une semaine sans lien
    // rend cette liste vide, ce qui n'est pas une panne.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw({ items: devoirDeuxListes(['fiche.pdf', 'schema.png'], []) }, '1')
    );
    expect(elementsPieces(el).length).toBe(2);
    expect(liensPieces(el).length).toBe(0);
    expect(nomGroupePieces(el)).toContain('Pièces jointes');
  });

  it('n’oublie pas un lien dont le nom ne figure dans aucun nom', async () => {
    /**
     * Le contrat dit que ça n'arrive pas : le nom est la même chaîne des deux
     * côtés. S'il se rompt, perdre une pièce qui s'ouvre serait le pire des
     * deux résultats — elle est donc ajoutée à la fin plutôt que jetée.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['fiche.pdf'],
            [{ name: 'orphelin.pdf', url: 'https://demo.example.invalid/o' }]
          ),
        },
        '1'
      )
    );
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual([
      'fiche.pdf',
      'orphelin.pdf',
    ]);
    expect(liensPieces(el).map((n) => n.textContent?.trim())).toEqual(['orphelin.pdf']);
  });

  it('filtre le schéma de la liste des liens comme de l’autre', async () => {
    // Cette valeur vient du serveur et atteint un attribut `href`.
    // L'intégration filtre déjà, ce verrou est le second.
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['piege.pdf'],
            [{ name: 'piege.pdf', url: 'javascript:alert(1)' }]
          ),
        },
        '1'
      )
    );
    expect(liensPieces(el).length).toBe(0);
    // Le nom reste affiché : écarter le lien ne fait pas disparaître la pièce.
    expect(elementsPieces(el).map((n) => n.textContent?.trim())).toEqual(['piege.pdf']);
    expect(el.shadowRoot?.innerHTML).not.toContain('javascript:');
  });

  it('dit pourquoi une pièce ne s’ouvre pas, au lieu de se taire', async () => {
    /**
     * Répond à une phrase du propriétaire : « les liens sur les fichiers ne
     * fonctionnent pas ». Ils ne fonctionneront jamais — l'adresse d'un
     * fichier PRONOTE est un artefact de session — et une pastille qui se
     * tait laisse croire à une panne de la carte. Elle porte donc la raison
     * au survol.
     *
     * Sur un `title` et non dans le texte visible : écrire la phrase sous
     * chaque fichier coûterait cinq lignes sur huit pièces, pour une
     * information qu'on ne lit qu'une fois. Et un `title` n'est pas une cible
     * de clic, donc il n'invite à rien.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['fichier.pdf', 'Lien'],
            [{ name: 'Lien', url: 'https://demo.example.invalid/x' }]
          ),
        },
        '1'
      )
    );
    const muette = pastillesPieces(el).find((n) => n.tagName === 'SPAN');
    expect(muette?.textContent?.trim()).toBe('fichier.pdf');
    expect(muette?.getAttribute('title')).toContain('adresse durable');
    // L'ancre, elle, ne porte pas cette phrase : elle s'ouvre.
    const ancre = liensPieces(el)[0];
    expect(ancre?.textContent?.trim()).toBe('Lien');
    expect(ancre?.getAttribute('title')).toBeNull();
  });

  it('ouvre les deux homonymes, et c’est la faiblesse assumée du contrat', async () => {
    /**
     * Signalée par l'intégration plutôt que découverte ici : le
     * rapprochement par le nom ne distingue pas deux pièces homonymes dont une
     * seule est ouvrable. Les deux deviennent des ancres vers la même adresse.
     *
     * Ce cas est épinglé **volontairement** avec le comportement actuel, et
     * non corrigé. N'ouvrir que la première serait un choix arbitraire : rien
     * ne dit que c'est elle. Ce test existe pour que la faiblesse soit connue
     * et que personne ne la « répare » au hasard — le jour où le contrat
     * portera une clé unique, il tombera, et ce sera la bonne nouvelle.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant' },
      hw(
        {
          items: devoirDeuxListes(
            ['meme-nom', 'meme-nom'],
            [{ name: 'meme-nom', url: 'https://demo.example.invalid/un' }]
          ),
        },
        '1'
      )
    );
    expect(elementsPieces(el).length).toBe(2);
    expect(liensPieces(el).length).toBe(2);
  });
});

describe('carte devoirs — l’ordre à l’intérieur d’un groupe de matière', () => {
  /**
   * Groupée par matière, la carte ne triait que sur la matière : à matière
   * égale l'ordre restait celui de l'intégration. Mesuré le 10 septembre 2026
   * sur une instance — dans un groupe de six lignes, les échéances sortaient
   * 4, 7, 8, **21**, 11, 11 septembre.
   *
   * Or c'est le seul mode où la ligne porte sa date, donc le seul où l'ordre
   * chronologique porte de l'information : on ouvre un groupe de matière pour
   * savoir ce qui tombe d'abord.
   *
   * Les fixtures ci-dessous sont **anti-chronologiques à dessein**. Le test
   * qui existait avant ne voyait rien parce que la sienne était déjà dans
   * l'ordre par coïncidence : inverser ses deux dates ne faisait rien tomber.
   * Une fixture qui se trouve juste ne prouve pas que le code trie.
   */

  it('trie par échéance à l’intérieur de chaque matière', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      hw({
        items: [
          { id: 'h1', subject: 'Maths', description: 'A', due: '2026-09-21' },
          { id: 'h2', subject: 'Anglais', description: 'B', due: '2026-09-12' },
          { id: 'h3', subject: 'Maths', description: 'C', due: '2026-09-11' },
          { id: 'h4', subject: 'Maths', description: 'D', due: '2026-09-14' },
        ],
      })
    );
    const groupes = parGroupe(el);
    expect(groupes.map((g) => g.titre)).toEqual(['Anglais', 'Maths']);
    // Le groupe Maths : 11, 14, 21 — et non 21, 11, 14 comme l'intégration
    // les envoie.
    const maths = groupes.find((g) => g.titre === 'Maths');
    expect(maths?.jours).toEqual([
      'pour le vendredi 11 septembre',
      'pour le lundi 14 septembre',
      'pour le lundi 21 septembre',
    ]);
  });

  it('place un devoir sans échéance en dernier dans sa matière', async () => {
    /**
     * `Infinity` et non zéro : un devoir sans échéance n'est pas un devoir dû
     * au premier janvier 1970. Avec zéro il ouvrirait chaque groupe, ce qui
     * est exactement l'inverse de ce qu'on veut voir en premier.
     */
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      hw({
        items: [
          { id: 'h1', subject: 'Maths', description: 'Sans échéance' },
          { id: 'h2', subject: 'Maths', description: 'Avec', due: '2026-09-11' },
        ],
      })
    );
    const enonces = Array.from(el.shadowRoot?.querySelectorAll('.row .secondary') ?? []).map(
      (n) => (n.textContent ?? '').trim()
    );
    expect(enonces).toEqual(['Avec', 'Sans échéance']);
  });

  it('range les matières selon la langue de l’instance, pas celle du navigateur', async () => {
    /**
     * `localeCompare` sans argument prend la langue du **moteur** — mesuré à
     * `fr-FR` sur l'instance — donc l'ordre dépendait du réglage de chaque
     * visiteur, et deux habitants de la maison pouvaient voir deux ordres.
     *
     * Le suédois sert de témoin **parce qu'il range autrement** : A-rond et
     * O-tréma s'y placent après le z. Mesuré : en français
     * Åke/Anglais/Örjan/Zoologie, en suédois Anglais/Zoologie/Åke/Örjan.
     *
     * C'est ce qui rend ce test contrefactuel : retirer l'argument de langue
     * rend l'ordre français et le fait tomber. Une langue dont la collation
     * coïncide avec celle du moteur n'aurait rien prouvé — c'est l'erreur que
     * j'ai commise en prenant le suédois sur des chaînes où les deux ordres
     * étaient identiques.
     */
    const matieres = [
      { id: 'h1', subject: 'Åke', description: 'A', due: '2026-09-11' },
      { id: 'h2', subject: 'Zoologie', description: 'B', due: '2026-09-11' },
      { id: 'h3', subject: 'Örjan', description: 'C', due: '2026-09-11' },
      { id: 'h4', subject: 'Anglais', description: 'D', due: '2026-09-11' },
    ];
    const suedois = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      makeHass(
        [
          {
            key: 'sensor:homework_todo',
            entity_id: 'sensor.abc_devoirs_a_faire',
            device: 'dev_enfant',
            state: '4',
            attributes: { items: matieres },
          },
        ],
        'sv'
      )
    );
    expect(parGroupe(suedois).map((g) => g.titre)).toEqual([
      'Anglais',
      'Zoologie',
      'Åke',
      'Örjan',
    ]);

    // Appariement positif : la même liste en français donne l'autre ordre,
    // donc c'est bien la langue qui décide et non un hasard de tri.
    const francais = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', group_by: 'subject' },
      hw({ items: matieres }, '4')
    );
    expect(parGroupe(francais).map((g) => g.titre)).toEqual([
      'Åke',
      'Anglais',
      'Örjan',
      'Zoologie',
    ]);
  });
});
