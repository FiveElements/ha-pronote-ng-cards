import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/prochain-cours';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-prochain-cours': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const lesson = (state: string, attributes: Record<string, unknown> = {}) =>
  makeHass([
    {
      key: 'sensor:next_lesson',
      entity_id: 'sensor.abc_prochain_cours',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte prochain-cours', () => {
  it('affiche matière, heure, salle et professeur', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', {
      subject: 'Mathématiques',
      classroom: 'B204',
      teachers: ['M. Dupont'],
      canceled: false,
    });
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('Mathématiques');
    expect(t).toContain('08:30');
    expect(t).toContain('B204');
    expect(t).toContain('M. Dupont');
  });

  it('accepte teachers en chaîne comme en tableau', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', {
      subject: 'Histoire',
      teachers: 'Mme Martin',
    });
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('Mme Martin');
  });

  it('signale un cours annulé sans le masquer', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', { subject: 'Anglais', canceled: true });
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('Anglais');
    expect(t).toContain('annulé');
  });

  it('dit « aucun cours à venir » quand l’entité ne porte pas d’horodatage exploitable', async () => {
    // L'intégration expose 'none' — distinct de 'unknown'/'unavailable', qui
    // restent du ressort du socle — quand il n'y a plus de cours à venir.
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, lesson('none'));
    expect(text(el)).toContain('Aucun cours à venir');
  });

  it('affiche la matière malgré un état non parsable, sans effacer les attributs', async () => {
    // `parseTimestamp` rend `undefined` pour toute chaîne que `new Date()`
    // refuse, pas seulement pour 'none' : un format local ou un libellé de
    // l'intégration ne doit pas effacer matière/salle/professeur.
    const hass = lesson('Lundi 8h30', {
      subject: 'Mathématiques',
      classroom: 'B204',
      teachers: ['M. Dupont'],
    });
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('Mathématiques');
    expect(t).toContain('B204');
    expect(t).toContain('M. Dupont');
    expect(t).not.toContain('Aucun cours à venir');
  });

  it('affiche la plage horaire de début et de fin quand `end` est présent', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', {
      subject: 'Mathématiques',
      end: '2026-09-08T09:25:00+02:00',
    });
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('08:30');
    expect(t).toContain('09:25');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, lesson('unavailable'));
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » et nomme la clé quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, makeHass([]));
    const t = text(el);
    expect(t).toContain('sensor:next_lesson');
    expect(t).toContain('introuvable');
  });

  it('affiche le réveil et la fin des cours quand les options sont activées', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
        attributes: { subject: 'SVT' },
      },
      {
        key: 'sensor:next_wake_up',
        entity_id: 'sensor.abc_reveil',
        device: 'dev_enfant',
        state: '2026-09-08T07:00:00+02:00',
      },
      {
        key: 'sensor:end_of_lessons',
        entity_id: 'sensor.abc_fin_cours',
        device: 'dev_enfant',
        state: '2026-09-08T17:00:00+02:00',
      },
    ]);
    const el = await mountCard(
      'pronote-ng-prochain-cours',
      { device_id: 'dev_enfant', show_wake_up: true, show_end_of_day: true },
      hass
    );
    const t = text(el);
    expect(t).toContain('07:00');
    expect(t).toContain('17:00');
  });

  it("n'affiche aucune ligne de prochain contrôle quand l'option est absente", async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
        attributes: { subject: 'SVT' },
      },
      {
        key: 'sensor:next_test',
        entity_id: 'sensor.abc_prochain_controle',
        device: 'dev_enfant',
        state: '2026-09-15T09:00:00+02:00',
      },
    ]);
    const el = await mountCard('pronote-ng-prochain-cours', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).not.toContain('Prochain contrôle');
  });

  it("n'affiche aucune ligne de prochain contrôle quand l'option est active mais l'entité introuvable", async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
        attributes: { subject: 'SVT' },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-prochain-cours',
      { device_id: 'dev_enfant', show_next_test: true },
      hass
    );
    const t = text(el);
    // L'entité optionnelle absente ne doit jamais produire un message
    // d'erreur : la ligne est simplement omise (spec « les trois états »).
    expect(t).not.toContain('Prochain contrôle');
    expect(t).not.toContain('introuvable');
    expect(t).toContain('SVT');
  });

  it('affiche le prochain contrôle avec son jour et son heure quand il est résolu', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
        attributes: { subject: 'SVT' },
      },
      {
        key: 'sensor:next_test',
        entity_id: 'sensor.abc_prochain_controle',
        device: 'dev_enfant',
        state: '2026-09-15T09:00:00+02:00',
      },
    ]);
    const el = await mountCard(
      'pronote-ng-prochain-cours',
      { device_id: 'dev_enfant', show_next_test: true },
      hass
    );
    const t = text(el);
    expect(t).toContain('Prochain contrôle');
    expect(t).toContain('09:00');
    expect(t).toContain('mardi');
  });
});
