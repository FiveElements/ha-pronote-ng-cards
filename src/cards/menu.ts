import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  day?: 'today' | 'tomorrow';
}

const TODAY: EntityKey = 'sensor:menu_today';
const TOMORROW: EntityKey = 'sensor:menu_tomorrow';

const SECTIONS = [
  'first_meal',
  'main_meal',
  'side_meal',
  'cheese',
  'dessert',
  'other_meal',
] as const;

/** Garde de type : distingue un objet portant `name` sans conversion. */
const hasName = (v: unknown): v is { name: unknown } =>
  typeof v === 'object' && v !== null && 'name' in v;

/** Les trois formes rencontrées : chaîne, tableau de chaînes, tableau d'objets. */
const dishes = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === 'string') return v;
      if (hasName(v)) return String(v.name);
      return '';
    })
    .filter(Boolean);
};

const keyFor = (c: Config): EntityKey => (c.day === 'tomorrow' ? TOMORROW : TODAY);

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-menu',
  name: 'Pronote NG — Cantine',
  description: 'Le menu du jour ou du lendemain, plat par plat.',
  key: 'menu',
  scope: 'child',
  size: 4,
  stub: { day: 'today' },
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: () => [
    {
      name: 'day',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'today', label: "Aujourd'hui" },
            { value: 'tomorrow', label: 'Demain' },
          ],
        },
      },
    },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const rows: TemplateResult[] = [];

    for (const section of SECTIONS) {
      const items = dishes(ctx.attr(key, section));
      if (items.length === 0) continue;
      rows.push(
        listRow({
          primary: ctx.t(`menu.${section}`),
          trailing: items.join(' · '),
        })
      );
    }

    // Le vide appartient à la carte : la cantine ne publie pas tous les jours,
    // ce n'est pas une panne.
    if (rows.length === 0) return emptyState(ctx.t('menu.empty'));
    return html`${rows}`;
  },
};
