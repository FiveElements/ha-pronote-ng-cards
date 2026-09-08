import { html, type TemplateResult } from 'lit';
import type { Translate } from '../types';

export type Tone = 'neutral' | 'ok' | 'warn' | 'problem';

export const chip = (label: string, tone: Tone = 'neutral'): TemplateResult =>
  html`<span class="chip ${tone === 'neutral' ? '' : tone}">${label}</span>`;

/** État « vide » : l'information EST le vide. Message fourni par la carte. */
export const emptyState = (message: string): TemplateResult =>
  html`<div class="notice">${message}</div>`;

/** État « indisponible » : transitoire, pas une erreur. */
export const unavailableState = (t: Translate): TemplateResult =>
  html`<div class="notice">${t('common.unavailable')}</div>`;

/** État « entité absente » : demande une action de l'utilisateur. */
export const missingState = (keys: readonly string[], t: Translate): TemplateResult => html`
  <div class="notice problem">
    ${t('common.missing_body')}
    ${keys.map((k) => html`<code>${k}</code> `)}
  </div>
  <div class="notice">${t('common.missing_hint')}</div>
`;

export interface RowOptions {
  primary: string | TemplateResult;
  secondary?: string | TemplateResult;
  trailing?: string | TemplateResult;
  canceled?: boolean;
}

export const listRow = (o: RowOptions): TemplateResult => html`
  <div class="row ${o.canceled ? 'canceled' : ''}">
    <span class="primary">${o.primary}</span>
    ${o.secondary ? html`<span class="secondary">${o.secondary}</span>` : ''}
    ${o.trailing ? html`<span class="trailing">${o.trailing}</span>` : ''}
  </div>
`;
