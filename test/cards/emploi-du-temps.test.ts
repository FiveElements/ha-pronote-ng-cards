import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC, testClock } from '../../src/cards/emploi-du-temps';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-emploi-du-temps': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

// Réinitialisé avant chaque test : `testClock` est une variable de module
// partagée entre tous les tests de ce fichier — sans cette remise à zéro, un
// test qui ne fixe pas `now` hériterait de la valeur laissée par le test
// précédent.
beforeEach(() => {
  testClock.now = undefined;
});

const lessons = [
  // Volontairement dans le désordre : un tri qui recevrait des cours déjà
  // triés en entrée passerait même sans aucun `sort`.
  {
    subject: 'Histoire',
    start: '2026-09-08T10:00:00+02:00',
    end: '2026-09-08T11:00:00+02:00',
    test: true,
  },
  {
    subject: 'Maths',
    start: '2026-09-08T08:00:00+02:00',
    end: '2026-09-08T09:00:00+02:00',
    classroom: 'B204',
    teachers: ['M. Dupont'],
    canceled: false,
  },
  {
    subject: 'Anglais',
    start: '2026-09-08T09:00:00+02:00',
    end: '2026-09-08T10:00:00+02:00',
    classroom: 'A101',
    canceled: true,
  },
];

const day = (attributes: Record<string, unknown>, state = '3') =>
  makeHass([
    {
      key: 'sensor:lessons_today',
      entity_id: 'sensor.abc_cours_du_jour',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte emploi-du-temps', () => {
  it('liste les cours par ordre chronologique avec heure et salle, quel que soit leur ordre en entrée', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', show_rooms: true },
      day({ lessons })
    );
    const t = text(el);
    expect(t).toContain('08:00');
    expect(t).toContain('Maths');
    expect(t).toContain('B204');
    expect(t.indexOf('Maths')).toBeLessThan(t.indexOf('Anglais'));
    expect(t.indexOf('Anglais')).toBeLessThan(t.indexOf('Histoire'));
  });

  it('trie sur l’instant réel, pas sur la chaîne, quand deux créneaux mêlent des décalages horaires', async () => {
    const mixed = [
      // Exprimé en Z : le premier chiffre d'heure ('07') semble « petit »,
      // alors que l'instant réel (07:00 UTC = 09:00 heure de Paris) est le
      // plus tardif des deux.
      {
        subject: 'Anglais',
        start: '2026-09-08T07:00:00Z',
        end: '2026-09-08T08:00:00Z',
      },
      // Exprimé avec son décalage : chaîne lexicographiquement « plus
      // grande » ('08'), pourtant l'instant le plus tôt (06:00 UTC).
      {
        subject: 'Maths',
        start: '2026-09-08T08:00:00+02:00',
        end: '2026-09-08T09:00:00+02:00',
      },
    ];
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({ lessons: mixed })
    );
    const t = text(el);
    expect(t.indexOf('Maths')).toBeLessThan(t.indexOf('Anglais'));
  });

  it('barre un cours annulé sans le retirer', async () => {
    const el = await mountCard('pronote-ng-emploi-du-temps', { device_id: 'dev_enfant' }, day({ lessons }));
    expect(text(el)).toContain('Anglais');
    expect(el.shadowRoot?.querySelector('.canceled')).not.toBeNull();
  });

  it('signale un cours annulé via `status` même sans `canceled`', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({
        lessons: [
          {
            subject: 'SVT',
            start: '2026-09-08T08:00:00+02:00',
            end: '2026-09-08T09:00:00+02:00',
            status: 'Cours annulé',
          },
        ],
      })
    );
    const t = text(el);
    expect(t).toContain('SVT');
    expect(t).toContain('annulé');
    expect(el.shadowRoot?.querySelector('.canceled')).not.toBeNull();
  });

  it('signale les contrôles', async () => {
    const el = await mountCard('pronote-ng-emploi-du-temps', { device_id: 'dev_enfant' }, day({ lessons }));
    expect(text(el)).toContain('contrôle');
  });

  it('dit « aucun cours » sur une liste vide', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({ lessons: [] }, '0')
    );
    const t = text(el);
    expect(t).toContain('Aucun cours');
    expect(t).not.toContain('pas encore collectée');
  });

  it.each([
    ['un objet', {}],
    ['un tableau à trous', [null]],
  ])(
    'ignore un attribut `lessons` qui est %s plutôt qu’un tableau exploitable, sans faire disparaître la carte',
    async (_label, malformed) => {
      const el = await mountCard(
        'pronote-ng-emploi-du-temps',
        { device_id: 'dev_enfant' },
        day({ lessons: malformed }, '1')
      );
      // Ni exception (qui effacerait la carte), ni écran vide muet : le
      // message « aucun cours » reste affiché.
      expect(text(el)).toContain('Aucun cours');
    }
  );

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({}, 'unavailable')
    );
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-emploi-du-temps', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:lessons_today');
  });

  it('marque « en cours » le créneau qui contient l’instant donné', async () => {
    testClock.now = '2026-09-08T08:30:00+02:00';
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({ lessons })
    );
    expect(text(el)).toContain('en cours');
  });

  it('ne marque aucun créneau hors des heures de cours, tout en affichant bien les cours du jour', async () => {
    testClock.now = '2026-09-08T18:00:00+02:00';
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant' },
      day({ lessons })
    );
    const t = text(el);
    expect(t).not.toContain('en cours');
    // Assertion positive : un rendu entièrement cassé (liste vide, carte
    // disparue) passerait aussi le test s'il ne portait que sur l'absence.
    expect(t).toContain('Maths');
    expect(t).toContain('Histoire');
  });

  it('change de clé selon range', async () => {
    const hass = makeHass([
      {
        key: 'sensor:timetable_week',
        entity_id: 'sensor.abc_edt_semaine',
        device: 'dev_enfant',
        state: '1',
        attributes: { lessons: [lessons[1]] },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', range: 'week' },
      hass
    );
    expect(text(el)).toContain('Maths');
  });
});
