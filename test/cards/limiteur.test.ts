import { beforeAll, describe, expect, it, vi } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/limiteur';
import { makeHass } from '../fixtures/hass';
import { mountCard, text } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-limiteur': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const compte = (key: string, entity_id: string, state: string, attributes = {}) =>
  ({ key, entity_id, device: 'dev_compte' as const, state, attributes });

describe('carte limiteur', () => {
  it("résout les entités de compte depuis le device_id de l'enfant", async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal')]);
    const el = await mountCard('pronote-ng-limiteur', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('Nominal');
  });

  it('affiche budget, appels par palier et paliers en attente', async () => {
    const hass = makeHass([
      compte('sensor:limiter_state', 'sensor.cpt_etat', 'throttled', { reason: 'quota' }),
      compte('sensor:remaining_budget', 'sensor.cpt_budget', '120', { daily_cap: 400 }),
      compte('sensor:calls_today', 'sensor.cpt_appels', '280', {
        by_tier: { timetable: 100, marks: 80 },
      }),
      compte('sensor:next_collection', 'sensor.cpt_prochaine', '2026-09-08T09:00:00+02:00', {
        tiers_due: ['marks'],
      }),
    ]);
    const el = await mountCard('pronote-ng-limiteur', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).toContain('Bridé');
    expect(t).toContain('120');
    expect(t).toContain('400');
    expect(t).toContain('timetable');
    expect(t).toContain('marks');
  });

  it("n'affiche jamais l'empreinte de session", async () => {
    const hass = makeHass([
      compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal'),
      compte('sensor:session_age', 'sensor.cpt_age', '3600', {
        session_id_hash: 'abc123',
        opened_at: '2026-09-08T06:00:00+02:00',
      }),
    ]);
    const el = await mountCard('pronote-ng-limiteur', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).not.toContain('abc123');
  });

  it('appelle pronote_ng.refresh sur clic et non au montage', async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal')]);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard(
      'pronote-ng-limiteur',
      { device_id: 'dev_enfant', show_refresh: true },
      hass
    );
    expect(spy).not.toHaveBeenCalled();
    // Le sélecteur simple 'button' correspond à l'overload typé de
    // `querySelector` (HTMLButtonElement | null) : pas besoin de conversion.
    const button = el.shadowRoot?.querySelector('button');
    expect(button).not.toBeNull();
    button?.click();
    await el.updateComplete;
    expect(spy).toHaveBeenCalledWith('pronote_ng', 'refresh', {}, { device_id: 'dev_enfant' });
  });

  it('grise le bouton pendant l’intervalle de garde suivant un refresh', async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal')]);
    hass.callService = vi.fn().mockResolvedValue(undefined);
    const el = await mountCard(
      'pronote-ng-limiteur',
      { device_id: 'dev_enfant', show_refresh: true },
      hass
    );
    const button = el.shadowRoot?.querySelector('button');
    expect(button?.disabled).toBe(false);
    button?.click();
    // ctx.refresh() attend d'abord hass.callService (une microtâche) avant de
    // poser refreshedAt : on laisse la file de microtâches se vider avant de
    // ré-attendre le prochain cycle de rendu de Lit.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
    expect(button?.disabled).toBe(true);
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'unavailable')]);
    const el = await mountCard('pronote-ng-limiteur', { device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard('pronote-ng-limiteur', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('sensor:limiter_state');
  });
});
