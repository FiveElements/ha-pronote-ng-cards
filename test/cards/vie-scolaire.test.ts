import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/vie-scolaire';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';
import type { MountableElement } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-vie-scolaire': HTMLElement & MountableElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const full = () =>
  makeHass([
    {
      key: 'sensor:absences',
      entity_id: 'sensor.abc_absences',
      device: 'dev_enfant',
      state: '1',
      attributes: {
        items: [
          { from_date: '2026-09-01', to_date: '2026-09-01', hours: 2, justified: false },
        ],
      },
    },
    {
      key: 'sensor:delays',
      entity_id: 'sensor.abc_retards',
      device: 'dev_enfant',
      state: '1',
      attributes: { items: [{ date: '2026-09-02', minutes: 10, justified: true }] },
    },
    {
      key: 'sensor:punishments',
      entity_id: 'sensor.abc_punitions',
      device: 'dev_enfant',
      state: '1',
      attributes: { items: [{ nature: 'Retenue', giver: 'M. Dupont', duration: 60 }] },
    },
  ]);

describe('carte vie-scolaire', () => {
  it('affiche absences, retards et punitions', async () => {
    const el = await mountCard('pronote-ng-vie-scolaire', { device_id: 'dev_enfant' }, full());
    const t = text(el);
    expect(t).toContain('Absences');
    expect(t).toContain('non justifiée');
    expect(t).toContain('Retards');
    expect(t).toContain('Punitions');
    expect(t).toContain('Retenue');
  });

  it('signale une absence en cours', async () => {
    const hass = full();
    hass.entities['binary_sensor.abc_absence_en_cours'] = {
      entity_id: 'binary_sensor.abc_absence_en_cours',
      device_id: 'dev_enfant',
      labels: [],
      platform: 'pronote_ng',
      translation_key: 'absence_in_progress',
    };
    hass.states['binary_sensor.abc_absence_en_cours'] = {
      entity_id: 'binary_sensor.abc_absence_en_cours',
      state: 'on',
      attributes: {},
      last_changed: '2026-09-08T07:00:00+00:00',
      last_updated: '2026-09-08T07:00:00+00:00',
    };
    const el = await mountCard('pronote-ng-vie-scolaire', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('Absence en cours');
  });

  it('respecte limit', async () => {
    const hass = makeHass([
      {
        key: 'sensor:absences',
        entity_id: 'sensor.abc_absences',
        device: 'dev_enfant',
        state: '2',
        attributes: {
          items: [
            { from_date: '2026-09-01', to_date: '2026-09-01', hours: 2, justified: false },
            { from_date: '2026-09-05', to_date: '2026-09-05', hours: 1, justified: true },
          ],
        },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-vie-scolaire',
      { device_id: 'dev_enfant', limit: 1 },
      hass
    );
    const t = text(el);
    expect(t).toContain('2026-09-05');
    expect(t).not.toContain('2026-09-01');
  });

  it('restreint aux blocs choisis via sections', async () => {
    const el = await mountCard(
      'pronote-ng-vie-scolaire',
      { device_id: 'dev_enfant', sections: ['punishments'] },
      full()
    );
    const t = text(el);
    expect(t).toContain('Punitions');
    expect(t).not.toContain('Absences');
    expect(t).not.toContain('Retards');
  });

  it('dit « rien à signaler » quand toutes les listes sont vides', async () => {
    const hass = makeHass([
      {
        key: 'sensor:absences',
        entity_id: 'sensor.abc_absences',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard('pronote-ng-vie-scolaire', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('Rien à signaler');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand tout est indisponible', async () => {
    const hass = makeHass([
      {
        key: 'sensor:absences',
        entity_id: 'sensor.abc_absences',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard('pronote-ng-vie-scolaire', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand aucune clé n'existe", async () => {
    const el = await mountCard('pronote-ng-vie-scolaire', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('introuvable');
  });
});
