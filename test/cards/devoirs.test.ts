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
  { id: 'h2', subject: 'Anglais', description: 'Lire le chapitre 3', due: '2026-09-10', done: false },
];

const hw = (attributes: Record<string, unknown>, state = '2', extra: Parameters<typeof makeHass>[0] = []) =>
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

describe('carte devoirs', () => {
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

  it("ne rend aucune case à cocher si l'écriture n'est pas activée", async () => {
    const hass = hw({ items }, '2', [
      {
        key: 'todo:homework',
        entity_id: 'todo.abc_devoirs',
        device: 'dev_enfant',
        state: '2',
        attributes: { supported_features: 0 },
      },
    ]);
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    expect(el.shadowRoot?.querySelector('input[type=checkbox]')).toBeNull();
  });

  it("rend les cases et appelle todo.update_item quand l'écriture est activée", async () => {
    const hass = hw({ items }, '2', [
      {
        key: 'todo:homework',
        entity_id: 'todo.abc_devoirs',
        device: 'dev_enfant',
        state: '2',
        attributes: { supported_features: 2 },
      },
    ]);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard('pronote-ng-devoirs', { device_id: 'dev_enfant' }, hass);
    // Le sélecteur simple 'input' correspond à l'overload typé de
    // `querySelector` (HTMLInputElement | null) : pas besoin de conversion.
    const box = el.shadowRoot?.querySelector('input');
    expect(box).not.toBeNull();
    box?.click();
    expect(spy).toHaveBeenCalledWith(
      'todo',
      'update_item',
      expect.objectContaining({ status: 'completed' }),
      expect.objectContaining({ entity_id: 'todo.abc_devoirs' })
    );
  });
});
