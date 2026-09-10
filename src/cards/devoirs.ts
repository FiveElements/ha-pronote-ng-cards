import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx, Translate } from '../core/types';
import { chip, emptyState, listRow } from '../core/ui/parts';
import { listAttr, sortedBy } from '../core/list';
import { formatDayLabel, parseTimestamp, plainText } from '../core/format';
import { subjectAccent } from '../core/subject-color';

interface Config extends PronoteCardConfig {
  filter?: 'todo' | 'tomorrow' | 'all';
  group_by?: 'date' | 'subject';
  limit?: number;
  /**
   * Table matière → couleur, renseignée par l'utilisateur.
   *
   * C'est le **deuxième** rang de couleur, et un secours : `subjectAccent`
   * préfère la couleur du serveur, que l'intégration publie désormais sur
   * chaque devoir (`background_color`). Cette table ne sert donc plus qu'à
   * colorer une matière que l'établissement laisse vide, ou à remplacer une
   * teinte illisible dans un thème.
   *
   * Le commentaire précédent affirmait l'inverse : que l'intégration « ne la
   * publie pas encore » et que cette table était le seul rang qui produise
   * quelque chose. C'était vrai à l'écriture et faux depuis, ce qui est le
   * pire état pour un commentaire : il conseillait de remplir la table alors
   * que le premier rang gagne partout. Mesuré le 10 septembre 2026 sur une
   * instance — les vingt devoirs portent `background_color`, en hexadécimal
   * strict, six teintes distinctes. La page de documentation, elle, était à
   * jour : elle datait la bascule de la version 0.0.13 de l'intégration.
   *
   * Absente du formulaire d'éditeur, et pour une raison : aucun sélecteur
   * `ha-form` ne rend correctement un dictionnaire ouvert dont les clés sont
   * les matières de l'établissement. En YAML, l'utilisateur a au moins la
   * coloration syntaxique de Home Assistant.
   */
  subject_colors?: Record<string, string>;
  /**
   * Nombre de lignes d'énoncé avant repli. Absente ou zéro : aucun repli.
   *
   * L'énoncé est le **contenu** de cette carte, pas sa décoration : le
   * tronquer par défaut cacherait la moitié d'un devoir à quelqu'un qui ne
   * sait pas qu'il y a une moitié cachée. D'où une option, et non un
   * comportement.
   *
   * Ce qui la rend acceptable est que le repli **se signale tout seul** :
   * `-webkit-line-clamp` peint des points de suspension, et seulement quand
   * le texte déborde réellement. Le bloc est un `details` : le lecteur le
   * déplie d'un clic ou d'une touche, et le texte entier reste dans le DOM
   * pendant qu'il est replié.
   *
   * Mesuré le 10 septembre 2026 sur une instance : les énoncés vont jusqu'à
   * 313 caractères, un seul d'entre eux occupait 161 pixels, et la carte
   * atteignait 1 376 pixels pour quinze devoirs. C'est ce qui a motivé
   * l'option, et c'est aussi ce que `size` doit avouer.
   */
  max_lines?: number;
  /**
   * Afficher les pièces jointes d'un devoir. Vrai par défaut.
   *
   * L'intégration publie `attachments` sur chaque devoir, et la carte l'a
   * ignoré pendant onze versions. Mesuré le 10 septembre 2026 : douze pièces
   * réparties sur neuf devoirs des vingt, deux au plus par devoir, des
   * chaînes de treize à trente-neuf caractères dont huit portent une
   * extension de fichier. Un devoir qui demande d'ouvrir un document ne le
   * disait donc pas.
   *
   * Ce sont des **noms**, pas des liens, et la carte les rend en texte. Elle
   * ne peut pas les ouvrir de toute façon : il faudrait un appel de service,
   * que le projet interdit au rendu et que le type refuse à la compilation.
   *
   * Si une version future publiait des adresses, elles ne devraient pas pour
   * autant devenir des liens sans qu'on ait d'abord établi ce qu'elles
   * donnent à qui les suit. Aucune de celles mesurées n'en contenait, et la
   * prudence par défaut est celle qui s'applique à l'URL iCal : une adresse
   * qui ouvre le dossier d'un élève sans demander d'identifiant se traite
   * comme un mot de passe.
   */
  show_attachments?: boolean;
}

interface Homework {
  id?: string;
  subject?: string;
  /** L'énoncé tel que PRONOTE l'envoie : du HTML, balises et entités comprises. */
  description?: string;
  /**
   * Le même énoncé en texte simple, publié par l'intégration.
   *
   * C'est la bonne source : la conversion appartient au module qui SAIT que
   * le champ est du HTML, sinon trois cartes donnent trois réponses
   * différentes au même `&amp;amp;`. `plainText` reste le repli, pour les
   * installations dont l'intégration est antérieure à ce champ.
   */
  description_text?: string;
  due?: string;
  done?: boolean;
  /**
   * La couleur de la matière (`CouleurFond`), le même code visuel que sur
   * l'emploi du temps. `unknown` : chaîne de serveur, filtrée par
   * `subjectColor` avant d'atteindre un attribut `style`.
   */
  background_color?: unknown;
  /**
   * Les pièces jointes du devoir, telles que l'intégration les publie.
   *
   * `unknown` et non `string[]` : mesurées comme des chaînes le 10 septembre
   * 2026 — douze pièces, aucune vide, aucune adresse — mais rien ne l'impose
   * à l'exécution, et `FORMES.md` retient la leçon inverse : trois des
   * défauts les plus coûteux de ce dépôt viennent d'une forme supposée.
   * `attachmentsOf` filtre, plutôt que le type promettre.
   */
  attachments?: unknown;
}

const TODO: EntityKey = 'sensor:homework_todo';
const TOMORROW: EntityKey = 'sensor:homework_tomorrow';
const ALL: EntityKey = 'sensor:homework';
const OVERDUE: EntityKey = 'binary_sensor:homework_overdue';
const TODO_LIST: EntityKey = 'todo:homework';
/**
 * Le calendrier des devoirs. Trois entités distinctes portent le même
 * `translation_key` sur des domaines différents — `sensor:homework`,
 * `calendar:homework` et `todo:homework` — d'où la qualification par domaine
 * de toutes les clés du projet.
 *
 * Ce que cette entité apporte et que la liste ne peut pas montrer : la
 * prochaine échéance QUEL QUE SOIT le filtre. En mode « demain », tout ce qui
 * tombe plus tard est invisible ; le calendrier, lui, la nomme.
 */
const CALENDAR: EntityKey = 'calendar:homework';

/**
 * Bit UPDATE_TODO_ITEM de `TodoListEntityFeature`, côté Home Assistant.
 * `2` est `DELETE_TODO_ITEM` (un bit différent) : `UPDATE_TODO_ITEM` vaut `4`.
 */
const UPDATE_ITEM = 4;

const keyFor = (c: Config): EntityKey =>
  c.filter === 'tomorrow' ? TOMORROW : c.filter === 'all' ? ALL : TODO;

const emptyFor = (c: Config): string =>
  c.filter === 'tomorrow'
    ? 'devoirs.empty_tomorrow'
    : c.filter === 'all'
      ? 'devoirs.empty_all'
      : 'devoirs.empty_todo';

/** Clé de jour calendaire (AAAA-MM-JJ) dans le fuseau donné : compare des jours, pas des instants. */
const dayKey = (d: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

/**
 * Un devoir est en retard si son échéance (jour calendaire) est strictement
 * avant aujourd'hui **et qu'il n'est pas fait**.
 *
 * `done` fait partie de la définition, ce n'est pas un raffinement. Un devoir
 * coché dont l'échéance est passée est le cas NORMAL — on coche après avoir
 * fait, et l'échéance passe ensuite — donc l'oublier ne produit pas un défaut
 * rare : ça produit une carte qui crie au retard sur son propre historique,
 * et d'autant plus fort que l'élève a travaillé.
 *
 * Mesuré le 10 septembre 2026 sur une instance, avec `filter: all` : neuf
 * lignes portaient la pastille pour quatre devoirs réellement en retard, et
 * les cinq de trop étaient exactement les cinq devoirs cochés. L'intégration
 * comptait quatre, elle, sur `count` de `binary_sensor:homework_overdue` —
 * donc la carte et l'intégration se contredisaient sur la même page, et
 * c'est la carte qui avait tort.
 */
const isOverdue = (h: Homework, timeZone: string): boolean => {
  if (h.done === true) return false;
  const d = parseTimestamp(h.due);
  return d !== undefined && dayKey(d, timeZone) < dayKey(new Date(), timeZone);
};

/**
 * `limit` absent ou négatif = tout ; `limit: 0` = rien.
 *
 * Et « rien » a besoin d'être DIT, avec ses propres mots : voir la garde
 * `devoirs.limit_zero` dans `render`. Zéro devoir affiché parce que la limite
 * vaut zéro n'est pas zéro devoir à faire.
 */
const truncate = <T>(items: T[], limit: number | undefined): T[] =>
  limit === undefined || limit < 0 ? items : items.slice(0, limit);

/**
 * Largeur supposée d'une ligne d'énoncé, en caractères.
 *
 * Volontairement **généreuse**. Mesuré dans le navigateur : une carte de 380
 * pixels tient environ 66 caractères par ligne à la taille de l'énoncé. En
 * comptant 80, l'estimation ci-dessous sous-évalue le nombre de lignes, donc
 * la carte replie **moins** souvent qu'il ne faudrait.
 *
 * C'est le sens sûr de l'erreur, et c'est pour ça que le chiffre est haut :
 * ne pas replier un énoncé qui aurait pu l'être rend la carte plus haute,
 * ce qui se voit et ne trompe personne. Replier un énoncé qui tenait
 * déjà poserait un bloc dépliable sans rien dedans — annoncé comme tel à
 * un lecteur d'écran, qui irait chercher un contenu inexistant.
 *
 * Aucune mesure du DOM ici, et c'est délibéré : la largeur réelle n'existe
 * qu'après rendu, et la lire déclencherait un rendu supplémentaire à chaque
 * évènement de la maison, multiplié par le nombre de devoirs.
 */
const CHARS_PAR_LIGNE = 80;

/**
 * Le nombre de lignes qu'un énoncé occupera, au plus bas.
 *
 * Les retours à la ligne comptent : `plainText` en pose de vrais, et
 * `white-space: pre-line` les rend. Un énoncé de cent caractères sur six
 * lignes occupe six lignes, pas deux — un simple compte de caractères
 * l'aurait manqué, et c'est la forme la plus courante d'un énoncé en liste.
 */
const lignesEstimees = (texte: string): number =>
  texte
    .split('\n')
    .reduce((total, ligne) => total + Math.max(1, Math.ceil(ligne.length / CHARS_PAR_LIGNE)), 0);

/**
 * Les pièces jointes utilisables d'un devoir, débarrassées du reste.
 *
 * Mesurées comme des chaînes, mais rien ne le garantit à l'exécution : une
 * version de l'intégration qui passerait à des objets ferait sinon rendre
 * « [object Object] » à la carte. Tout ce qui n'est pas une chaîne non vide
 * est écarté, et une liste qui n'en contient aucune n'affiche pas de ligne
 * — pas de ligne vide annonçant des pièces absentes.
 */
const attachmentsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
        .map((item) => item.trim())
    : [];

/** `max_lines`, en entier positif, ou zéro pour « pas de repli ». */
const maxLinesOf = (value: unknown): number => {
  const lines = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof lines !== 'number' || !Number.isFinite(lines)) return 0;
  return Math.max(0, Math.trunc(lines));
};

interface Group {
  label: string;
  items: Homework[];
}

/**
 * Regroupe une liste déjà triée par le même critère : les éléments qui
 * partagent la même clé de regroupement se suivent donc dans le tableau, et
 * l'ordre d'apparition des groupes suit l'ordre du tri.
 */
const groupOf = (
  items: Homework[],
  by: 'date' | 'subject',
  timeZone: string,
  language: string
): Group[] => {
  const groups: Group[] = [];
  const index = new Map<string, Group>();
  for (const h of items) {
    const label =
      by === 'subject'
        ? (h.subject ?? '—')
        : h.due
          ? formatDayLabel(h.due, language, timeZone) || '—'
          : '—';
    let g = index.get(label);
    if (!g) {
      g = { label, items: [] };
      index.set(label, g);
      groups.push(g);
    }
    g.items.push(h);
  }
  return groups;
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-devoirs',
  name: 'Pronote NG — Devoirs',
  description: 'Les devoirs à faire, avec échéance et matière.',
  key: 'devoirs',
  scope: 'child',
  /**
   * La hauteur annoncée à Home Assistant, qui s'en sert pour équilibrer les
   * colonnes d'une vue en maconnerie.
   *
   * Elle valait **5** — soit environ 250 pixels — pour une carte mesurée le
   * 10 septembre 2026 à **1 376 pixels** avec le filtre « à faire » et
   * **1 647** avec « tous ». Un facteur cinq, et le plus large écart du
   * dépôt : c'est la carte la plus haute des onze, et elle s'annonçait
   * comme l'une des plus courtes.
   *
   * Ce que cette fonction ne peut pas faire, et qu'il faut savoir avant de
   * chercher à l'affiner : la hauteur dépend surtout de la LONGUEUR des
   * énoncés, qui est une donnée et non une configuration. `size` ne reçoit
   * que la configuration. Les nombres par filtre ci-dessous sont donc des
   * ordres de grandeur relevés sur une instance, pas des vérités : six
   * devoirs pour « demain », quinze à faire, vingt en tout. Un `limit`
   * explicite, lui, est exact et le remplace.
   *
   * Rester approximatif et honnête vaut mieux que précis et faux : Home
   * Assistant n'a besoin que d'un classement entre cartes.
   */
  size: (c: Config) => {
    const devoirs =
      c.limit !== undefined && c.limit >= 0
        ? c.limit
        : c.filter === 'tomorrow'
          ? 6
          : c.filter === 'all'
            ? 20
            : 15;
    /**
     * Le coût d'un devoir, en **centièmes** d'unité.
     *
     * Déplié : près de deux unités, soit environ 32 pixels de cadre et de
     * titre plus dix-sept par ligne d'énoncé, pour une moyenne mesurée à
     * deux lignes et huit. Replié : ce que ses lignes coûtent, et jamais
     * plus que déplié — replier ne peut que raccourcir.
     *
     * En entiers, et pas en décimaux, parce que la première version l'était
     * et que ça se voyait : `0.65 + 3 * 0.35` vaut 1.6999999999999997,
     * donc quinze devoirs donnaient 27.499999999999996 et `Math.round`
     * rendait **27** là où l'arithmétique exacte dit 27,5 et donc 28. Un
     * écart d'une unité sans importance en soi, mais qui rendait le résultat
     * dépendant de l'erreur de représentation : impossible à prédire de
     * tête, donc impossible à documenter juste. Une session voisine l'a
     * d'ailleurs calculé à 28 pour sa page, de bonne foi.
     */
    const maxLines = maxLinesOf(c.max_lines);
    const parDevoir = maxLines > 0 ? Math.min(190, 65 + maxLines * 35) : 190;
    // Le plancher de trois couvre `limit: 0`, qui ne rend qu'une phrase.
    return Math.max(3, Math.round((200 + devoirs * parDevoir) / 100));
  },
  stub: { filter: 'todo', group_by: 'date' },
  requires: (c) => [keyFor(c)],
  optional: () => [OVERDUE, TODO_LIST, CALENDAR],
  schema: (_config: Config, t?: Translate) => [
    {
      name: 'filter',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'todo', label: t ? t('devoirs.filter_todo') : 'À faire' },
            { value: 'tomorrow', label: t ? t('devoirs.filter_tomorrow') : 'Pour demain' },
            { value: 'all', label: t ? t('devoirs.filter_all') : 'Tous' },
          ],
        },
      },
    },
    {
      name: 'group_by',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'date', label: t ? t('devoirs.group_date') : 'Échéance' },
            { value: 'subject', label: t ? t('devoirs.group_subject') : 'Matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
    // Une borne basse à 2 : replier à une seule ligne ne laisse pas assez
    // d'énoncé pour reconnaître le devoir. Le zéro du YAML reste accepté par
    // `maxLinesOf` et vaut « pas de repli », mais le formulaire ne le
    // propose pas : il a un interrupteur pour ça, l'option vide.
    { name: 'max_lines', selector: { number: { min: 2, max: 20, step: 1, mode: 'box' } } },
    { name: 'show_attachments', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const raw = listAttr<Homework>(ctx.attr(key, 'items'));

    /**
     * La prochaine échéance vue par le calendrier.
     *
     * Seuls les ATTRIBUTS de l'entité sont lus. Obtenir la liste complète de
     * ses évènements demanderait un appel de service — donc une collecte au
     * rendu, que le projet interdit, et que le type `AllowedCall` refuse de
     * toute façon à la compilation.
     *
     * Affichée seulement quand elle ajoute quelque chose : avec le filtre
     * « tous », la liste montre déjà tout, et la ligne ne ferait que répéter
     * sa première entrée.
     */
    const nextDue = ((): TemplateResult | '' => {
      if (ctx.config.filter === 'all' || ctx.status(CALENDAR) !== 'ok') return '';
      const message = ctx.attr<string>(CALENDAR, 'message');
      const startsAt = ctx.attr<string>(CALENDAR, 'start_time');
      const when = startsAt ? formatDayLabel(startsAt, ctx.language, ctx.timeZone) : '';
      // Un calendrier sans évènement à venir ne porte ni intitulé ni date :
      // il se tait, plutôt que d'afficher une ligne creuse.
      if (!message && !when) return '';
      return listRow({
        primary: ctx.t('devoirs.next_due'),
        secondary: message,
        trailing: when || undefined,
        // La gouttière est réservée sans être colorée : cette ligne n'est pas
        // une matière, mais la liste est désormais codée par couleur et une
        // ligne sans gouttière se décalerait de neuf pixels vers la gauche.
        // Voir `RowOptions.accent`, troisième valeur.
        accent: null,
      });
    })();

    // `nextDue` survit à l'état vide, et c'est le moment où il sert le plus :
    // rien à rendre dans la fenêtre choisie, mais une échéance existe plus
    // loin. Le rendre après un retour anticipé le jetterait — le défaut exact
    // qui a déjà été corrigé sur deux autres cartes de ce projet.
    if (raw.length === 0) {
      return html`${nextDue}${emptyState(ctx.t(emptyFor(ctx.config)))}`;
    }

    const maxLines = maxLinesOf(ctx.config.max_lines);
    const by = ctx.config.group_by ?? 'date';
    const sorted = sortedBy(raw, (a, b) =>
      by === 'subject'
        ? (a.subject ?? '').localeCompare(b.subject ?? '')
        : (parseTimestamp(a.due)?.getTime() ?? Infinity) -
          (parseTimestamp(b.due)?.getTime() ?? Infinity)
    );

    const limited = truncate(sorted, ctx.config.limit);

    const overdueOn = ctx.entity(OVERDUE)?.state === 'on';
    /**
     * Le nombre de devoirs en retard, que l'intégration publie et que cette
     * carte jetait.
     *
     * « en retard » tout court laissait le lecteur sans le seul chiffre qui
     * dise s'il faut s'en occuper ce soir. Il compte d'autant plus avec le
     * filtre « pour demain » : le bandeau est alors le seul endroit d'où
     * l'information arrive, aucune ligne visible ne portant de retard.
     *
     * Le repli sur le libellé nu couvre une intégration antérieure à
     * l'attribut. La condition porte sur « strictement positif » et non sur
     * « présent » : un zéro publié pendant que l'état vaut `on` est une
     * contradiction de l'intégration, et « 0 en retard » sur un bandeau
     * rouge serait la façon la plus sûre de la rendre illisible.
     *
     * Les quatre traductions emploient une locution **invariable** — « en
     * retard », « con retraso », « in ritardo », « em atraso » — pour
     * qu'une seule forme serve tous les comptes. L'espagnol l'imposait :
     * l'adjectif du libellé nu, « atrasado », s'accorde, donc ni le
     * singulier ni le pluriel n'aurait convenu aux deux.
     */
    const overdueCount = ctx.attr<number>(OVERDUE, 'count');
    const overdueLabel =
      typeof overdueCount === 'number' && Number.isFinite(overdueCount) && overdueCount > 0
        ? ctx.t('devoirs.overdue_count', { count: overdueCount })
        : ctx.t('devoirs.overdue');
    // Passe par `listRow` plutôt que par un `div` de classe `row` écrit ici :
    // la bannière doit réserver la gouttière comme les lignes de devoir, et
    // `listRow` est le seul endroit qui sache la poser.
    const overdueBanner = overdueOn
      ? listRow({ primary: chip(overdueLabel, 'problem'), accent: null })
      : '';

    /**
     * `limit: 0` : la liste n'est pas vide, c'est l'affichage qui est à zéro.
     *
     * Sans cette garde la carte rendait une **coquille** : ni titre, ni ligne,
     * ni message. Mesuré le 10 septembre 2026 — quatre-vingt-neuf pixels
     * portant la seule pastille « en retard » et la ligne de prochaine
     * échéance, au-dessus de quinze devoirs invisibles et inexpliqués.
     *
     * Et le message d'état vide ordinaire ne convient pas : « rien à faire »
     * au-dessus de quinze devoirs à faire serait FAUX, du même genre que le
     * retard qui ignorait `done`. D'où une phrase à elle, qui nomme la cause
     * au lieu de la cacher — c'est la seule façon de rendre l'option
     * réversible pour qui l'a posée sans y penser.
     *
     * La bannière et la prochaine échéance restent : elles ne dépendent pas de
     * la liste affichée, et c'est ici qu'elles sont le plus utiles.
     */
    if (limited.length === 0) {
      return html`${overdueBanner}${nextDue}${emptyState(ctx.t('devoirs.limit_zero'))}`;
    }

    // La coche n'existe que si l'intégration annonce l'écriture. On lit la
    // capacité, on ne la suppose pas.
    const todoId = ctx.entityId(TODO_LIST);
    const features = ctx.attr<number>(TODO_LIST, 'supported_features') ?? 0;
    const writable = Boolean(todoId) && (features & UPDATE_ITEM) !== 0;

    // L'identifiant retenu pour désigner le devoir côté service : `id` s'il
    // existe, sinon l'énoncé. Ne part jamais du rendu — uniquement d'une
    // action de l'utilisateur (voir @change ci-dessous).
    const toggle = async (item: Homework, checkbox: HTMLInputElement): Promise<void> => {
      if (!todoId) return;
      const itemRef = item.id ?? item.description;
      if (!itemRef) return;
      const status = checkbox.checked ? 'completed' : 'needs_action';
      try {
        await ctx.callService('todo.update_item', { item: itemRef, status }, { entity_id: todoId });
      } catch {
        // L'appel a échoué : la case ne doit pas mentir sur l'état réel.
        checkbox.checked = !checkbox.checked;
      }
    };

    const rowFor = (h: Homework): TemplateResult => {
      const overdue = isOverdue(h, ctx.timeZone);
      // Groupée par échéance, la date TITRE déjà le groupe : la répéter en fin
      // de ligne la disait deux fois par devoir. Mesuré le 10 septembre 2026 :
      // quinze lignes sur dix-sept dont la fin reprenait mot pour mot le titre
      // juste au-dessus — et c'est le regroupement par DÉFAUT, donc le cas le
      // plus fréquent et non un cas de coin. Groupée par matière, la date est
      // au contraire la seule chose qui situe le devoir : elle reste.
      const dueLabel =
        by === 'date' ? '' : h.due ? formatDayLabel(h.due, ctx.language, ctx.timeZone) : '';
      // La couleur de matière est une gouttière à gauche, comme sur les cinq
      // autres cartes qui portent une matière. Voir `RowOptions.accent` pour
      // ses trois valeurs, et la règle `.row.empile` de `styles.ts` pour les
      // deux dispositifs que ce placement a annulés.
      const accent = subjectAccent(h.background_color, h.subject, ctx.config.subject_colors);
      const enonce = h.description_text ?? plainText(h.description);
      const replie = maxLines > 0 && lignesEstimees(enonce) > maxLines;
      const pieces = attachmentsOf(h.attachments);
      const piecesOn = ctx.config.show_attachments !== false && pieces.length > 0;
      const enonceRendu = replie
        ? html`<details class="enonce" style="--pronote-max-lines: ${maxLines}">
            <summary class="enonce-tete"><span class="enonce-corps">${enonce}</span></summary>
          </details>`
        : enonce;
      /**
       * L'énoncé, puis les pièces jointes — **hors** du bloc repliable.
       *
       * Un devoir dont l'énoncé est replié doit continuer à dire qu'il porte
       * un document : c'est justement le devoir dont on risque de ne lire que
       * les trois premières lignes.
       *
       * `undefined` quand il n'y a ni énoncé ni pièce : `listRow` teste la
       * présence de `secondary`, et un gabarit est toujours vrai.
       */
      const secondary =
        enonce === '' && !piecesOn
          ? undefined
          : html`${enonceRendu}${
              piecesOn
                ? html`<span class="devoirs-pieces"
                    >${
                      pieces.length === 1
                        ? ctx.t('devoirs.attachments_one')
                        : ctx.t('devoirs.attachments_many')
                    }
                    ${pieces.join(' · ')}</span
                  >`
                : ''
            }`;
      return html`
        ${listRow({
          // La matière TITRE le bloc, elle n'occupe plus une colonne à sa
          // gauche : c'est l'énoncé qui est le contenu de la carte, et une
          // colonne de matière le comprimait à 132 pixels sur une carte de
          // 420. Le bloc lui rend toute la largeur.
          stacked: true,
          accent: accent ?? null,
          primary: html`
            ${
              writable
                ? html`<input
                    type="checkbox"
                    .checked=${h.done === true}
                    @change=${(event: Event): void => {
                      const target = event.currentTarget;
                      if (target instanceof HTMLInputElement) void toggle(h, target);
                    }}
                  />`
                : ''
            }
            ${h.subject ?? ctx.t('devoirs.name')}
          `,
          // Le texte simple publié par l'intégration s'il existe, sinon
          // l'énoncé HTML dévêtu ici — jamais injecté. Replié seulement s'il
          // dépasse vraiment, et suivi de ses pièces jointes : voir plus haut.
          secondary,
          // `undefined` et non un gabarit vide : `listRow` teste la
          // présence de `trailing`, et un `TemplateResult` est toujours vrai
          // — groupé par échéance, chaque ligne sans retard aurait donc posé
          // une boîte vide dans la tête du bloc.
          trailing:
            overdue || dueLabel
              ? html`
                  ${overdue ? chip(ctx.t('devoirs.overdue'), 'problem') : ''}
                  ${dueLabel ? ctx.t('devoirs.due', { date: dueLabel }) : ''}
                `
              : undefined,
        })}
      `;
    };

    const groups = groupOf(limited, by, ctx.timeZone, ctx.language);
    const out: (TemplateResult | string)[] = [overdueBanner, nextDue];
    for (const g of groups) {
      out.push(html`<div class="title">${g.label}</div>`);
      // Les lignes d'un jour ne sont plus enveloppées. L'enveloppe existait
      // pour leur faire partager une colonne de matière de largeur unique ;
      // il n'y a plus de colonne de matière, la matière titre son bloc.
      out.push(html`${g.items.map((h) => rowFor(h))}`);
    }

    return html`${out}`;
  },
};
