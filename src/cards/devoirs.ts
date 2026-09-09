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
   * C'est le **deuxième** rang de couleur, et aujourd'hui le seul qui produise
   * quelque chose : l'intégration décode la couleur de matière et ne la publie
   * pas encore. Voir `subjectAccent`.
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
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Un devoir est en retard si son échéance (jour calendaire) est strictement avant aujourd'hui. */
const isOverdue = (due: string | undefined, timeZone: string): boolean => {
  const d = parseTimestamp(due);
  return d !== undefined && dayKey(d, timeZone) < dayKey(new Date(), timeZone);
};

/** `limit` absent ou négatif = tout ; `limit: 0` = rien — le seul sens qui ne surprenne personne. */
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
const groupOf = (items: Homework[], by: 'date' | 'subject', timeZone: string, language: string): Group[] => {
  const groups: Group[] = [];
  const index = new Map<string, Group>();
  for (const h of items) {
    const label =
      by === 'subject'
        ? (h.subject ?? '—')
        : h.due
          ? (formatDayLabel(h.due, language, timeZone) || '—')
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
        : (parseTimestamp(a.due)?.getTime() ?? Infinity) - (parseTimestamp(b.due)?.getTime() ?? Infinity)
    );

    const limited = truncate(sorted, ctx.config.limit);

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

    const overdueOn = ctx.entity(OVERDUE)?.state === 'on';
    const overdueBanner = overdueOn ? html`<div class="row">${chip(ctx.t('devoirs.overdue'), 'problem')}</div>` : '';

    const rowFor = (h: Homework): TemplateResult => {
      const overdue = isOverdue(h.due, ctx.timeZone);
      const dueLabel = h.due ? formatDayLabel(h.due, ctx.language, ctx.timeZone) : '';
      // La couleur de matière est un SEPARATEUR ici, pas une gouttière : un
      // filet pleine hauteur entre l'intitulé et l'énoncé. Voir
      // `RowOptions.divider` pour ce que ce placement dit de plus que celui
      // des trois autres cartes.
      const accent = subjectAccent(h.background_color, h.subject, ctx.config.subject_colors);
      return html`
        ${listRow({
          primary: html`
            ${writable
              ? html`<input
                  type="checkbox"
                  .checked=${h.done === true}
                  @change=${(event: Event): void => {
                    const target = event.currentTarget;
                    if (target instanceof HTMLInputElement) void toggle(h, target);
                  }}
                />`
              : ''}
            ${h.subject ?? ctx.t('devoirs.name')}
          `,
          divider: accent,
          // Le texte simple publié par l'intégration s'il existe, sinon
          // l'énoncé HTML dévêtu ici — jamais injecté.
          secondary: h.description_text ?? plainText(h.description),
          trailing: html`
            ${overdue ? chip(ctx.t('devoirs.overdue'), 'problem') : ''} ${dueLabel
              ? ctx.t('devoirs.due', { date: dueLabel })
              : ''}
          `,
        })}
      `;
    };

    const groups = groupOf(limited, by, ctx.timeZone, ctx.language);
    const out: (TemplateResult | string)[] = [overdueBanner, nextDue];
    for (const g of groups) {
      out.push(html`<div class="title">${g.label}</div>`);
      for (const h of g.items) out.push(rowFor(h));
    }

    return html`${out}`;
  },
};
