import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatTime } from '../core/format';
import { chip, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_photo?: boolean;
  /** Faux par défaut : une carte est une surface partageable. */
  show_establishment?: boolean;
}

const CLASS: EntityKey = 'sensor:class_name';
const PHOTO: EntityKey = 'image:photo';
const IN_CLASS: EntityKey = 'binary_sensor:in_class';
const SCHOOL_DAY: EntityKey = 'binary_sensor:school_day';
const HOLIDAYS: EntityKey = 'binary_sensor:holidays';
const NEXT: EntityKey = 'sensor:next_lesson';
const PERIOD: EntityKey = 'sensor:current_period';

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-eleve',
  name: 'Pronote NG — Élève',
  description: "En-tête de synthèse : classe, état du jour, prochain cours.",
  key: 'eleve',
  scope: 'child',
  size: 3,
  stub: { show_photo: true },
  requires: () => [CLASS],
  optional: (c) => [
    ...(c.show_photo ? [PHOTO] : []),
    IN_CLASS,
    SCHOOL_DAY,
    HOLIDAYS,
    NEXT,
    PERIOD,
  ],
  schema: () => [
    { name: 'show_photo', selector: { boolean: {} } },
    { name: 'show_establishment', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const rows: TemplateResult[] = [];

    // Le nom vient du registre d'appareils, jamais d'une chaîne du code.
    const secondary = ctx.config.show_establishment
      ? ctx.attr<string>(CLASS, 'establishment')
      : undefined;

    let tone: 'ok' | 'neutral' = 'neutral';
    let stateLabel = ctx.t('eleve.no_class');
    if (ctx.entity(HOLIDAYS)?.state === 'on') stateLabel = ctx.t('eleve.holidays');
    else if (ctx.entity(IN_CLASS)?.state === 'on') {
      stateLabel = ctx.t('eleve.in_class');
      tone = 'ok';
    } else if (ctx.entity(SCHOOL_DAY)?.state === 'on') stateLabel = ctx.t('eleve.school_day');

    rows.push(
      listRow({
        primary: ctx.deviceName,
        secondary: [ctx.entity(CLASS)?.state, secondary].filter(Boolean).join(' · '),
        trailing: chip(stateLabel, tone),
      })
    );

    if (ctx.status(NEXT) === 'ok') {
      rows.push(
        listRow({
          primary: ctx.t('eleve.next', {
            subject: ctx.attr<string>(NEXT, 'subject') ?? '—',
            time: formatTime(ctx.entity(NEXT)?.state, lang, tz),
          }),
        })
      );
    }

    if (ctx.status(PERIOD) === 'ok') {
      rows.push(
        listRow({
          primary: ctx.t('eleve.period', { period: ctx.entity(PERIOD)?.state ?? '—' }),
        })
      );
    }

    // Uniquement l'entity_picture publiée par l'entité `image` : aucune URL
    // construite par la carte, aucun appel au service d'identité complet.
    const picture =
      ctx.config.show_photo && ctx.status(PHOTO) === 'ok'
        ? ctx.attr<string>(PHOTO, 'entity_picture')
        : undefined;

    return html`
      ${picture
        ? html`<img
            class="photo"
            src=${picture}
            alt=""
            style="width:64px;height:64px;border-radius:32px;object-fit:cover;float:left;margin-right:12px"
          />`
        : ''}
      ${rows}
    `;
  },
};
