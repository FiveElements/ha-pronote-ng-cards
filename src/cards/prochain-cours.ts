import { html } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatRelative, formatTime, parseTimestamp } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_wake_up?: boolean;
  show_end_of_day?: boolean;
}

const NEXT: EntityKey = 'sensor:next_lesson';
const WAKE: EntityKey = 'sensor:next_wake_up';
const END: EntityKey = 'sensor:end_of_lessons';

/** `teachers` arrive tantôt en tableau, tantôt en chaîne selon la version de l'intégration. */
const teachersOf = (value: unknown): string => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return typeof value === 'string' ? value : '';
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-prochain-cours',
  name: 'Pronote NG — Prochain cours',
  description: 'Le prochain cours : matière, heure, salle, professeur.',
  key: 'prochain_cours',
  scope: 'child',
  size: 2,
  requires: () => [NEXT],
  optional: (c) => [...(c.show_wake_up ? [WAKE] : []), ...(c.show_end_of_day ? [END] : [])],
  schema: () => [
    { name: 'show_wake_up', selector: { boolean: {} } },
    { name: 'show_end_of_day', selector: { boolean: {} } },
  ],
  // Le rendu affiche `formatRelative` (« dans 30 min »), calculé sur
  // Date.now() : sans repeint périodique, ce texte resterait figé pendant des
  // heures entre deux cycles de collecte PRONOTE alors qu'aucune propriété
  // réactive ne change. Le socle pose et retire lui-même la minuterie.
  tickMs: 60_000,
  render(ctx: RenderCtx<Config>) {
    // Le socle garantit `e` défini et hors unknown/unavailable ici (spec §4.3) :
    // NEXT est la seule entité requise, sans `requiresAny`, et `render` n'est
    // appelé qu'une fois l'état 2 (indisponible) écarté par le socle.
    const e = ctx.entity(NEXT)!;
    // Le socle ne traite comme « indisponible » que unknown/unavailable : un
    // horodatage qui ne se parse pas (état 'none' notamment, publié par
    // l'intégration quand il n'y a plus de cours — mais aussi tout autre état
    // que l'intégration pourrait publier sans que ce soit un vide) reste ici
    // du ressort de la carte — c'est le vide qui lui appartient. Un état non
    // parsable ne veut pas dire que la carte n'a rien à montrer : matière,
    // salle et professeurs peuvent rester exploitables.
    const start = parseTimestamp(e.state);

    const tz = ctx.timeZone;
    const lang = ctx.language;
    const subject = (ctx.attr<string>(NEXT, 'subject') ?? '').trim();
    const room = ctx.attr<string>(NEXT, 'classroom');
    const teachers = teachersOf(ctx.attr(NEXT, 'teachers'));
    const canceled = ctx.attr<boolean>(NEXT, 'canceled') === true;

    // Rien d'exploitable nulle part : c'est là, et seulement là, que le vide
    // appartient à la carte.
    if (!start && !subject && !room && !teachers) {
      return emptyState(ctx.t('prochain_cours.empty'));
    }

    const endRaw = ctx.attr<string>(NEXT, 'end');
    const endTime = parseTimestamp(endRaw) ? formatTime(endRaw, lang, tz) : '';
    const startTime = start ? formatTime(e.state, lang, tz) : '';
    const timeRange = endTime ? `${startTime} – ${endTime}` : startTime;

    return html`
      ${listRow({
        primary: subject || ctx.t('prochain_cours.name'),
        secondary: start
          ? html`${timeRange} · ${formatRelative(e.state, lang)}`
          : undefined,
        trailing: canceled ? chip(ctx.t('prochain_cours.canceled'), 'problem') : undefined,
        canceled,
      })}
      ${room ? listRow({ primary: ctx.t('prochain_cours.room', { room }) }) : ''}
      ${teachers ? listRow({ primary: teachers }) : ''}
      ${ctx.config.show_wake_up && ctx.status(WAKE) === 'ok'
        ? listRow({
            primary: ctx.t('prochain_cours.wake_up', {
              time: formatTime(ctx.entity(WAKE)?.state, lang, tz),
            }),
          })
        : ''}
      ${ctx.config.show_end_of_day && ctx.status(END) === 'ok'
        ? listRow({
            primary: ctx.t('prochain_cours.end_of_day', {
              time: formatTime(ctx.entity(END)?.state, lang, tz),
            }),
          })
        : ''}
    `;
  },
};
