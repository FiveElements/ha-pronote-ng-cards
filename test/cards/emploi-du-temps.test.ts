import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/emploi-du-temps';
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

const lessons = [
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
  {
    subject: 'Histoire',
    start: '2026-09-08T10:00:00+02:00',
    end: '2026-09-08T11:00:00+02:00',
    test: true,
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
  it('liste les cours par ordre chronologique avec heure et salle', async () => {
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
  });

  it('barre un cours annulé sans le retirer', async () => {
    const el = await mountCard('pronote-ng-emploi-du-temps', { device_id: 'dev_enfant' }, day({ lessons }));
    expect(text(el)).toContain('Anglais');
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
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', now: '2026-09-08T08:30:00+02:00' },
      day({ lessons })
    );
    expect(text(el)).toContain('en cours');
  });

  it('ne marque aucun créneau hors des heures de cours', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', now: '2026-09-08T18:00:00+02:00' },
      day({ lessons })
    );
    expect(text(el)).not.toContain('en cours');
  });

  it('change de clé selon range', async () => {
    const hass = makeHass([
      {
        key: 'sensor:timetable_week',
        entity_id: 'sensor.abc_edt_semaine',
        device: 'dev_enfant',
        state: '1',
        attributes: { lessons: [lessons[0]] },
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
