import type {
  DeviceRegistryEntry,
  EntityRegistryDisplayEntry,
  HassEntity,
  HomeAssistant,
} from '../../src/core/ha-types';

export interface EntitySpec {
  /** Clé qualifiée, ex. 'sensor:next_lesson'. */
  key: string;
  /** Identifiant complet. Synthétique — jamais un identifiant réel. */
  entity_id: string;
  device: 'dev_enfant' | 'dev_compte';
  state?: string;
  attributes?: Record<string, unknown>;
  platform?: string;
  /** Si vrai, l'entité est au registre mais absente de hass.states. */
  unloaded?: boolean;
}

export function makeHass(entities: EntitySpec[] = [], language = 'fr'): HomeAssistant {
  const devices: Record<string, DeviceRegistryEntry> = {
    dev_compte: {
      id: 'dev_compte',
      name: 'Compte Pronote',
      name_by_user: null,
      manufacturer: 'Pronote NG',
      model: 'Compte',
      via_device_id: null,
      area_id: null,
      config_entries: ['entry_1'],
      identifiers: [['pronote_ng', 'compte']],
    },
    dev_enfant: {
      id: 'dev_enfant',
      name: 'Enfant',
      name_by_user: null,
      manufacturer: 'Pronote NG',
      model: 'Élève',
      via_device_id: 'dev_compte',
      area_id: null,
      config_entries: ['entry_1'],
      identifiers: [['pronote_ng', 'enfant']],
    },
  };

  const registry: Record<string, EntityRegistryDisplayEntry> = {};
  const states: Record<string, HassEntity> = {};

  for (const e of entities) {
    const [, tk] = e.key.split(':');
    registry[e.entity_id] = {
      entity_id: e.entity_id,
      device_id: e.device,
      labels: [],
      platform: e.platform ?? 'pronote_ng',
      translation_key: tk,
      has_entity_name: true,
    };
    if (!e.unloaded) {
      states[e.entity_id] = {
        entity_id: e.entity_id,
        state: e.state ?? 'unknown',
        attributes: e.attributes ?? {},
        last_changed: '2026-09-08T07:00:00+00:00',
        last_updated: '2026-09-08T07:00:00+00:00',
      };
    }
  }

  return {
    states,
    entities: registry,
    devices,
    language,
    locale: { language, time_zone: 'Europe/Paris' },
    callService: async () => undefined,
  };
}
