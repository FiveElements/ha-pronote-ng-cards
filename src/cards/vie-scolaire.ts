import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { formatDayLabel, formatDuration, formatTime, parseTimestamp } from '../core/format';
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
// Un parent dont l'intégration ne publie que ce capteur (palier différent des
// trois autres) doit quand même obtenir une carte utile : voir requiresAny
// ci-dessous, et le rapport de correctifs (dette2).
const UNJUSTIFIED_ABSENCES: EntityKey = 'sensor:unjustified_absences';
const IN_PROGRESS: EntityKey = 'binary_sensor:absence_in_progress';
const UPCOMING: EntityKey = 'binary_sensor:punishment_upcoming';
const NEXT_PUNISHMENT: EntityKey = 'sensor:next_punishment';

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
  requiresAny: () => [ABSENCES, DELAYS, PUNISHMENTS, UNJUSTIFIED_ABSENCES],
  optional: () => [IN_PROGRESS, UPCOMING, NEXT_PUNISHMENT],
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

    // Compteurs en tête (spec §5.7), avant le détail par section. Chacun ne
    // paraît que si son capteur est résolu et exploitable : `ctx.status`
    // distingue déjà « absent » et « pas encore collecté », inutile de le
    // refaire ici. `unjustified_absences` n'a pas de section qui lui soit
    // propre — c'est une sous-mesure des absences, on le rattache donc au
    // même filtre qu'« absences ».
    if (wanted.includes('absences') && ctx.status(ABSENCES) === 'ok') {
      out.push(
        listRow({ primary: ctx.t('vie_scolaire.absences'), trailing: ctx.entity(ABSENCES)!.state })
      );
    }
    if (wanted.includes('absences') && ctx.status(UNJUSTIFIED_ABSENCES) === 'ok') {
      out.push(
        listRow({
          primary: ctx.t('vie_scolaire.unjustified_absences'),
          trailing: chip(ctx.entity(UNJUSTIFIED_ABSENCES)!.state, 'warn'),
        })
      );
    }
    if (wanted.includes('delays') && ctx.status(DELAYS) === 'ok') {
      out.push(
        listRow({ primary: ctx.t('vie_scolaire.delays'), trailing: ctx.entity(DELAYS)!.state })
      );
    }
    if (wanted.includes('punishments') && ctx.status(PUNISHMENTS) === 'ok') {
      out.push(
        listRow({
          primary: ctx.t('vie_scolaire.punishments'),
          trailing: ctx.entity(PUNISHMENTS)!.state,
        })
      );
    }

    // Les bandeaux sont du contenu à part entière : une absence en cours ou
    // une punition à venir, souvent pas encore consignées dans les listes
    // détaillées (`items`), ne doivent jamais être écrasées par l'état vide.
    if (ctx.entity(IN_PROGRESS)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.in_progress')}</div>`);
    }
    if (ctx.entity(UPCOMING)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.upcoming')}</div>`);
      // `sensor:next_punishment` est optionnelle : non résolue, le bandeau
      // reste tel quel, sans échéance et sans message d'erreur. Résolue, on
      // rend l'échéance avec les formateurs de format.ts (jamais l'horodatage
      // brut), toujours avec ctx.language et ctx.timeZone — même paire que
      // `next_test` sur la carte prochain-cours : jour ET heure comptent,
      // rien ne dit qu'une punition tombe le jour même.
      if (ctx.status(NEXT_PUNISHMENT) === 'ok') {
        const when = [
          formatDayLabel(ctx.entity(NEXT_PUNISHMENT)?.state, ctx.language, ctx.timeZone),
          formatTime(ctx.entity(NEXT_PUNISHMENT)?.state, ctx.language, ctx.timeZone),
        ]
          .filter(Boolean)
          .join(' · ');
        if (when) {
          out.push(listRow({ primary: ctx.t('vie_scolaire.next_punishment'), secondary: when }));
        }
      }
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
                // « justifiée » est féminin : correct pour une absence. Le
                // retard, plus bas, prend les clés masculines dédiées.
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
                // Un retard est masculin : `justified_m` / `unjustified_m`.
                // Les clés `justified` / `unjustified` (féminin) restent
                // réservées à une absence, juste au-dessus.
                d.justified
                  ? ctx.t('vie_scolaire.justified_m')
                  : ctx.t('vie_scolaire.unjustified_m'),
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

    // Le vide ne porte que sur le détail par section (`rows`) : les compteurs
    // et le bandeau d'échéance, poussés plus haut dans `out`, restent affichés
    // même quand aucune section détaillée n'a de ligne — sans quoi un simple
    // `return emptyState(...)` les effacerait tous les deux.
    if (rows === 0) {
      out.push(emptyState(ctx.t('vie_scolaire.empty')));
    }
    return html`${out}`;
  },
};
