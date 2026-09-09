import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { emptyState, listRow } from '../core/ui/parts';
import { listAttr } from '../core/list';

interface Config extends PronoteCardConfig {
  day?: 'today' | 'tomorrow';
}

const TODAY: EntityKey = 'sensor:menu_today';
const TOMORROW: EntityKey = 'sensor:menu_tomorrow';

const SECTIONS = [
  'first_meal',
  'main_meal',
  'side_meal',
  'cheese',
  'dessert',
  'other_meal',
] as const;

/** Garde de type : distingue un objet portant un `name` qui est bien une chaîne. */
const hasStringName = (v: unknown): v is { name: string } =>
  typeof v === 'object' && v !== null && 'name' in v && typeof v.name === 'string';

/** Les trois formes rencontrées : chaîne, tableau de chaînes, tableau d'objets. */
const dishes = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  return listAttr<unknown>(value)
    .map((v) => {
      if (typeof v === 'string') return v;
      if (hasStringName(v)) return v.name;
      return '';
    })
    .filter(Boolean);
};

const keyFor = (c: Config): EntityKey => (c.day === 'tomorrow' ? TOMORROW : TODAY);

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-menu',
  name: 'Pronote NG — Cantine',
  description: 'Le menu du jour ou du lendemain, plat par plat.',
  key: 'menu',
  scope: 'child',
  size: 4,
  stub: { day: 'today' },
  // L'état de ces capteurs reste `unknown` même quand la collecte a réussi :
  // un nombre de plats à zéro affirmerait qu'un menu existe. Toute
  // l'information vit dans les attributs, et c'est donc à cette carte de
  // distinguer « pas de menu ce jour » de « pas encore collecté » — le socle
  // ne peut pas le faire pour elle.
  attributeDriven: true,
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: (_config: Config, t?: Translate) => {
    const tr = t ?? ((path: string) => path);
    return [
      {
        name: 'day',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'today', label: tr('menu.today') },
              { value: 'tomorrow', label: tr('menu.tomorrow') },
            ],
          },
        },
      },
    ];
  },
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const dayLabel = ctx.t(ctx.config.day === 'tomorrow' ? 'menu.tomorrow' : 'menu.today');
    const heading = html`<div class="title">${dayLabel}</div>`;
    const rows: TemplateResult[] = [];

    for (const section of SECTIONS) {
      const items = dishes(ctx.attr(key, section));
      if (items.length === 0) continue;
      rows.push(
        listRow({
          primary: ctx.t(`menu.${section}`),
          trailing: items.join(' · '),
        })
      );
    }

    if (rows.length > 0) return html`${heading}${rows}`;

    /**
     * Deux vides, deux phrases, et c'est cette carte seule qui peut les
     * distinguer (voir `attributeDriven`).
     *
     * `published` porte la distinction : `false` veut dire que la collecte a
     * réussi et que l'établissement ne publie rien ce jour-là. Avant que
     * l'intégration ne l'expose, les sept clés disparaissaient toutes dans ce
     * cas, et « pas de menu » était indiscernable de « pas encore collecté » —
     * un parent lisait « pas encore collectée » pour une donnée qui n'existe
     * pas.
     *
     * Sans `published` (intégration plus ancienne), on retombe sur la
     * présence des sept clés : au moins une présente signifie que quelque
     * chose est arrivé.
     */
    const published = ctx.attr<boolean>(key, 'published');
    const collected =
      // Un état exploitable suffit à prouver que la collecte a eu lieu ; les
      // attributs ne servent à trancher que dans le cas `unknown`, celui que
      // `attributeDriven` fait justement parvenir jusqu'ici.
      ctx.status(key) === 'ok' ||
      published !== undefined ||
      SECTIONS.some((s) => ctx.attr(key, s) !== undefined);
    const message = collected ? ctx.t('menu.empty') : ctx.t('common.unavailable');
    return html`${heading}${emptyState(message)}`;
  },
};
