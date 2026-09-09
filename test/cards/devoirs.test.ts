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

  it('ne montre aucune pastille « en retard » quand homework_overdue est off', async () => {
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hw({ items }));
    expect(el.shadowRoot?.querySelectorAll('.chip.problem').length).toBe(0);
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
