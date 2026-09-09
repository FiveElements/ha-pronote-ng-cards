export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: 'config' | 'diagnostic';
  translation_key?: string;
  platform?: string;
  display_precision?: number;
  has_entity_name?: boolean;
}

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  manufacturer: string | null;
  model: string | null;
  via_device_id: string | null;
  area_id: string | null;
  config_entries: string[];
  identifiers: [string, string][];
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  language: string;
  /**
   * `locale.time_zone` n'est **pas** un identifiant IANA : c'est une
   * préférence d'affichage, `'local'` (le fuseau du navigateur) ou
   * `'server'` (celui de l'instance, qui vit dans `config.time_zone`).
   * Le passer tel quel à `Intl.DateTimeFormat` lève une `RangeError` —
   * voir `resolveTimeZone` dans `base-card.ts`.
   */
  locale: { language: string; time_zone: string };
  /** Absent de certains contextes de rendu (aperçu d'éditeur) : à traiter comme optionnel. */
  config?: { time_zone?: string };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown>;
}

export type HaFormSchema = {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
};
