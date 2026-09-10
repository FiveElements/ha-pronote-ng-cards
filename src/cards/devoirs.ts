import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { chip, emptyState, listRow } from '../core/ui/parts';
import { listAttr, sortedBy } from '../core/list';
import { formatDayLabel, parseTimestamp, plainText } from '../core/format';
import { subjectAccent } from '../core/subject-color';

interface Config extends PronoteCardConfig {
  filter?: 'todo' | 'tomorrow' | 'all';
  group_by?: 'date' | 'subject';
  limit?: number;
  /**
   * Table matière → couleur, renseignée par l'utilisateur.
   *
   * C'est le **deuxième** rang de couleur, et un secours : `subjectAccent`
   * préfère la couleur du serveur, que l'intégration publie désormais sur
   * chaque devoir (`background_color`). Cette table ne sert donc plus qu'à
   * colorer une matière que l'établissement laisse vide, ou à remplacer une
   * teinte illisible dans un thème.
   *
   * Le commentaire précédent affirmait l'inverse : que l'intégration « ne la
   * publie pas encore » et que cette table était le seul rang qui produise
   * quelque chose. C'était vrai à l'écriture et faux depuis, ce qui est le
   * pire état pour un commentaire : il conseillait de remplir la table alors
   * que le premier rang gagne partout. Mesuré le 10 septembre 2026 sur une
   * instance — les vingt devoirs portent `background_color`, en hexadécimal
   * strict, six teintes distinctes. La page de documentation, elle, était à
   * jour : elle datait la bascule de la version 0.0.13 de l'intégration.
   *
   * Absente du formulaire d'éditeur, et pour une raison : aucun sélecteur
   * `ha-form` ne rend correctement un dictionnaire ouvert dont les clés sont
   * les matières de l'établissement. En YAML, l'utilisateur a au moins la
   * coloration syntaxique de Home Assistant.
   */
  subject_colors?: Record<string, string>;
}

interface Homework {
  id?: string;
  subject?: string;
  /** L'énoncé tel que PRONOTE l'envoie : du HTML, balises et entités comprises. */
  description?: string;
  /**
   * Le même énoncé en texte simple, publié par l'intégration.
   *
   * C'est la bonne source : la conversion appartient au module qui SAIT que
   * le champ est du HTML, sinon trois cartes donnent trois réponses
   * différentes au même `&amp;amp;`. `plainText` reste le repli, pour les
   * installations dont l'intégration est antérieure à ce champ.
   */
  description_text?: string;
  due?: string;
  done?: boolean;
  /**
   * La couleur de la matière (`CouleurFond`), le même code visuel que sur
   * l'emploi du temps. `unknown` : chaîne de serveur, filtrée par
   * `subjectColor` avant d'atteindre un attribut `style`.
   */
  background_color?: unknown;
}

const TODO: EntityKey = 'sensor:homework_todo';
const TOMORROW: EntityKey = 'sensor:homework_tomorrow';
const ALL: EntityKey = 'sensor:homework';
const OVERDUE: EntityKey = 'binary_sensor:homework_overdue';
const TODO_LIST: EntityKey = 'todo:homework';
/**
 * Le calendrier des devoirs. Trois entités distinctes portent le même
 * `translation_key` sur des domaines différents — `sensor:homework`,
 * `calendar:homework` et `todo:homework` — d'où la qualification par domaine
 * de toutes les clés du projet.
 *
 * Ce que cette entité apporte et que la liste ne peut pas montrer : la
 * prochaine échéance QUEL QUE SOIT le filtre. En mode « demain », tout ce qui
 * tombe plus tard est invisible ; le calendrier, lui, la nomme.
 */
const CALENDAR: EntityKey = 'calendar:homework';

/**
 * Bit UPDATE_TODO_ITEM de `TodoListEntityFeature`, côté Home Assistant.
 * `2` est `DELETE_TODO_ITEM` (un bit différent) : `UPDATE_TODO_ITEM` vaut `4`.
 */
const UPDATE_ITEM = 4;

const keyFor = (c: Config): EntityKey =>
  c.filter === 'tomorrow' ? TOMORROW : c.filter === 'all' ? ALL : TODO;

const emptyFor = (c: Config): string =>
  c.filter === 'tomorrow'
    ? 'devoirs.empty_tomorrow'
    : c.filter === 'all'
      ? 'devoirs.empty_all'
      : 'devoirs.empty_todo';

/** Clé de jour calendaire (AAAA-MM-JJ) dans le fuseau donné : compare des jours, pas des instants. */
const dayKey = (d: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

/**
 * Un devoir est en retard si son échéance (jour calendaire) est strictement
 * avant aujourd'hui **et qu'il n'est pas fait**.
 *
 * `done` fait partie de la définition, ce n'est pas un raffinement. Un devoir
 * coché dont l'échéance est passée est le cas NORMAL — on coche après avoir
 * fait, et l'échéance passe ensuite — donc l'oublier ne produit pas un défaut
 * rare : ça produit une carte qui crie au retard sur son propre historique,
 * et d'autant plus fort que l'élève a travaillé.
 *
 * Mesuré le 10 septembre 2026 sur une instance, avec `filter: all` : neuf
 * lignes portaient la pastille pour quatre devoirs réellement en retard, et
 * les cinq de trop étaient exactement les cinq devoirs cochés. L'intégration
 * comptait quatre, elle, sur `count` de `binary_sensor:homework_overdue` —
 * donc la carte et l'intégration se contredisaient sur la même page, et
 * c'est la carte qui avait tort.
 */
const isOverdue = (h: Homework, timeZone: string): boolean => {
  if (h.done === true) return false;
  const d = parseTimestamp(h.due);
  return d !== undefined && dayKey(d, timeZone) < dayKey(new Date(), timeZone);
};

/**
 * `limit` absent ou négatif = tout ; `limit: 0` = rien.
 *
 * Et « rien » a besoin d'être DIT, avec ses propres mots : voir la garde
 * `devoirs.limit_zero` dans `render`. Zéro devoir affiché parce que la limite
 * vaut zéro n'est pas zéro devoir à faire.
 */
const truncate = <T>(items: T[], limit: number | undefined): T[] =>
  limit === undefined || limit < 0 ? items : items.slice(0, limit);

interface Group {
  label: string;
  items: Homework[];
}

/**
 * Regroupe une liste déjà triée par le même critère : les éléments qui
 * partagent la même clé de regroupement se suivent donc dans le tableau, et
 * l'ordre d'apparition des groupes suit l'ordre du tri.
 */
const groupOf = (
  items: Homework[],
  by: 'date' | 'subject',
  timeZone: string,
  language: string
): Group[] => {
  const groups: Group[] = [];
  const index = new Map<string, Group>();
  for (const h of items) {
    const label =
      by === 'subject'
        ? (h.subject ?? '—')
        : h.due
          ? formatDayLabel(h.due, language, timeZone) || '—'
          : '—';
    let g = index.get(label);
    if (!g) {
      g = { label, items: [] };
      index.set(label, g);
      groups.push(g);
    }
    g.items.push(h);
  }
  return groups;
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-devoirs',
  name: 'Pronote NG — Devoirs',
  description: 'Les devoirs à faire, avec échéance et matière.',
  key: 'devoirs',
  scope: 'child',
  size: 5,
  stub: { filter: 'todo', group_by: 'date' },
  requires: (c) => [keyFor(c)],
  optional: () => [OVERDUE, TODO_LIST, CALENDAR],
  schema: (_config: Config, t?: Translate) => [
    {
      name: 'filter',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'todo', label: t ? t('devoirs.filter_todo') : 'À faire' },
            { value: 'tomorrow', label: t ? t('devoirs.filter_tomorrow') : 'Pour demain' },
            { value: 'all', label: t ? t('devoirs.filter_all') : 'Tous' },
          ],
        },
      },
    },
    {
      name: 'group_by',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'date', label: t ? t('devoirs.group_date') : 'Échéance' },
            { value: 'subject', label: t ? t('devoirs.group_subject') : 'Matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const raw = listAttr<Homework>(ctx.attr(key, 'items'));

    /**
     * La prochaine échéance vue par le calendrier.
     *
     * Seuls les ATTRIBUTS de l'entité sont lus. Obtenir la liste complète de
     * ses évènements demanderait un appel de service — donc une collecte au
     * rendu, que le projet interdit, et que le type `AllowedCall` refuse de
     * toute façon à la compilation.
     *
     * Affichée seulement quand elle ajoute quelque chose : avec le filtre
     * « tous », la liste montre déjà tout, et la ligne ne ferait que répéter
     * sa première entrée.
     */
    const nextDue = ((): TemplateResult | '' => {
      if (ctx.config.filter === 'all' || ctx.status(CALENDAR) !== 'ok') return '';
      const message = ctx.attr<string>(CALENDAR, 'message');
      const startsAt = ctx.attr<string>(CALENDAR, 'start_time');
      const when = startsAt ? formatDayLabel(startsAt, ctx.language, ctx.timeZone) : '';
      // Un calendrier sans évènement à venir ne porte ni intitulé ni date :
      // il se tait, plutôt que d'afficher une ligne creuse.
      if (!message && !when) return '';
      return listRow({
        primary: ctx.t('devoirs.next_due'),
        secondary: message,
        trailing: when || undefined,
        // La gouttière est réservée sans être colorée : cette ligne n'est pas
        // une matière, mais la liste est désormais codée par couleur et une
        // ligne sans gouttière se décalerait de neuf pixels vers la gauche.
        // Voir `RowOptions.accent`, troisième valeur.
        accent: null,
      });
    })();

    // `nextDue` survit à l'état vide, et c'est le moment où il sert le plus :
    // rien à rendre dans la fenêtre choisie, mais une échéance existe plus
    // loin. Le rendre après un retour anticipé le jetterait — le défaut exact
    // qui a déjà été corrigé sur deux autres cartes de ce projet.
    if (raw.length === 0) {
      return html`${nextDue}${emptyState(ctx.t(emptyFor(ctx.config)))}`;
    }

    const by = ctx.config.group_by ?? 'date';
    const sorted = sortedBy(raw, (a, b) =>
      by === 'subject'
        ? (a.subject ?? '').localeCompare(b.subject ?? '')
        : (parseTimestamp(a.due)?.getTime() ?? Infinity) -
          (parseTimestamp(b.due)?.getTime() ?? Infinity)
    );

    const limited = truncate(sorted, ctx.config.limit);

    const overdueOn = ctx.entity(OVERDUE)?.state === 'on';
    // Passe par `listRow` plutôt que par un `div` de classe `row` écrit ici :
    // la bannière doit réserver la gouttière comme les lignes de devoir, et
    // `listRow` est le seul endroit qui sache la poser.
    const overdueBanner = overdueOn
      ? listRow({ primary: chip(ctx.t('devoirs.overdue'), 'problem'), accent: null })
      : '';

    /**
     * `limit: 0` : la liste n'est pas vide, c'est l'affichage qui est à zéro.
     *
     * Sans cette garde la carte rendait une **coquille** : ni titre, ni ligne,
     * ni message. Mesuré le 10 septembre 2026 — quatre-vingt-neuf pixels
     * portant la seule pastille « en retard » et la ligne de prochaine
     * échéance, au-dessus de quinze devoirs invisibles et inexpliqués.
     *
     * Et le message d'état vide ordinaire ne convient pas : « rien à faire »
     * au-dessus de quinze devoirs à faire serait FAUX, du même genre que le
     * retard qui ignorait `done`. D'où une phrase à elle, qui nomme la cause
     * au lieu de la cacher — c'est la seule façon de rendre l'option
     * réversible pour qui l'a posée sans y penser.
     *
     * La bannière et la prochaine échéance restent : elles ne dépendent pas de
     * la liste affichée, et c'est ici qu'elles sont le plus utiles.
     */
    if (limited.length === 0) {
      return html`${overdueBanner}${nextDue}${emptyState(ctx.t('devoirs.limit_zero'))}`;
    }

    // La coche n'existe que si l'intégration annonce l'écriture. On lit la
    // capacité, on ne la suppose pas.
    const todoId = ctx.entityId(TODO_LIST);
    const features = ctx.attr<number>(TODO_LIST, 'supported_features') ?? 0;
    const writable = Boolean(todoId) && (features & UPDATE_ITEM) !== 0;

    // L'identifiant retenu pour désigner le devoir côté service : `id` s'il
    // existe, sinon l'énoncé. Ne part jamais du rendu — uniquement d'une
    // action de l'utilisateur (voir @change ci-dessous).
    const toggle = async (item: Homework, checkbox: HTMLInputElement): Promise<void> => {
      if (!todoId) return;
      const itemRef = item.id ?? item.description;
      if (!itemRef) return;
      const status = checkbox.checked ? 'completed' : 'needs_action';
      try {
        await ctx.callService('todo.update_item', { item: itemRef, status }, { entity_id: todoId });
      } catch {
        // L'appel a échoué : la case ne doit pas mentir sur l'état réel.
        checkbox.checked = !checkbox.checked;
      }
    };

    const rowFor = (h: Homework): TemplateResult => {
      const overdue = isOverdue(h, ctx.timeZone);
      // Groupée par échéance, la date TITRE déjà le groupe : la répéter en fin
      // de ligne la disait deux fois par devoir. Mesuré le 10 septembre 2026 :
      // quinze lignes sur dix-sept dont la fin reprenait mot pour mot le titre
      // juste au-dessus — et c'est le regroupement par DÉFAUT, donc le cas le
      // plus fréquent et non un cas de coin. Groupée par matière, la date est
      // au contraire la seule chose qui situe le devoir : elle reste.
      const dueLabel =
        by === 'date' ? '' : h.due ? formatDayLabel(h.due, ctx.language, ctx.timeZone) : '';
      // La couleur de matière est une gouttière à gauche, comme sur les cinq
      // autres cartes qui portent une matière. Voir `RowOptions.accent` pour
      // ses trois valeurs, et la règle `.row.empile` de `styles.ts` pour les
      // deux dispositifs que ce placement a annulés.
      const accent = subjectAccent(h.background_color, h.subject, ctx.config.subject_colors);
      return html`
        ${listRow({
          // La matière TITRE le bloc, elle n'occupe plus une colonne à sa
          // gauche : c'est l'énoncé qui est le contenu de la carte, et une
          // colonne de matière le comprimait à 132 pixels sur une carte de
          // 420. Le bloc lui rend toute la largeur.
          stacked: true,
          accent: accent ?? null,
          primary: html`
            ${
              writable
                ? html`<input
                    type="checkbox"
                    .checked=${h.done === true}
                    @change=${(event: Event): void => {
                      const target = event.currentTarget;
                      if (target instanceof HTMLInputElement) void toggle(h, target);
                    }}
                  />`
                : ''
            }
            ${h.subject ?? ctx.t('devoirs.name')}
          `,
          // Le texte simple publié par l'intégration s'il existe, sinon
          // l'énoncé HTML dévêtu ici — jamais injecté.
          secondary: h.description_text ?? plainText(h.description),
          // `undefined` et non un gabarit vide : `listRow` teste la
          // présence de `trailing`, et un `TemplateResult` est toujours vrai
          // — groupé par échéance, chaque ligne sans retard aurait donc posé
          // une boîte vide dans la tête du bloc.
          trailing:
            overdue || dueLabel
              ? html`
                  ${overdue ? chip(ctx.t('devoirs.overdue'), 'problem') : ''}
                  ${dueLabel ? ctx.t('devoirs.due', { date: dueLabel }) : ''}
                `
              : undefined,
        })}
      `;
    };

    const groups = groupOf(limited, by, ctx.timeZone, ctx.language);
    const out: (TemplateResult | string)[] = [overdueBanner, nextDue];
    for (const g of groups) {
      out.push(html`<div class="title">${g.label}</div>`);
      // Les lignes d'un jour ne sont plus enveloppées. L'enveloppe existait
      // pour leur faire partager une colonne de matière de largeur unique ;
      // il n'y a plus de colonne de matière, la matière titre son bloc.
      out.push(html`${g.items.map((h) => rowFor(h))}`);
    }

    return html`${out}`;
  },
};
