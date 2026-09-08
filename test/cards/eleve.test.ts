import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/eleve';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';
import type { MountableElement } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-eleve': HTMLElement & MountableElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const base = (
  attributes: Record<string, unknown> = {},
  state = '4e B',
  extra: Parameters<typeof makeHass>[0] = []
) =>
  makeHass([
    {
      key: 'sensor:class_name',
      entity_id: 'sensor.abc_classe',
      device: 'dev_enfant',
      state,
      attributes,
    },
    ...extra,
  ]);

describe('carte eleve', () => {
  it("affiche le nom de l'appareil et la classe", async () => {
    const el = await mountCard('pronote-ng-eleve', { device_id: 'dev_enfant' }, base());
    const t = text(el);
    expect(t).toContain('Enfant'); // nom de l'appareil dans la fixture
    expect(t).toContain('4e B');
  });

  it("n'affiche pas l'établissement par défaut", async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant' },
      base({ establishment: 'Établissement synthétique' })
    );
    expect(text(el)).not.toContain('Établissement synthétique');
  });

  it("affiche l'établissement uniquement si l'option est activée", async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant', show_establishment: true },
      base({ establishment: 'Établissement synthétique' })
    );
    expect(text(el)).toContain('Établissement synthétique');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant' },
      base({}, 'unavailable')
    );
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-eleve', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:class_name');
  });

  it('affiche « En cours » et signale le prochain cours et la période', async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant' },
      base({}, '4e B', [
        {
          key: 'binary_sensor:in_class',
          entity_id: 'binary_sensor.abc_en_cours',
          device: 'dev_enfant',
          state: 'on',
        },
        {
          key: 'sensor:next_lesson',
          entity_id: 'sensor.abc_prochain_cours',
          device: 'dev_enfant',
          state: '2026-09-09T14:00:00+02:00',
          attributes: { subject: 'Histoire' },
        },
        {
          key: 'sensor:current_period',
          entity_id: 'sensor.abc_periode',
          device: 'dev_enfant',
          state: 'Trimestre 1',
        },
      ])
    );
    const t = text(el);
    expect(t).toContain('En cours');
    expect(t).toContain('Histoire');
    expect(t).toContain('Trimestre 1');
  });

  it('affiche « Vacances » quand le capteur binaire correspondant est actif', async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant' },
      base({}, '4e B', [
        {
          key: 'binary_sensor:holidays',
          entity_id: 'binary_sensor.abc_vacances',
          device: 'dev_enfant',
          state: 'on',
        },
      ])
    );
    expect(text(el)).toContain('Vacances');
  });

  it("n'affiche aucune photo par défaut, même si l'entité image est disponible", async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant' },
      base({}, '4e B', [
        {
          key: 'image:photo',
          entity_id: 'image.abc_photo',
          device: 'dev_enfant',
          state: '2026-09-08T07:00:00+00:00',
          attributes: { entity_picture: '/api/image_proxy/image.abc_photo' },
        },
      ])
    );
    expect(el.shadowRoot?.querySelector('img.photo')).toBeNull();
  });

  it("affiche l'entity_picture de l'entité image uniquement si show_photo est activé", async () => {
    const el = await mountCard(
      'pronote-ng-eleve',
      { device_id: 'dev_enfant', show_photo: true },
      base({}, '4e B', [
        {
          key: 'image:photo',
          entity_id: 'image.abc_photo',
          device: 'dev_enfant',
          state: '2026-09-08T07:00:00+00:00',
          attributes: { entity_picture: '/api/image_proxy/image.abc_photo' },
        },
      ])
    );
    const img = el.shadowRoot?.querySelector('img.photo');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/api/image_proxy/image.abc_photo');
  });
});
