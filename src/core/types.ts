import type { TemplateResult } from 'lit';
import type { HaFormSchema, HassEntity, HomeAssistant } from './ha-types';

/** Clé d'entité qualifiée par son domaine : 'sensor:next_lesson', 'todo:homework'. */
export type EntityKey = `${string}:${string}`;

/** Les trois états que toute carte doit distinguer (spec §4.3). */
export type EntityStatus = 'missing' | 'unavailable' | 'ok';

export type CardScope = 'child' | 'account';

export interface PronoteCardConfig {
  type: string;
  device_id?: string;
  title?: string;
  /** Surcharge de résolution, clé qualifiée → entity_id. Jamais nécessaire au cas nominal. */
  entities?: Record<string, string>;
  [option: string]: unknown;
}

export interface RenderCtx<C extends PronoteCardConfig = PronoteCardConfig> {
  hass: HomeAssistant;
  config: C;
  /** Nom affiché de l'appareil résolu. Jamais un nom codé en dur. */
  deviceName: string;
  entityId(key: EntityKey): string | undefined;
  entity(key: EntityKey): HassEntity | undefined;
  status(key: EntityKey): EntityStatus;
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- `T` est une commodité d'écriture pour lire un attribut d'entité Home Assistant, qui n'est typé nulle part : ce n'est pas une garantie de type, l'appelant reste responsable de ce qu'il annonce.
  attr<T = unknown>(key: EntityKey, name: string): T | undefined;
  /** Chaîne localisée depuis src/localize. */
  t(path: string, vars?: Record<string, string | number>): string;
  /** Seul service appelable. Ne place aucun appel réseau PRONOTE : relève une priorité. */
  refresh(tier?: string): Promise<void>;
  /** Vrai pendant l'intervalle de garde suivant un refresh (spec §4.5). */
  refreshCoolingDown: boolean;
}

export interface CardSpec<C extends PronoteCardConfig = PronoteCardConfig> {
  /** Nom de l'élément personnalisé, sans le préfixe 'custom:'. */
  type: string;
  name: string;
  description: string;
  scope: CardScope;
  /** Toutes obligatoires. Fonction de la config : `range` et `period` changent les clés. */
  requires(config: C): EntityKey[];
  /** Au moins une doit être résolue. Vide si sans objet. */
  requiresAny?(config: C): EntityKey[];
  optional(config: C): EntityKey[];
  schema(config: C): HaFormSchema[];
  /** Config par défaut proposée par l'éditeur de tableau de bord. */
  stub?: Partial<C>;
  size?: number;
  render(ctx: RenderCtx<C>): TemplateResult;
}
