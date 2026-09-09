import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { formatDayLabel, formatTime, parseTimestamp } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';
import { listAttr, sortedBy } from '../core/list';

interface Config extends PronoteCardConfig {
  range?: 'today' | 'tomorrow' | 'week';
  show_rooms?: boolean;
  show_teachers?: boolean;
}

interface Lesson {
  subject?: string;
  start?: string;
  end?: string;
  classroom?: string;
  teachers?: string[] | string;
  canceled?: boolean;
  status?: string;
  test?: boolean;
  outing?: boolean;
}

/**
 * Couture de test pour le surlignage « en cours », qui dépend de
 * `Date.now()`. Elle vit ici, en variable de module, plutôt que dans
 * `Config` : `PronoteCardConfig` porte un index de signature ouvert
 * (`[option: string]: unknown`), donc tout champ ajouté à `Config` reste
 * atteignable depuis le YAML d'un tableau de bord — un `now:` posé à la
 * main y figerait le surlignage sur un instant arbitraire, en permanence.
 * En important cette variable directement, seuls les tests peuvent
 * l'atteindre ; aucune configuration ne le peut.
 */
export const testClock: { now?: string } = {};

const KEYS: Record<NonNullable<Config['range']>, EntityKey> = {
  today: 'sensor:lessons_today',
  tomorrow: 'sensor:timetable_tomorrow',
  week: 'sensor:timetable_week',
};

const keyFor = (c: Config): EntityKey => KEYS[c.range ?? 'today'];

/** `teachers` arrive tantôt en tableau, tantôt en chaîne selon la version de l'intégration. */
const teachersOf = (value: unknown): string =>
  Array.isArray(value)
    ? value.filter(Boolean).join(', ')
    : typeof value === 'string'
      ? value
      : '';

/**
 * `canceled` est le signal nominal, mais certaines versions de l'intégration
 * ne posent que `status` (par exemple « Cours annulé ») sans lever
 * `canceled`. L'ignorer ferait apparaître un cours annulé comme un cours
 * normal — exactement ce que la règle « signalé et non masqué » interdit.
 */
const isCanceled = (l: Lesson): boolean => l.canceled === true || l.status === 'Cours annulé';


export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-emploi-du-temps',
  name: 'Pronote NG — Emploi du temps',
  description: 'Les cours du jour, du lendemain ou de la semaine.',
  key: 'emploi_du_temps',
  scope: 'child',
  // `size` reste un nombre statique (voir CardSpec.size dans src/core/types.ts) :
  // il ne peut pas dépendre de `range`, puisque `getCardSize()` (src/core/base-card.ts)
  // ne lit que cette valeur, sans jamais consulter la config — changer cela
  // demanderait de toucher au socle, hors périmètre de ce correctif. On
  // retient donc la hauteur d'une journée normale ; en mode semaine (trente à
  // quarante lignes), l'annonce à Home Assistant reste sous-estimée.
  size: 8,
  stub: { range: 'today', show_rooms: true },
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: (_config: Config, t?: Translate) => [
    {
      name: 'range',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'today', label: t ? t('emploi_du_temps.range_today') : "Aujourd'hui" },
            { value: 'tomorrow', label: t ? t('emploi_du_temps.range_tomorrow') : 'Demain' },
            { value: 'week', label: t ? t('emploi_du_temps.range_week') : 'Semaine' },
          ],
        },
      },
    },
    { name: 'show_rooms', selector: { boolean: {} } },
    { name: 'show_teachers', selector: { boolean: {} } },
  ],
  // Le surlignage « en cours » est calculé sur Date.now() (voir plus bas) :
  // sans repeint périodique, la pastille peut désigner un cours terminé
  // pendant une heure entière, entre deux cycles de collecte PRONOTE, alors
  // qu'aucune propriété réactive ne change. Le socle pose et retire lui-même
  // la minuterie.
  tickMs: 60_000,
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const key = keyFor(c);
    // `listAttr` survit à un attribut absent, nul, ou qui n'est simplement
    // pas un tableau (objet, chaîne…) : un `[...x]` sur une valeur non
    // itérable lèverait dans `render`, et une exception ici n'affiche pas un
    // message d'erreur — elle efface la carte entière, sans même le
    // « donnée pas encore collectée » qu'on afficherait sinon.
    const lessons = listAttr<Lesson>(ctx.attr(key, 'lessons'));

    if (lessons.length === 0) return emptyState(ctx.t('emploi_du_temps.empty'));

    // Tri sur l'instant réel, pas sur la représentation textuelle : deux
    // créneaux à décalages horaires mixtes (l'un en `Z`, l'autre en
    // `+02:00`) ne se comparent pas correctement chaîne à chaîne — le
    // premier chiffre d'heure peut sembler « petit » alors que l'instant
    // réel est le plus tardif des deux.
    const sorted = sortedBy(
      lessons,
      (a, b) => (parseTimestamp(a.start)?.getTime() ?? 0) - (parseTimestamp(b.start)?.getTime() ?? 0)
    );

    const lang = ctx.language;
    const tz = ctx.timeZone;
    const out: TemplateResult[] = [];
    let currentDay = '';
    const now = (parseTimestamp(testClock.now) ?? new Date()).getTime();

    for (const l of sorted) {
      // En mode semaine, un intertitre par jour.
      if (c.range === 'week') {
        const label = formatDayLabel(l.start, lang, tz);
        if (label && label !== currentDay) {
          currentDay = label;
          out.push(html`<div class="title">${label}</div>`);
        }
      }

      const canceled = isCanceled(l);

      // Un créneau annulé n'est jamais « en cours ».
      const start = parseTimestamp(l.start)?.getTime();
      const end = parseTimestamp(l.end)?.getTime();
      const current =
        !canceled && start !== undefined && end !== undefined && now >= start && now < end;

      const badges: TemplateResult[] = [];
      if (current) badges.push(chip(ctx.t('emploi_du_temps.current'), 'ok'));
      if (canceled) badges.push(chip(ctx.t('emploi_du_temps.canceled'), 'problem'));
      if (l.test) badges.push(chip(ctx.t('emploi_du_temps.test'), 'warn'));
      if (l.outing) badges.push(chip(ctx.t('emploi_du_temps.outing')));

      const details = [
        c.show_rooms ? l.classroom : undefined,
        c.show_teachers ? teachersOf(l.teachers) : undefined,
      ]
        .filter(Boolean)
        .join(' · ');

      out.push(
        listRow({
          primary: html`${formatTime(l.start, lang, tz)} ${l.subject ?? '—'}`,
          secondary: details || undefined,
          trailing: badges.length > 0 ? html`${badges}` : undefined,
          // Un cours annulé reste visible, barré. Le retirer donnerait
          // l'illusion qu'il n'a jamais existé.
          canceled,
        })
      );
    }

    return html`${out}`;
  },
};
