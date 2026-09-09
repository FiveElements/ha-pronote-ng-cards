import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatTime, parseTimestamp } from '../core/format';
import { chip, emptyState } from '../core/ui/parts';
import { listAttr, sortedBy } from '../core/list';
import { isCanceled, statusLabel, type Lesson } from '../core/lesson';
import { subjectColor } from '../core/subject-color';

/**
 * La journée en grille : une colonne d'horaires, un filet de couleur, la
 * matière.
 *
 * C'est un portage d'apparence de l'ancienne carte `lovelace-pronote`, sur la
 * **journée courante uniquement** — pas de sélecteur de semaine, pas de
 * défilement jour par jour. La carte emploi du temps couvre déjà ces deux
 * besoins, et deux cartes qui font la même chose autrement sont deux cartes
 * qu'on maintient mal.
 *
 * Cinq éléments constituent le seuil d'acceptation, nommés par l'utilisateur :
 * l'heure de début **et** de fin, le filet de couleur, l'intitulé de matière,
 * le barré avec sa pastille sur un cours annulé, et la zone repas. Le reste
 * (la salle, la mise en avant du cours en cours) est du confort et se
 * configure.
 */

interface Config extends PronoteCardConfig {
  /**
   * Table matière → couleur, renseignée par l'utilisateur.
   *
   * C'est le **deuxième** rang de couleur, et aujourd'hui le seul qui produise
   * quelque chose : l'intégration décode la couleur de matière et ne la publie
   * pas encore. La table est donc ce qui donne des couleurs maintenant, et
   * elle restera le repli des matières que le serveur ne colore pas le jour où
   * il les publiera. Rien à supprimer à ce moment-là.
   *
   * Les clés sont comparées **sans casse ni espaces de bord** : PRONOTE écrit
   * souvent les matières en capitales, et personne ne devrait avoir à recopier
   * « SCIENCES VIE & TERRE » à l'identique pour obtenir une couleur.
   */
  subject_colors?: Record<string, string>;
  /** La zone repas. Active par défaut : c'est un des cinq éléments requis. */
  show_meal?: boolean;
  /** Le libellé de la zone repas. Par défaut « Repas », traduit. */
  meal_label?: string;
  /** Début de la fenêtre méridienne, `HH:MM`. Par défaut 11:00. */
  meal_from?: string;
  /** Fin de la fenêtre méridienne, `HH:MM`. Par défaut 14:30. */
  meal_to?: string;
  show_rooms?: boolean;
  show_current?: boolean;
}

/**
 * Couture de test pour la mise en avant « en cours », qui dépend de
 * `Date.now()`. En variable de module et non dans `Config` : l'index de
 * signature ouvert de `PronoteCardConfig` rendrait sinon un `now:` posé dans
 * le YAML d'un tableau de bord capable de figer la mise en avant pour de bon.
 */
export const testClock: { now?: string } = {};

const LESSONS: EntityKey = 'sensor:lessons_today';
const IN_CLASS: EntityKey = 'binary_sensor:in_class';

/** Fenêtre méridienne par défaut, en minutes depuis minuit. */
const MEAL_FROM = 11 * 60;
const MEAL_TO = 14 * 60 + 30;

/**
 * Durée minimale d'un intervalle pour qu'il puisse être un repas.
 *
 * Une constante et non une option : dix minutes entre deux cours sont un
 * changement de salle, pas un déjeuner, et personne n'a besoin de régler ce
 * seuil. Une option de plus sur cette carte coûterait plus qu'elle
 * n'apporterait.
 */
const MEAL_MIN_MINUTES = 30;

/** `HH:MM` en minutes depuis minuit, ou `undefined` si la chaîne ne l'est pas. */
const parseClock = (value: string | undefined): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
};

/**
 * L'heure locale d'un instant, en minutes depuis minuit, **dans le fuseau de
 * la carte**.
 *
 * Passe par `Intl` et non par `getHours()`, qui rendrait l'heure du fuseau du
 * navigateur — donc une fenêtre méridienne décalée pour un utilisateur qui
 * consulte son tableau de bord depuis un autre pays. Le fuseau vient de
 * `ctx.timeZone`, que le socle a déjà traduit et validé : la préférence
 * `hass.locale.time_zone` vaut `'local'` ou `'server'` et ferait lever `Intl`.
 */
const minutesOfDay = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const [h, m] = parts.split(':');
  return Number(h) * 60 + Number(m);
};

/** La couleur du filet, en trois rangs, ou `undefined` pour l'accent neutre. */
const accentFor = (l: Lesson, table: Record<string, string> | undefined): string | undefined => {
  // Rang 1 : ce que le serveur publie, filtré strictement.
  const published = subjectColor(l.background_color);
  if (published !== undefined) return published;

  // Rang 2 : ce que l'utilisateur déclare. Jamais de couleur DÉRIVÉE du
  // libellé par hachage : une couleur déclarée est assumée et corrigible, une
  // couleur calculée aurait l'apparence d'une information sans en porter
  // aucune, et deux matières prendraient deux teintes qu'on lirait comme une
  // catégorie.
  const subject = (l.subject ?? '').trim().toLowerCase();
  if (subject === '' || table === undefined) return undefined;
  for (const [name, color] of Object.entries(table)) {
    if (name.trim().toLowerCase() === subject) return subjectColor(color);
  }
  return undefined;
};

interface Slot {
  kind: 'lesson' | 'meal';
  start?: string;
  end?: string;
  lesson?: Lesson;
}

/**
 * Les créneaux du jour, avec les zones repas insérées.
 *
 * Une zone repas est un **intervalle sans cours** qui recouvre la fenêtre
 * méridienne et dure au moins `MEAL_MIN_MINUTES`. Elle n'affirme rien de plus
 * que « pas de cours ici » : ni menu servi, ni présence de l'élève au
 * réfectoire. Son libellé est une convention de l'utilisateur, pas une
 * affirmation du module — c'est pourquoi il est configurable.
 */
const withMeals = (
  lessons: Lesson[],
  config: Config,
  timeZone: string
): { slots: Slot[]; mealInferred: boolean } => {
  const slots: Slot[] = [];
  let mealInferred = false;
  if (config.show_meal === false) {
    return { slots: lessons.map((lesson) => ({ kind: 'lesson', lesson })), mealInferred };
  }

  const from = parseClock(config.meal_from) ?? MEAL_FROM;
  const to = parseClock(config.meal_to) ?? MEAL_TO;

  for (const [index, lesson] of lessons.entries()) {
    slots.push({ kind: 'lesson', lesson });

    const next = lessons[index + 1];
    if (next === undefined) continue;

    const gapStart = parseTimestamp(lesson.end);
    const gapEnd = parseTimestamp(next.start);
    if (gapStart === undefined || gapEnd === undefined) continue;

    const minutes = (gapEnd.getTime() - gapStart.getTime()) / 60_000;
    if (minutes < MEAL_MIN_MINUTES) continue;

    // Recouvrement avec la fenêtre méridienne, dans le fuseau de la carte.
    const a = minutesOfDay(gapStart, timeZone);
    const b = minutesOfDay(gapEnd, timeZone);
    if (b <= from || a >= to) continue;

    // La borne gauche de l'intervalle est la FIN du cours précédent. Quand
    // cette fin est déduite, la position du repas l'est aussi : on le dit,
    // plutôt que de présenter un créneau calculé comme un créneau connu.
    if (lesson.end_inferred === true) mealInferred = true;

    slots.push({ kind: 'meal', start: lesson.end, end: next.start });
  }

  return { slots, mealInferred };
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-journee',
  name: 'Pronote NG — Vue journée',
  description: 'La journée en grille : horaires, couleur de matière, annulations et repas.',
  key: 'journee',
  scope: 'child',
  size: 10,
  stub: { show_meal: true, show_rooms: true, show_current: true },
  requires: () => [LESSONS],
  optional: () => [IN_CLASS],
  // Aucun libellé posé ici : l'éditeur générique les résout sous la racine de
  // catalogue de la carte (`journee.show_meal`, `journee.meal_from`…), et
  // aucune option de cette carte n'est un choix multiple dont les valeurs
  // demanderaient d'être traduites une à une.
  //
  // `subject_colors` est délibérément absente du formulaire : aucun sélecteur
  // `ha-form` ne rend correctement un dictionnaire ouvert dont les clés sont
  // les matières de l'établissement. Un sélecteur `object` afficherait un
  // éditeur de texte brut sans validation, ce qui n'aide personne — autant
  // assumer le YAML, où l'utilisateur a la coloration syntaxique de Home
  // Assistant. La page de documentation le dit et donne l'exemple.
  schema: () => [
    { name: 'show_meal', selector: { boolean: {} } },
    { name: 'meal_label', selector: { text: {} } },
    { name: 'meal_from', selector: { text: {} } },
    { name: 'meal_to', selector: { text: {} } },
    { name: 'show_rooms', selector: { boolean: {} } },
    { name: 'show_current', selector: { boolean: {} } },
  ],
  // La mise en avant du cours en cours se calcule sur `Date.now()` : sans
  // repeint périodique, elle désignerait un cours terminé pendant une heure
  // entière entre deux collectes PRONOTE, sans qu'aucune propriété réactive
  // ne change.
  tickMs: 60_000,
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const lessons = listAttr<Lesson>(ctx.attr(LESSONS, 'lessons'));

    if (lessons.length === 0) return emptyState(ctx.t('journee.empty'));

    // Tri sur l'instant réel : deux créneaux à décalages horaires mixtes ne se
    // comparent pas correctement chaîne à chaîne.
    const sorted = sortedBy(
      lessons,
      (a, b) =>
        (parseTimestamp(a.start)?.getTime() ?? 0) - (parseTimestamp(b.start)?.getTime() ?? 0)
    );

    const lang = ctx.language;
    const tz = ctx.timeZone;
    const { slots, mealInferred } = withMeals(sorted, c, tz);
    const now = (parseTimestamp(testClock.now) ?? new Date()).getTime();

    // `binary_sensor:in_class` a un droit de VETO, jamais celui de désigner :
    // il dit SI un cours a lieu, les horodatages disent LEQUEL. À `off`, aucun
    // créneau n'est mis en avant même si l'horloge le suggère — le capteur voit
    // ce que l'attribut ne porte pas : jour banalisé, cours déplacé après la
    // collecte, élève dispensé.
    const notInClass = ctx.status(IN_CLASS) === 'ok' && ctx.entity(IN_CLASS)?.state === 'off';

    const rows = slots.map((slot) => {
      if (slot.kind === 'meal') {
        return html`
          <div class="jour-ligne jour-repas">
            <div class="jour-heures">
              <span>${formatTime(slot.start, lang, tz)}${mealInferred ? '≈' : ''}</span>
              <span>${formatTime(slot.end, lang, tz)}</span>
            </div>
            <div class="jour-filet" aria-hidden="true"></div>
            <div class="jour-corps">
              <span
                class="jour-matiere"
                title=${mealInferred ? ctx.t('journee.meal_inferred') : ''}
                >${c.meal_label ?? ctx.t('journee.meal')}</span
              >
            </div>
          </div>
        `;
      }

      const l = slot.lesson;
      if (l === undefined) return html``;

      const canceled = isCanceled(l);
      const accent = accentFor(l, c.subject_colors);
      const start = parseTimestamp(l.start)?.getTime();
      const end = parseTimestamp(l.end)?.getTime();
      const current =
        c.show_current !== false &&
        !notInClass &&
        !canceled &&
        start !== undefined &&
        end !== undefined &&
        now >= start &&
        now < end;

      const badges: TemplateResult[] = [];
      if (canceled) badges.push(chip(ctx.t('journee.canceled'), 'problem'));
      const reason = statusLabel(l);
      if (reason !== '') badges.push(chip(reason, 'warn'));
      if (l.test) badges.push(chip(ctx.t('journee.test'), 'warn'));
      if (l.outing) badges.push(chip(ctx.t('journee.outing')));

      return html`
        <div class="jour-ligne ${current ? 'jour-courant' : ''}">
          <div class="jour-heures">
            <span>${formatTime(l.start, lang, tz)}</span>
            <!-- L'heure de FIN, et le « ≈ » quand l'intégration l'a déduite
                 faute que le serveur l'envoie. Sur certains établissements le
                 marqueur est sur CHAQUE ligne : ce n'est pas un défaut
                 d'affichage. Sans lui, cette colonne présenterait un calcul
                 comme une donnée, sur toute la journée. -->
            <span title=${l.end_inferred === true ? ctx.t('common.inferred_time') : ''}
              >${l.end_inferred === true ? '≈' : ''}${formatTime(l.end, lang, tz)}</span
            >
          </div>
          <div
            class="jour-filet ${accent === undefined ? 'jour-filet-neutre' : ''}"
            style=${accent === undefined ? '' : `background: ${accent}`}
            aria-hidden="true"
          ></div>
          <div class="jour-corps">
            <span class="jour-matiere ${canceled ? 'canceled' : ''}"
              >${l.subject ?? '—'}</span
            >
            ${c.show_rooms !== false && l.classroom
              ? html`<span class="jour-salle">${l.classroom}</span>`
              : ''}
            ${badges.length > 0 ? html`<span class="jour-pastilles">${badges}</span>` : ''}
          </div>
        </div>
      `;
    });

    return html`<div class="jour">${rows}</div>`;
  },
};
