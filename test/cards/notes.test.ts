import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/notes';
import { makeHass } from '../fixtures/hass';
import { mountCard, text, type MountableElement } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-notes': HTMLElement & MountableElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const grades = [
  { subject: 'Maths', grade: 14.5, out_of: 20, coefficient: 2, date: '2026-09-05' },
  { subject: 'Anglais', grade: 12, out_of: 20, coefficient: 1, date: '2026-09-06' },
];

const base = () =>
  makeHass([
    {
      key: 'sensor:overall_average',
      entity_id: 'sensor.abc_moyenne_generale',
      device: 'dev_enfant',
      state: '13,5',
      attributes: { out_of: 20 },
    },
    {
      key: 'sensor:grades',
      entity_id: 'sensor.abc_notes',
      device: 'dev_enfant',
      state: '2',
      attributes: { items: grades },
    },
    {
      key: 'sensor:averages',
      entity_id: 'sensor.abc_moyennes',
      device: 'dev_enfant',
      state: '2',
      attributes: {
        items: [{ subject: 'Maths', average: 14.2, class_average: 12.1 }],
      },
    },
  ]);

describe('carte notes', () => {
  it('affiche la moyenne générale, les dernières notes et les moyennes par matière', async () => {
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['average', 'latest', 'subjects'] },
      base()
    );
    const t = text(el);
    expect(t).toContain('13,5');
    expect(t).toContain('Maths');
    expect(t).toContain('14,5/20');
    expect(t).toContain('12,1');
  });

  it('affiche le motif quand la dernière note est une sentinelle', async () => {
    const hass = makeHass([
      {
        key: 'sensor:latest_grade',
        entity_id: 'sensor.abc_derniere_note',
        device: 'dev_enfant',
        state: 'unknown',
        attributes: { subject: 'Maths', status: 'Absent' },
      },
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    expect(text(el)).toContain('Absent');
  });

  it('dit « aucune note » sur une liste vide', async () => {
    const hass = makeHass([
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    const t = text(el);
    expect(t).toContain('Aucune note');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand tout est indisponible', async () => {
    const hass = makeHass([
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand aucune des clés requiresAny n'existe", async () => {
    const el = await mountCard('pronote-ng-notes', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('introuvable');
  });

  it("n'expose aucune option de période", () => {
    // La résolution ne sait pas distinguer deux périodes closes (spec §4.1).
    // Ce test échoue si quelqu'un réintroduit l'option sans traiter le fond.
    expect(SPEC.schema({ type: 'x' }).map((f) => f.name)).not.toContain('period');
  });
});
