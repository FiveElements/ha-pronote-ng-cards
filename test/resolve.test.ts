import { describe, expect, it } from 'vitest';
import { isChildDevice, resolveDevice, resolveEntities } from '../src/core/resolve';
import { makeHass } from './fixtures/hass';

const enfant = (key: string, entity_id: string, extra = {}) =>
  ({ key, entity_id, device: 'dev_enfant' as const, ...extra });

describe('resolveDevice', () => {
  it("rend l'appareil lui-même pour une carte d'enfant", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_enfant', 'child')).toBe('dev_enfant');
  });

  it("suit via_device_id pour une carte de compte", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_enfant', 'account')).toBe('dev_compte');
  });

  it("rend l'appareil lui-même si une carte de compte reçoit déjà le compte", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_compte', 'account')).toBe('dev_compte');
  });

  it('rend undefined pour un appareil inconnu', () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_absent', 'child')).toBeUndefined();
  });
});

describe('isChildDevice', () => {
  it("distingue l'enfant du compte par via_device_id", () => {
    const hass = makeHass([]);
    expect(isChildDevice(hass, 'dev_enfant')).toBe(true);
    expect(isChildDevice(hass, 'dev_compte')).toBe(false);
  });
});

describe('resolveEntities', () => {
  it('résout une clé par translation_key sur le bon appareil', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.get('sensor:next_lesson')).toBe('sensor.abc_prochain_cours');
  });

  it('distingue deux domaines partageant le même translation_key', () => {
    const hass = makeHass([
      enfant('sensor:homework', 'sensor.abc_devoirs'),
      enfant('calendar:homework', 'calendar.abc_devoirs'),
      enfant('todo:homework', 'todo.abc_devoirs'),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', [
      'sensor:homework',
      'calendar:homework',
      'todo:homework',
    ]);
    expect(r.get('sensor:homework')).toBe('sensor.abc_devoirs');
    expect(r.get('calendar:homework')).toBe('calendar.abc_devoirs');
    expect(r.get('todo:homework')).toBe('todo.abc_devoirs');
  });

  it('ignore une entité d’une autre intégration sur le même appareil', () => {
    const hass = makeHass([
      enfant('sensor:next_lesson', 'sensor.autre_prochain_cours', { platform: 'autre' }),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.has('sensor:next_lesson')).toBe(false);
  });

  it("n'invente rien quand la clé est absente", () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:menu_today']);
    expect(r.has('sensor:menu_today')).toBe(false);
  });

  it('résout les entités de compte depuis un device_id d’enfant', () => {
    const hass = makeHass([
      { key: 'sensor:limiter_state', entity_id: 'sensor.cpt_etat', device: 'dev_compte' },
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'account', ['sensor:limiter_state']);
    expect(r.get('sensor:limiter_state')).toBe('sensor.cpt_etat');
  });

  it('la surcharge explicite prime sur la résolution', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'sensor.surcharge',
    });
    expect(r.get('sensor:next_lesson')).toBe('sensor.surcharge');
  });

  it('la surcharge fonctionne sans device_id', () => {
    const hass = makeHass([]);
    const r = resolveEntities(hass, undefined, 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'sensor.surcharge',
    });
    expect(r.get('sensor:next_lesson')).toBe('sensor.surcharge');
  });

  it('résout une entité au registre mais non chargée dans la machine à états', () => {
    const hass = makeHass([
      enfant('sensor:next_lesson', 'sensor.abc_prochain_cours', { unloaded: true }),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.get('sensor:next_lesson')).toBe('sensor.abc_prochain_cours');
  });

  it('ne sait pas distinguer deux entités qui partagent domaine et clé', () => {
    // L'intégration crée une entité par période close, toutes avec le même
    // translation_key sur le même appareil. La résolution en rend une, sans
    // moyen de choisir laquelle — c'est pourquoi aucune carte n'expose
    // d'option de période (spec §4.1).
    const hass = makeHass([
      enfant('sensor:grades_period', 'sensor.abc_notes_p1'),
      enfant('sensor:grades_period', 'sensor.abc_notes_p2'),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:grades_period']);
    expect(['sensor.abc_notes_p1', 'sensor.abc_notes_p2']).toContain(
      r.get('sensor:grades_period')
    );
  });
});
