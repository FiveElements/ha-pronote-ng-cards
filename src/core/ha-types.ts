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
  /**
   * L'adresse de l'instance, **et pas celle de la page**.
   *
   * La distinction n'est pas théorique : le tableau de bord Cast est servi
   * depuis une origine tierce et parle à Home Assistant par WebSocket.
   * L'origine du document n'y est donc pas celle de l'instance, et une carte
   * qui résoudrait un chemin d'API contre la page enverrait la requête —
   * jeton compris — chez ce tiers.
   *
   * Optionnel exprès : un contexte de rendu peut ne pas la fournir, et le
   * repli correct est alors de **refuser** le chemin, jamais de deviner une
   * base. `hass.auth.data.hassUrl` porte la même valeur, mais cet objet
   * contient aussi les jetons de session : une carte n'a rien à y chercher.
   */
  hassUrl?: (path?: string) => string;
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
