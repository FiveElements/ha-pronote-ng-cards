import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { formatDuration, parseTimestamp } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';
import { latestFirst, listAttr, sortedBy } from '../core/list';

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
 * `slice(-limit)` (l'ancienne implémentation) supposait l'attribut déjà trié
 * du plus ancien au plus récent, sans le vérifier : une intégration qui
 * renvoie le plus récent en tête ferait silencieusement remonter les entrées
 * les plus anciennes. On trie explicitement, du plus ancien au plus récent,
 * avant de confier le tableau à `latestFirst` — sans muter l'entrée.
 */
function byDateAscending<T>(items: T[], dateOf: (item: T) => string | undefined): T[] {
  // Sur l'INSTANT, jamais sur la chaîne : un `localeCompare` d'horodatages ISO
  // n'ordonne correctement que si tous portent le même décalage horaire, et se
  // trompe en silence sinon. Une date illisible part en fin de liste plutôt que
  // de s'intercaler au hasard.
  return sortedBy(
    items,
    (a, b) =>
      (parseTimestamp(dateOf(a))?.getTime() ?? Number.POSITIVE_INFINITY) -
      (parseTimestamp(dateOf(b))?.getTime() ?? Number.POSITIVE_INFINITY)
  );
}

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
  schema: (_config: Config, t?: Translate) => {
    const tr = t ?? ((path: string) => path);
    return [
      {
        name: 'sections',
        selector: {
          select: {
            multiple: true,
            options: [
              { value: 'absences', label: tr('vie_scolaire.absences') },
              { value: 'delays', label: tr('vie_scolaire.delays') },
              { value: 'punishments', label: tr('vie_scolaire.punishments') },
            ],
          },
        },
      },
      { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
    ];
  },
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const limit = c.limit ?? 8;
    const out: TemplateResult[] = [];

    // Les bandeaux sont du contenu à part entière : une absence en cours ou
    // une punition à venir, souvent pas encore consignées dans les listes
    // détaillées (`items`), ne doivent jamais être écrasées par l'état vide.
    let banners = 0;

    if (ctx.entity(IN_PROGRESS)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.in_progress')}</div>`);
      banners++;
    }
    if (ctx.entity(UPCOMING)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.upcoming')}</div>`);
      banners++;
    }

    let rows = 0;

    if (wanted.includes('absences')) {
      const sorted = byDateAscending(
        listAttr<Absence>(ctx.attr(ABSENCES, 'items')),
        (a) => a.to_date ?? a.from_date
      );
      const items = latestFirst<Absence>(sorted, limit);
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.absences')}</div>`);
        for (const a of items) {
          rows++;
          out.push(
            listRow({
              primary: `${a.from_date ?? '—'} → ${a.to_date ?? '—'}`,
              secondary:
                a.hours !== undefined ? formatDuration(a.hours * 60, ctx.language) : undefined,
              trailing: chip(
                // « justifiée » est féminin (une absence) : accord correct
                // ici. La même clé, réutilisée plus bas pour un retard
                // (masculin), ne l'est pas — voir le rapport de correctifs.
                a.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                a.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('delays')) {
      const sorted = byDateAscending(listAttr<Delay>(ctx.attr(DELAYS, 'items')), (d) => d.date);
      const items = latestFirst<Delay>(sorted, limit);
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.delays')}</div>`);
        for (const d of items) {
          rows++;
          out.push(
            listRow({
              primary: d.date ?? '—',
              secondary:
                d.minutes !== undefined ? formatDuration(d.minutes, ctx.language) : undefined,
              trailing: chip(
                // Un retard est masculin ; ces clés sont accordées au
                // féminin dans les quatre catalogues. Aucune clé masculine
                // n'existe pour l'instant — voir le rapport de correctifs.
                d.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                d.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('punishments')) {
      // Pas de champ date exploitable dans l'attribut consommé ici (`nature`,
      // `giver`, `duration`) : rien à trier avant de tronquer.
      const items = latestFirst<Punishment>(ctx.attr(PUNISHMENTS, 'items'), limit);
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.punishments')}</div>`);
        for (const p of items) {
          rows++;
          out.push(
            listRow({
              primary: p.nature ?? '—',
              secondary: p.giver ?? undefined,
              trailing:
                p.duration !== undefined ? formatDuration(p.duration, ctx.language) : undefined,
            })
          );
        }
      }
    }

    if (rows === 0) {
      if (banners === 0) return emptyState(ctx.t('vie_scolaire.empty'));
      out.push(emptyState(ctx.t('vie_scolaire.empty')));
    }
    return html`${out}`;
  },
};
