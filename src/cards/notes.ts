import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { formatGrade } from '../core/format';
import { emptyState, listRow } from '../core/ui/parts';
import { latestFirst, listAttr } from '../core/list';

type Section = 'average' | 'latest' | 'subjects' | 'report_card';

interface Config extends PronoteCardConfig {
  sections?: Section[];
  limit?: number;
}

interface Grade {
  subject?: string;
  grade?: number | string;
  out_of?: number | string;
  coefficient?: number;
  date?: string;
  class_average?: number | string;
  status?: string;
}

interface Average {
  subject?: string;
  average?: number | string;
  student?: number | string;
  class_average?: number | string;
}

const OVERALL: EntityKey = 'sensor:overall_average';
const GRADES: EntityKey = 'sensor:grades';
const AVERAGES: EntityKey = 'sensor:averages';
const CLASS: EntityKey = 'sensor:class_average';
const LATEST: EntityKey = 'sensor:latest_grade';
const PERIOD: EntityKey = 'sensor:current_period';
const REPORT: EntityKey = 'sensor:report_card';

const sectionsOf = (c: Config): Section[] =>
  c.sections && c.sections.length > 0 ? c.sections : ['average', 'latest', 'subjects'];

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-notes',
  name: 'Pronote NG — Notes',
  description: 'Moyennes, dernières notes et moyennes par matière.',
  key: 'notes',
  scope: 'child',
  size: 6,
  stub: { sections: ['average', 'latest', 'subjects'] },
  requires: () => [],
  requiresAny: () => [OVERALL, GRADES, AVERAGES],
  optional: () => [CLASS, LATEST, PERIOD, REPORT],
  schema: (_config: Config, t?: Translate) => {
    const tr = t ?? ((path: string) => path);
    return [
      {
        name: 'sections',
        selector: {
          select: {
            multiple: true,
            options: [
              { value: 'average', label: tr('notes.section_average') },
              { value: 'latest', label: tr('notes.section_latest') },
              { value: 'subjects', label: tr('notes.section_subjects') },
              { value: 'report_card', label: tr('notes.section_report_card') },
            ],
          },
        },
      },
      { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
    ];
  },
  render(ctx: RenderCtx<Config>): TemplateResult {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const blocks: TemplateResult[] = [];

    if (wanted.includes('average') && ctx.status(OVERALL) === 'ok') {
      const overall = ctx.entity(OVERALL);
      blocks.push(
        listRow({
          primary: ctx.t('notes.student'),
          trailing: formatGrade(
            overall?.state,
            ctx.attr<number | string>(OVERALL, 'out_of'),
            ctx.language
          ),
        })
      );
      if (ctx.status(CLASS) === 'ok') {
        const classEntity = ctx.entity(CLASS);
        blocks.push(
          listRow({
            primary: ctx.t('notes.class'),
            trailing: formatGrade(
              classEntity?.state,
              ctx.attr<number | string>(CLASS, 'out_of'),
              ctx.language
            ),
          })
        );
      }
    }

    if (wanted.includes('latest')) {
      // Une sentinelle (|1 à |8) rend l'état non numérique : le motif est
      // dans l'attribut `status`, et c'est lui qu'il faut montrer — jamais
      // un vide. `sensor:latest_grade` n'est consulté ici QUE pour ce motif
      // (déclenché seulement quand son état est `unavailable`, donc jamais
      // pour une vraie note) : une vraie note y figurant déjà dans les
      // éléments de `sensor:grades` ci-dessous, la reprendre ici serait un
      // doublon plutôt qu'un oubli.
      const latestStatus = ctx.attr<string>(LATEST, 'status');
      if (ctx.status(LATEST) === 'unavailable' && latestStatus) {
        blocks.push(
          listRow({
            // `notes.name` est le nom de la carte, pas le motif d'une note :
            // un libellé trompeur en repli. `notes.latest_grade` nomme
            // vraiment la ligne quand la matière elle-même est absente.
            primary: ctx.attr<string>(LATEST, 'subject') ?? ctx.t('notes.latest_grade'),
            trailing: latestStatus,
          })
        );
      }
      // Les plus récentes en tête, sans muter l'attribut, et robuste à une
      // forme inattendue (objet, chaîne, trous) : `latestFirst` s'en charge.
      const items = latestFirst<Grade>(ctx.attr(GRADES, 'items'), c.limit ?? 8);
      for (const g of items) {
        blocks.push(
          listRow({
            primary: g.subject ?? '—',
            secondary:
              g.coefficient != null
                ? ctx.t('notes.coefficient', {
                    value: g.coefficient.toLocaleString(ctx.language),
                  })
                : undefined,
            trailing: g.status ?? formatGrade(g.grade, g.out_of, ctx.language),
          })
        );
      }
    }

    if (wanted.includes('subjects')) {
      const items = listAttr<Average>(ctx.attr(AVERAGES, 'items'));
      for (const a of items) {
        blocks.push(
          listRow({
            primary: a.subject ?? '—',
            secondary:
              a.class_average != null
                ? `${ctx.t('notes.class')} ${formatGrade(a.class_average, undefined, ctx.language)}`
                : undefined,
            trailing: formatGrade(a.average ?? a.student, undefined, ctx.language),
          })
        );
      }
    }

    if (wanted.includes('report_card') && ctx.status(REPORT) === 'ok') {
      // La forme des attributs de `sensor:report_card` n'a pas été vérifiée
      // sur une instance PRONOTE réelle (liste de matières ? appréciation
      // générale ? simple date de publication ?) : faute de certitude, on se
      // limite à l'état, seul rendu que `ctx.status` garantit exploitable —
      // à enrichir une fois la forme confirmée sur une instance réelle.
      blocks.push(
        listRow({
          primary: ctx.t('notes.section_report_card'),
          trailing: ctx.entity(REPORT)?.state,
        })
      );
    }

    // La période en cours est une information transverse, pas une section :
    // elle s'affiche dès que résolue et exploitable, quelles que soient les
    // sections choisies, et ne compte pas dans le calcul du vide ci-dessous.
    // `current_period` devient *indisponible* plutôt que faux quand
    // l'intégration ne peut pas la déterminer (spec §5.1) : ne rien afficher
    // dans ce cas vaut mieux qu'une période fausse.
    const periodRow =
      ctx.status(PERIOD) === 'ok'
        ? listRow({ primary: ctx.t('notes.period'), trailing: ctx.entity(PERIOD)?.state })
        : undefined;

    if (blocks.length === 0) {
      // Une carte configurée sur la seule section « par matière » n'a rien
      // à voir avec des notes : le message générique mentirait.
      const subjectsOnly = wanted.length === 1 && wanted[0] === 'subjects';
      return html`
        ${periodRow ?? ''}${emptyState(ctx.t(subjectsOnly ? 'notes.empty_averages' : 'notes.empty'))}
      `;
    }
    return html`${periodRow ?? ''}${blocks}`;
  },
};
