import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatRelative, formatTime } from '../core/format';
import { chip, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_refresh?: boolean;
  refresh_tier?: string;
}

const STATE: EntityKey = 'sensor:limiter_state';
const BUDGET: EntityKey = 'sensor:remaining_budget';
const CALLS: EntityKey = 'sensor:calls_today';
const NEXT: EntityKey = 'sensor:next_collection';
const LAST: EntityKey = 'sensor:last_collection';

const TONES: Record<string, 'ok' | 'warn' | 'problem'> = {
  nominal: 'ok',
  throttled: 'warn',
  quiet_hours: 'warn',
  backoff: 'problem',
  credentials_hold: 'problem',
  bootstrap_failed: 'problem',
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-limiteur',
  name: 'Pronote NG — Limiteur',
  description: "Budget d'appels, état du limiteur et prochaine collecte.",
  key: 'limiteur',
  // Les entités de diagnostic sont sur l'appareil de compte. Le socle suit
  // via_device_id : l'utilisateur configure quand même l'appareil de l'enfant,
  // comme pour les sept autres cartes.
  scope: 'account',
  size: 5,
  requires: () => [STATE],
  optional: () => [BUDGET, CALLS, NEXT, LAST],
  schema: () => [
    { name: 'show_refresh', selector: { boolean: {} } },
    { name: 'refresh_tier', selector: { text: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const out: TemplateResult[] = [];

    const state = ctx.entity(STATE)?.state ?? 'nominal';
    const until = ctx.attr<string>(STATE, 'until');
    out.push(
      listRow({
        primary: ctx.t('limiteur.state'),
        secondary: until
          ? ctx.t('limiteur.until', { time: formatTime(until, lang, tz) })
          : undefined,
        trailing: chip(ctx.t(`limiteur.state_${state}`), TONES[state] ?? 'neutral'),
      })
    );

    if (ctx.status(BUDGET) === 'ok') {
      const cap = ctx.attr<number>(BUDGET, 'daily_cap');
      out.push(
        listRow({
          primary: ctx.t('limiteur.budget'),
          secondary: cap !== undefined ? ctx.t('limiteur.budget_of', { cap }) : undefined,
          trailing: ctx.entity(BUDGET)?.state,
        })
      );
    }

    if (ctx.status(CALLS) === 'ok') {
      out.push(
        listRow({ primary: ctx.t('limiteur.calls_today'), trailing: ctx.entity(CALLS)?.state })
      );
      const byTier = ctx.attr<Record<string, number>>(CALLS, 'by_tier') ?? {};
      const tiers = Object.entries(byTier);
      if (tiers.length > 0) {
        out.push(html`<div class="title">${ctx.t('limiteur.by_tier')}</div>`);
        for (const [tier, n] of tiers) {
          out.push(listRow({ primary: tier, trailing: String(n) }));
        }
      }
    }

    if (ctx.status(LAST) === 'ok') {
      out.push(
        listRow({
          primary: ctx.t('limiteur.last_collection'),
          secondary: ctx.attr<string>(LAST, 'tier'),
          trailing: formatRelative(ctx.entity(LAST)?.state, lang),
        })
      );
    }

    if (ctx.status(NEXT) === 'ok') {
      const due = ctx.attr<string[]>(NEXT, 'tiers_due') ?? [];
      out.push(
        listRow({
          primary: ctx.t('limiteur.next_collection'),
          secondary: due.length > 0 ? due.join(', ') : ctx.t('limiteur.none'),
          trailing: formatRelative(ctx.entity(NEXT)?.state, lang),
        })
      );
    }

    if (ctx.config.show_refresh) {
      // Un boost est plafonné à un par palier et par intervalle : le bouton se
      // grise après appel, parce qu'une interface qui laisse cliquer sans
      // effet est une interface qui ment. L'appel ne part jamais d'ici — il
      // ne part que depuis ce gestionnaire de clic, jamais depuis render.
      out.push(html`
        <div class="row">
          <button
            ?disabled=${ctx.refreshCoolingDown}
            @click=${() => {
              void ctx.refresh(ctx.config.refresh_tier);
            }}
          >
            ${ctx.refreshCoolingDown ? ctx.t('common.refresh_pending') : ctx.t('common.refresh')}
          </button>
        </div>
        <div class="notice">${ctx.t('limiteur.refresh_note')}</div>
      `);
    }

    return html`${out}`;
  },
};
