import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatDuration } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

type Section = 'absences' | 'delays' | 'punishments';

interface Config extends PronoteCardConfig {
  sections?: Section[];
  limit?: number;
}

interface Absence {
  from_date?: string;
  to_date?: string;
  hours?: number;
  justified?: boolean;
}
interface Delay {
  date?: string;
  minutes?: number;
  justified?: boolean;
}
interface Punishment {
  nature?: string;
  giver?: string;
  duration?: number;
}

const ABSENCES: EntityKey = 'sensor:absences';
const DELAYS: EntityKey = 'sensor:delays';
const PUNISHMENTS: EntityKey = 'sensor:punishments';
const IN_PROGRESS: EntityKey = 'binary_sensor:absence_in_progress';
const UPCOMING: EntityKey = 'binary_sensor:punishment_upcoming';

const sectionsOf = (c: Config): Section[] =>
  c.sections && c.sections.length > 0 ? c.sections : ['absences', 'delays', 'punishments'];

/**
 * `Array#toReversed()` (ES2023) n'est pas dans la cible `lib` du projet
 * (ES2022) ; `Array#reverse()` mute son support, ce que `slice(-limit)`
 * rendrait inoffensif ici mais que oxlint (unicorn/no-array-reverse)
 * interdit sans distinction. On reconstruit donc l'ordre inverse à la main.
 */
const reversed = <T>(items: T[]): T[] =>
  items.reduceRight<T[]>((out, item) => {
    out.push(item);
    return out;
  }, []);

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-vie-scolaire',
  name: 'Pronote NG — Vie scolaire',
  description: 'Absences, retards et punitions, avec leur détail.',
  key: 'vie_scolaire',
  scope: 'child',
  size: 6,
  stub: { sections: ['absences', 'delays', 'punishments'] },
  requires: () => [],
  requiresAny: () => [ABSENCES, DELAYS, PUNISHMENTS],
  optional: () => [IN_PROGRESS, UPCOMING],
  schema: () => [
    {
      name: 'sections',
      selector: {
        select: {
          multiple: true,
          options: [
            { value: 'absences', label: 'Absences' },
            { value: 'delays', label: 'Retards' },
            { value: 'punishments', label: 'Punitions' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const limit = c.limit ?? 8;
    const out: TemplateResult[] = [];

    if (ctx.entity(IN_PROGRESS)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.in_progress')}</div>`);
    }
    if (ctx.entity(UPCOMING)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.upcoming')}</div>`);
    }

    let rows = 0;

    if (wanted.includes('absences')) {
      const items = reversed((ctx.attr<Absence[]>(ABSENCES, 'items') ?? []).slice(-limit));
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.absences')}</div>`);
        for (const a of items) {
          rows++;
          out.push(
            listRow({
              primary: `${a.from_date ?? '—'} → ${a.to_date ?? '—'}`,
              secondary: a.hours !== undefined ? formatDuration(a.hours * 60) : undefined,
              trailing: chip(
                a.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                a.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('delays')) {
      const items = reversed((ctx.attr<Delay[]>(DELAYS, 'items') ?? []).slice(-limit));
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.delays')}</div>`);
        for (const d of items) {
          rows++;
          out.push(
            listRow({
              primary: d.date ?? '—',
              secondary: d.minutes !== undefined ? formatDuration(d.minutes) : undefined,
              trailing: chip(
                d.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                d.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('punishments')) {
      const items = reversed((ctx.attr<Punishment[]>(PUNISHMENTS, 'items') ?? []).slice(-limit));
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.punishments')}</div>`);
        for (const p of items) {
          rows++;
          out.push(
            listRow({
              primary: p.nature ?? '—',
              secondary: p.giver ?? undefined,
              trailing: p.duration !== undefined ? formatDuration(p.duration) : undefined,
            })
          );
        }
      }
    }

    if (rows === 0) return emptyState(ctx.t('vie_scolaire.empty'));
    return html`${out}`;
  },
};
