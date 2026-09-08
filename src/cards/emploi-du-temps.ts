import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatDayLabel, formatTime, parseTimestamp } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  range?: 'today' | 'tomorrow' | 'week';
  show_rooms?: boolean;
  show_teachers?: boolean;
  /**
   * Instant de référence pour le surlignage du créneau courant. Absent du
   * schéma de l'éditeur : c'est une couture d'injection pour les tests, pas
   * une option destinée à l'utilisateur.
   */
  now?: string;
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

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-emploi-du-temps',
  name: 'Pronote NG — Emploi du temps',
  description: 'Les cours du jour, du lendemain ou de la semaine.',
  key: 'emploi_du_temps',
  scope: 'child',
  size: 8,
  stub: { range: 'today', show_rooms: true },
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: () => [
    {
      name: 'range',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'today', label: "Aujourd'hui" },
            { value: 'tomorrow', label: 'Demain' },
            { value: 'week', label: 'Semaine' },
          ],
        },
      },
    },
    { name: 'show_rooms', selector: { boolean: {} } },
    { name: 'show_teachers', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const key = keyFor(c);
    const lessons = [...(ctx.attr<Lesson[]>(key, 'lessons') ?? [])];

    if (lessons.length === 0) return emptyState(ctx.t('emploi_du_temps.empty'));

    lessons.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const out: TemplateResult[] = [];
    let currentDay = '';
    const now = (parseTimestamp(c.now) ?? new Date()).getTime();

    for (const l of lessons) {
      // En mode semaine, un intertitre par jour.
      if (c.range === 'week') {
        const label = formatDayLabel(l.start, lang, tz);
        if (label && label !== currentDay) {
          currentDay = label;
          out.push(html`<div class="title">${label}</div>`);
        }
      }

      // Un créneau annulé n'est jamais « en cours ».
      const start = parseTimestamp(l.start)?.getTime();
      const end = parseTimestamp(l.end)?.getTime();
      const current =
        !l.canceled && start !== undefined && end !== undefined && now >= start && now < end;

      const badges: TemplateResult[] = [];
      if (current) badges.push(chip(ctx.t('emploi_du_temps.current'), 'ok'));
      if (l.canceled) badges.push(chip(ctx.t('emploi_du_temps.canceled'), 'problem'));
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
          canceled: l.canceled === true,
        })
      );
    }

    return html`${out}`;
  },
};
