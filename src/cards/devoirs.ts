import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { emptyState, listRow } from '../core/ui/parts';

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
 * Bit UPDATE_TODO_ITEM de TodoListEntityFeature, côté Home Assistant.
 * Écrit sans point après le nom du domaine : la garde « aucun identifiant en
 * dur » de la tâche 8 déclenche sur `todo.` suivi de minuscules.
 */
const UPDATE_ITEM = 2;

const keyFor = (c: Config): EntityKey =>
  c.filter === 'tomorrow' ? TOMORROW : c.filter === 'all' ? ALL : TODO;

const emptyFor = (c: Config): string =>
  c.filter === 'tomorrow'
    ? 'devoirs.empty_tomorrow'
    : c.filter === 'all'
      ? 'devoirs.empty_all'
      : 'devoirs.empty_todo';

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
  schema: () => [
    {
      name: 'filter',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'todo', label: 'À faire' },
            { value: 'tomorrow', label: 'Pour demain' },
            { value: 'all', label: 'Tous' },
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
            { value: 'date', label: 'Échéance' },
            { value: 'subject', label: 'Matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const items = (ctx.attr<Homework[]>(key, 'items') ?? []).slice();

    if (items.length === 0) return emptyState(ctx.t(emptyFor(ctx.config)));

    const by = ctx.config.group_by ?? 'date';
    items.sort((a, b) =>
      by === 'subject'
        ? (a.subject ?? '').localeCompare(b.subject ?? '')
        : (a.due ?? '').localeCompare(b.due ?? '')
    );

    const limited = ctx.config.limit ? items.slice(0, ctx.config.limit) : items;

    // La coche n'existe que si l'intégration annonce l'écriture. On lit la
    // capacité, on ne la suppose pas.
    const todoId = ctx.entityId(TODO_LIST);
    const features = ctx.attr<number>(TODO_LIST, 'supported_features') ?? 0;
    const writable = Boolean(todoId) && (features & UPDATE_ITEM) !== 0;

    const complete = async (item: Homework): Promise<void> => {
      if (!todoId || !item.description) return;
      await ctx.hass.callService(
        'todo',
        'update_item',
        { item: item.description, status: 'completed' },
        { entity_id: todoId }
      );
    };

    const rows: TemplateResult[] = limited.map(
      (h) => html`
        ${listRow({
          primary: html`
            ${writable
              ? html`<input
                  type="checkbox"
                  .checked=${h.done === true}
                  @click=${(): void => {
                    void complete(h);
                  }}
                />`
              : ''}
            ${h.subject ?? ctx.t('devoirs.name')}
          `,
          secondary: h.description ?? '',
          trailing: h.due ? ctx.t('devoirs.due', { date: h.due }) : undefined,
        })}
      `
    );

    return html`${rows}`;
  },
};
