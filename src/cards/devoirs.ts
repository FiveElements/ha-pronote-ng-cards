import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { chip, emptyState, listRow } from '../core/ui/parts';
import { listAttr, sortedBy } from '../core/list';
import { formatDayLabel, parseTimestamp } from '../core/format';

interface Config extends PronoteCardConfig {
  filter?: 'todo' | 'tomorrow' | 'all';
  group_by?: 'date' | 'subject';
  limit?: number;
}

interface Homework {
  id?: string;
  subject?: string;
  description?: string;
  due?: string;
  done?: boolean;
}

const TODO: EntityKey = 'sensor:homework_todo';
const TOMORROW: EntityKey = 'sensor:homework_tomorrow';
const ALL: EntityKey = 'sensor:homework';
const OVERDUE: EntityKey = 'binary_sensor:homework_overdue';
const TODO_LIST: EntityKey = 'todo:homework';

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
  optional: () => [OVERDUE, TODO_LIST],
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

    if (raw.length === 0) return emptyState(ctx.t(emptyFor(ctx.config)));

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
          secondary: h.description ?? '',
          trailing: html`
            ${overdue ? chip(ctx.t('devoirs.overdue'), 'problem') : ''} ${dueLabel
              ? ctx.t('devoirs.due', { date: dueLabel })
              : ''}
          `,
        })}
      `;
    };

    const groups = groupOf(limited, by, ctx.timeZone, ctx.language);
    const out: (TemplateResult | string)[] = [overdueBanner];
    for (const g of groups) {
      out.push(html`<div class="title">${g.label}</div>`);
      for (const h of g.items) out.push(rowFor(h));
    }

    return html`${out}`;
  },
};
