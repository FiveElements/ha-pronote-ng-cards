import { html, nothing, type TemplateResult } from 'lit';
import type { Translate } from '../types';

export type Tone = 'neutral' | 'ok' | 'warn' | 'problem';

export const chip = (label: string, tone: Tone = 'neutral'): TemplateResult =>
  html`<span class="chip ${tone === 'neutral' ? '' : tone}">${label}</span>`;

/** État « vide » : l'information EST le vide. Message fourni par la carte. */
export const emptyState = (message: string): TemplateResult =>
  html`<div class="notice">${message}</div>`;

/** État « indisponible » : transitoire, pas une erreur. */
export const unavailableState = (t: Translate): TemplateResult =>
  html`<div class="notice">${t('common.unavailable')}</div>`;

/** État « entité absente » : demande une action de l'utilisateur. */
export const missingState = (keys: readonly string[], t: Translate): TemplateResult => html`
  <div class="notice problem">
    ${t('common.missing_body')}
    ${keys.map((k) => html`<code>${k}</code> `)}
  </div>
  <div class="notice">${t('common.missing_hint')}</div>
`;

/**
 * État « la carte a levé » : dernier filet, jamais un état normal.
 *
 * Sans lui, une exception dans `render()` laisse la racine d'ombre vide et la
 * carte disparaît de la page sans un mot — c'est exactement ce qui est arrivé
 * sur une instance réelle, sur deux cartes à la fois. Un message visible vaut
 * mieux qu'un trou dans le tableau de bord.
 */
export const errorState = (t: Translate): TemplateResult =>
  html`<div class="notice problem">${t('common.render_error')}</div>`;

export interface RowOptions {
  primary: string | TemplateResult;
  secondary?: string | TemplateResult;
  trailing?: string | TemplateResult;
  canceled?: boolean;
  /**
   * L'accent de couleur de la matière, et ses **trois** valeurs.
   *
   * - `undefined` : cette liste n'est pas codée par couleur. Aucune gouttière,
   *   aucun décalage — le rendu est exactement celui d'avant l'introduction de
   *   l'accent. C'est le cas du limiteur, de la cantine, de la vie scolaire et
   *   de l'élève, dont les lignes ne portent pas de matière.
   * - `null` : cette liste **est** codée par couleur, mais cette ligne-ci n'a
   *   pas de couleur exploitable. La gouttière est réservée, transparente.
   *   Sans ce troisième cas, un créneau sans couleur s'alignerait trois pixels
   *   à gauche de son voisin coloré, et ce décalage se lirait comme un défaut
   *   d'affichage plutôt que comme une absence de donnée.
   * - une couleur : la gouttière la prend.
   *
   * La valeur doit avoir traversé `subjectColor` : elle finit dans un attribut
   * `style`, où une chaîne de serveur non filtrée permettrait d'ajouter des
   * propriétés CSS arbitraires.
   */
  accent?: string | null;
  /**
   * L'autre placement de la couleur de matière : un filet **pleine hauteur**
   * posé entre l'intitulé et le contenu, qui sépare l'un de l'autre. C'est
   * celui des devoirs.
   *
   * Deux placements et non un réglage, parce que les deux ne disent pas la
   * même chose. La gouttière de `accent` borde la ligne entière : elle
   * qualifie la ligne. Ce filet-ci coupe la ligne en deux et se lit comme une
   * séparation entre la matière et ce qu'il y a à faire.
   *
   * Pas de troisième cas ici, contrairement à `accent` : une ligne sans
   * couleur n'a pas de filet, et rien ne se décale puisque la mise en page
   * est un flux et non une grille à colonnes fixes.
   *
   * Comme `accent`, la valeur doit avoir traversé `subjectColor` : elle finit
   * dans un attribut `style`.
   */
  divider?: string;
}

export const listRow = (o: RowOptions): TemplateResult => html`
  <div
    class="row ${o.canceled ? 'canceled' : ''} ${o.accent === undefined ? '' : 'accented'}"
    style=${typeof o.accent === 'string' ? `--pronote-subject-color: ${o.accent}` : nothing}
  >
    <span class="primary">${o.primary}</span>
    ${o.divider === undefined
      ? ''
      : html`<span
          class="filet-matiere"
          style=${`--pronote-subject-color: ${o.divider}`}
        ></span>`}
    ${o.secondary ? html`<span class="secondary">${o.secondary}</span>` : ''}
    ${o.trailing ? html`<span class="trailing">${o.trailing}</span>` : ''}
  </div>
`;
