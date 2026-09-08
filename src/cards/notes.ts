import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatGrade } from '../core/format';
import { emptyState, listRow } from '../core/ui/parts';

type Section = 'average' | 'latest' | 'subjects';

interface Config extends PronoteCardConfig {
  sections?: Section[];
  limit?: number;
}

interface Grade {
  subject?: string;
  grade?: number | string;
  out_of?: number | string;
  coefficient?: number;
  date?: string;
  class_average?: number | string;
  status?: string;
}

interface Average {
  subject?: string;
  average?: number | string;
  student?: number | string;
  class_average?: number | string;
}

const OVERALL: EntityKey = 'sensor:overall_average';
const GRADES: EntityKey = 'sensor:grades';
const AVERAGES: EntityKey = 'sensor:averages';
const CLASS: EntityKey = 'sensor:class_average';
const LATEST: EntityKey = 'sensor:latest_grade';

const sectionsOf = (c: Config): Section[] =>
  c.sections && c.sections.length > 0 ? c.sections : ['average', 'latest', 'subjects'];

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-notes',
  name: 'Pronote NG — Notes',
  description: 'Moyennes, dernières notes et moyennes par matière.',
  key: 'notes',
  scope: 'child',
  size: 6,
  stub: { sections: ['average', 'latest', 'subjects'] },
  requires: () => [],
  requiresAny: () => [OVERALL, GRADES, AVERAGES],
  optional: () => [CLASS, LATEST],
  schema: () => [
    {
      name: 'sections',
      selector: {
        select: {
          multiple: true,
          options: [
            { value: 'average', label: 'Moyenne générale' },
            { value: 'latest', label: 'Dernières notes' },
            { value: 'subjects', label: 'Par matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>): TemplateResult {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const blocks: TemplateResult[] = [];

    if (wanted.includes('average') && ctx.status(OVERALL) === 'ok') {
      const overall = ctx.entity(OVERALL);
      blocks.push(
        listRow({
          primary: ctx.t('notes.student'),
          trailing: formatGrade(overall?.state, ctx.attr<number | string>(OVERALL, 'out_of')),
        })
      );
      if (ctx.status(CLASS) === 'ok') {
        const classEntity = ctx.entity(CLASS);
        blocks.push(
          listRow({
            primary: ctx.t('notes.class'),
            trailing: formatGrade(
              classEntity?.state,
              ctx.attr<number | string>(CLASS, 'out_of')
            ),
          })
        );
      }
    }

    if (wanted.includes('latest')) {
      // Une sentinelle (|1 à |8) rend l'état non numérique : le motif est
      // dans l'attribut `status`, et c'est lui qu'il faut montrer — jamais
      // un vide.
      const latestStatus = ctx.attr<string>(LATEST, 'status');
      if (ctx.status(LATEST) === 'unavailable' && latestStatus) {
        blocks.push(
          listRow({
            primary: ctx.attr<string>(LATEST, 'subject') ?? ctx.t('notes.name'),
            trailing: latestStatus,
          })
        );
      }
      // Les plus récentes en tête, sans muter `items` (pas de reverse en
      // place) : on itère par indice décroissant plutôt que de copier puis
      // retourner le tableau.
      const items = ctx.attr<Grade[]>(GRADES, 'items') ?? [];
      const limit = c.limit ?? 8;
      const start = Math.max(0, items.length - limit);
      for (let i = items.length - 1; i >= start; i--) {
        const g = items[i];
        if (!g) continue;
        blocks.push(
          listRow({
            primary: g.subject ?? '—',
            secondary: g.coefficient
              ? ctx.t('notes.coefficient', { value: g.coefficient })
              : undefined,
            trailing: g.status ?? formatGrade(g.grade, g.out_of),
          })
        );
      }
      if (items.length === 0 && ctx.status(GRADES) === 'ok' && blocks.length === 0) {
        return emptyState(ctx.t('notes.empty'));
      }
    }

    if (wanted.includes('subjects')) {
      const items = ctx.attr<Average[]>(AVERAGES, 'items') ?? [];
      for (const a of items) {
        blocks.push(
          listRow({
            primary: a.subject ?? '—',
            secondary:
              a.class_average !== undefined
                ? `${ctx.t('notes.class')} ${formatGrade(a.class_average, undefined)}`
                : undefined,
            trailing: formatGrade(a.average ?? a.student, undefined),
          })
        );
      }
    }

    if (blocks.length === 0) return emptyState(ctx.t('notes.empty'));
    return html`${blocks}`;
  },
};
