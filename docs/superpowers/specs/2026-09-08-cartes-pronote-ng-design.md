# Conception — cartes Lovelace pour Pronote NG

*8 septembre 2026*

Dépôt : `github.com/FiveElements/ha-pronote-ng-cards` (public, MIT).
Intégration servie : `pronote_ng`, dépôt `github.com/FiveElements/ha-pronote-ng`.
Distribution : HACS, catégorie `plugin`, en dépôt personnalisé.

Ce document décrit ce que le projet construit et pourquoi. Le plan
d'implémentation en découle et vit dans un fichier séparé.

---

## 1. Le problème

L'intégration expose une soixantaine d'entités par enfant. Les états scalaires
— prochain cours, moyenne générale, nombre de devoirs — se lisent avec une carte
`tile` native. Tout le reste vit dans des **attributs de liste** (`lessons`,
`items`, les six champs du menu) que rien de natif ne sait rendre.

Le tableau de bord de référence construit sur une instance réelle le montre :
dix cartes `markdown` portant chacune quinze à trente lignes de Jinja pour
afficher un prochain cours, un menu, des devoirs, des moyennes, des absences,
des punitions, un état de limiteur. Chacune de ces dix cartes est une carte qui
devrait exister.

Un `markdown` + Jinja échoue sur trois points, et ce sont les trois que ce
projet corrige :

- **Il code les identifiants d'entités en dur.** Or ils dérivent du nom affiché
  de l'enfant : ils sont propres à chaque installation, et une correction du nom
  affiché les casse silencieusement.
- **Il confond « vide » et « indisponible ».** `states(e) in ['unknown',
  'unavailable', '', '0']` traite « pas de menu publié aujourd'hui » et
  « l'intégration n'a pas encore collecté » comme le même cas. L'utilisateur ne
  peut pas savoir s'il doit s'inquiéter.
- **Il n'est pas partageable.** Chaque utilisateur réécrit les mêmes trente
  lignes, avec ses propres identifiants, sans test.

## 2. Ce que le projet ne fera jamais

Ces règles sont héritées du projet d'intégration. Elles ne sont pas des
préférences : elles sont la raison pour laquelle certaines données ne sont pas
des états d'entité.

- **Aucune carte n'affiche l'URL iCal, le bloc d'identité, ou le lien du PDF
  d'emploi du temps.** Ce sont des réponses de service (`SupportsResponse.ONLY`),
  précisément pour qu'aucune surface partageable ne les retienne. L'URL iCal
  donne accès à l'emploi du temps complet d'un élève **sans aucun
  identifiant** : elle se traite comme un mot de passe. Une carte est une
  surface partageable par construction — une capture d'écran, un partage
  d'écran, un tableau de bord ouvert sur une tablette de cuisine.
- **Aucune carte n'appelle `pronote_ng.get_ical_url`,
  `pronote_ng.get_identity` ni `pronote_ng.generate_timetable_pdf`.** Cette
  interdiction est câblée : voir §4.4.
- **Aucune carte ne déclenche de collecte à l'affichage.** Le serveur PRONOTE
  sanctionne l'adresse IP, et le budget de requêtes est géré par un limiteur
  côté intégration. Une carte lit des états déjà présents dans la machine à
  états, rien d'autre.
- **La documentation ne conseille jamais d'activer le journaliseur
  `pronotepy`** : il écrit l'hexadécimal de chaque requête au niveau `DEBUG`,
  identifiants compris. Le seul journaliseur recommandé est
  `custom_components.pronote_ng`.
- **Aucun identifiant réel, nom d'élève ou nom d'établissement** dans le code,
  la documentation, les captures d'écran, les tests ou les messages de commit.
  Les valeurs synthétiques du projet sont `demo.example.invalid` et
  `sensor.<enfant>_prochain_cours`.

## 3. Forme retenue

Une **famille de cartes spécialisées** — une carte par usage — plutôt qu'une
carte unique à modes ou un panneau monolithique. C'est la forme des
bibliothèques Lovelace qui vieillissent bien : chaque carte a une configuration
minimale, un éditeur, des tests, et se compose avec les vues `sections` natives
au lieu d'imposer sa mise en page.

Huit cartes, un seul *bundle* JavaScript, huit `customElements.define`.

## 4. Architecture

```
src/
├── core/
│   ├── resolve.ts       device_id → { 'domaine:translation_key': entity_id }
│   ├── base-card.ts     PronoteCardBase (Lit) — hass, config, garde-fous
│   ├── editor.ts        éditeur ha-form générique piloté par schéma
│   ├── registry.ts      enregistrement + window.customCards
│   ├── format.ts        heure, relatif, note, durée
│   └── ui/              ligne de liste, puce, état vide, en-tête
├── cards/               une carte = un fichier = un CardSpec
├── localize/fr.json
└── index.ts             point d'entrée du bundle
```

### 4.1 Résolution des entités — le cœur du projet

Aucun identifiant d'entité n'est codé en dur, nulle part. La carte prend un
**`device_id` d'enfant** et résout ses entités par le registre.

Le mécanisme est vérifié contre la source du frontend Home Assistant
(`src/data/entity/entity_registry.ts`, `src/data/device/device_registry.ts`,
`src/types.ts`) :

- `hass.entities` est un `Record<string, EntityRegistryDisplayEntry>` alimenté
  par `config/entity_registry/list_for_display`, que le frontend de **tout**
  utilisateur charge — ce n'est pas réservé aux administrateurs. Chaque entrée
  porte `entity_id`, `device_id`, `platform`, `translation_key`,
  `entity_category` et `hidden`.
- `hass.devices` est un `Record<string, DeviceRegistryEntry>` dont chaque entrée
  porte `via_device_id`.

D'où :

```ts
// key est qualifiée : 'sensor:next_lesson', 'todo:homework', 'image:photo'…
const entityOf = (hass, deviceId, key) => {
  const [domain, tk] = key.split(':');
  return Object.values(hass.entities).find(
    (e) => e.device_id === deviceId
        && e.platform === 'pronote_ng'
        && e.translation_key === tk
        && e.entity_id.startsWith(`${domain}.`)
  )?.entity_id;
};
```

**Pourquoi la clé est qualifiée par le domaine.** Un `translation_key` n'est
unique qu'à l'intérieur d'un domaine : `homework` désigne trois entités
distinctes de l'intégration — le capteur de liste des devoirs, l'agenda des
échéances et la liste de tâches cochable. `punishments` en désigne deux, un
capteur et un agenda. Une clé nue résoudrait au hasard de l'ordre d'itération.
Toutes les clés du présent document s'écrivent donc `domaine:clé`.

**Pourquoi le `translation_key` et pas le suffixe d'`entity_id`.** Les
`translation_key` de l'intégration sont en anglais, déclarés dans
`strings.json`, et identiques sur toutes les installations : `next_lesson`,
`homework_tomorrow`, `menu_today`, `limiter_state`, `overall_average`… Les
suffixes d'`entity_id`, eux, dérivent du nom affiché traduit et divergent déjà
de la documentation sur une dizaine de cas relevés en production
(`devoirs_demain` documenté contre `devoirs_pour_demain` réel, `moyenne_classe`
contre `moyenne_de_la_classe`, `emploi_du_temps_demain` contre
`emploi_du_temps_de_demain`, `moyennes` contre `moyennes_par_matiere`,
`rafraichir_notes` contre `rafraichir_les_notes`, `age_session` contre
`age_de_la_session`, `etat_limiteur` contre `etat_du_limiteur`, `bride` contre
`collectes_bridees`). Au niveau du `translation_key`, ces divergences n'existent
pas : ce sont des accidents du nom affiché.

**Entités de l'appareil de compte.** Les neuf entités de diagnostic (limiteur,
budget, prochaine collecte, âge de session) sont portées par l'appareil de
**compte**, pas par l'enfant. Une carte déclare `scope: 'account'` et le socle
suit `hass.devices[deviceId].via_device_id` pour résoudre l'appareil parent.
Conséquence : **les huit cartes se configurent toutes avec le seul `device_id`
de l'enfant**, y compris la carte « limiteur ». L'utilisateur n'a jamais à
distinguer les deux appareils.

**Entités des périodes closes.** Les entités suffixées `_p<n>` portent les
`translation_key` en `*_period` (`grades_period`, `averages_period`,
`overall_average_period`…). La carte `notes` accepte une option `period` et
résout alors sur ces clés. Le socle expose la liste des périodes disponibles à
l'éditeur.

**Échappatoire.** Toute carte accepte un `entities:` optionnel qui surcharge la
résolution clé par clé :

```yaml
entities:
  sensor:next_lesson: sensor.<enfant>_prochain_cours
```

Il sert l'installation qui sortirait du modèle. Il n'est jamais nécessaire dans
le cas nominal, et la documentation le présente comme tel.

### 4.2 Le contrat d'une carte

```ts
export const PROCHAIN_COURS: CardSpec = {
  type: 'pronote-ng-prochain-cours',
  name: 'Pronote NG — Prochain cours',
  description: 'Le prochain cours : matière, heure, salle, professeur.',
  scope: 'child',                        // 'child' | 'account'
  requires: ['sensor:next_lesson'],      // absentes ⇒ la carte le dit
  optional: ['binary_sensor:in_class', 'sensor:next_wake_up'],
  schema: [ /* ha-form */ ],
  render(ctx) { /* ctx.entity('sensor:next_lesson') → HassEntity | undefined */ },
};
```

Ajouter une carte, c'est ajouter un fichier et une ligne dans `index.ts`. La
huitième carte coûte ce que coûte la deuxième — c'est ce qui justifie le socle.

### 4.3 Trois états, jamais deux

Le défaut central des cartes `markdown` existantes est de confondre l'absence de
donnée et l'absence d'entité. Le socle impose trois cas distincts, et chaque
carte doit rendre les trois :

| Cas | Détection | Rendu |
| --- | --- | --- |
| **Entité absente** | non résolue sur l'appareil | « Cette carte a besoin de X, absente de cet appareil. » + la clé attendue |
| **Indisponible** | état `unavailable` / `unknown` | « Donnée pas encore collectée. » — état transitoire, pas une erreur |
| **Vide** | état résolu, liste vide | « Rien à rendre demain. » — l'information *est* le vide |

Un test par carte couvre chacun des trois.

### 4.4 Interdits câblés dans le code

Le type qui décrit ce qu'une carte peut faire n'expose que la lecture d'états et
d'attributs, plus une action `refresh`. Les services à réponse
(`get_ical_url`, `get_identity`, `generate_timetable_pdf`,
`get_rate_limit_status`) sont **absents de ce type** : il n'y a pas de carte à
écrire qui les appellerait par inadvertance.

Deux tests de garde rendent la contrainte exécutable et la font survivre au
projet :

1. Échoue si `src/` contient un littéral de la forme
   `sensor.` / `binary_sensor.` / `calendar.` / `todo.` / `button.` / `event.` /
   `image.` suivi d'un identifiant — la règle « aucun identifiant en dur »
   devient une assertion et non une intention.
2. Échoue si `src/` ou `docs/` contient `get_ical_url`, `get_identity`,
   `generate_timetable_pdf`, `export_credentials`, `ine_number`, ou une chaîne
   recommandant le journaliseur `pronotepy`.

### 4.5 Le seul service appelable

`pronote_ng.refresh`, et seulement via une action explicite de l'utilisateur
(bouton, `tap_action`). Il ne place aucun appel : il relève une priorité auprès
de l'ordonnanceur. Un boost est plafonné à **un par palier et par intervalle** ;
le bouton se grise donc après appel pour la durée de l'intervalle, parce qu'une
interface qui laisse cliquer sans effet est une interface qui ment.

Aucune carte n'appelle ce service, ni aucun autre, au montage ou au rendu.

## 5. Les huit cartes

Toutes prennent `device_id`, un `title` optionnel, et l'`entities:` de
surcharge. Les colonnes « clés » donnent les `translation_key`.

### 5.1 `pronote-ng-eleve` — en-tête de synthèse

- **Requises** : `sensor:class_name`
- **Optionnelles** : `image:photo`, `binary_sensor:school_day`, `binary_sensor:in_class`, `binary_sensor:holidays`,
  `sensor:next_lesson`, `sensor:current_period`
- **Rendu** : photo de profil, nom de l'appareil (jamais un nom codé), classe et
  établissement, une puce d'état (`en cours` · `jour de classe` · `vacances`),
  le prochain cours en une ligne, la période en cours.
- **Note** : `current_period` devient *indisponible* plutôt que faux quand la
  période ne peut pas être déterminée. La carte affiche alors l'état
  indisponible, pas une période fausse.

### 5.2 `pronote-ng-prochain-cours`

- **Requises** : `sensor:next_lesson`
- **Optionnelles** : `binary_sensor:in_class`, `binary_sensor:lessons_canceled`, `sensor:end_of_lessons`,
  `sensor:next_wake_up`, `sensor:next_test`
- **Rendu** : matière en titre, début en absolu et en relatif, salle,
  professeurs, badge « annulé » si `canceled`. Options `show_wake_up`,
  `show_end_of_day`.
- **Vide** : « aucun cours à venir connu » — distinct de l'indisponible.

### 5.3 `pronote-ng-emploi-du-temps`

- **Requises** : selon `range` — `sensor:lessons_today`, `sensor:timetable_tomorrow` ou
  `sensor:timetable_week`
- **Optionnelles** : `binary_sensor:in_class`, `binary_sensor:outing_today`, `binary_sensor:test_today`
- **Rendu** : liste chronologique bâtie sur l'attribut `lessons`, groupée par
  jour en mode semaine, créneau courant surligné, **cours annulés barrés et non
  supprimés** (les retirer donnerait l'illusion qu'ils n'ont jamais existé),
  contrôles et sorties signalés.
- **Note** : `lessons` est un attribut non enregistré — la carte rend un
  instantané, pas un historique. C'est l'usage prévu.

### 5.4 `pronote-ng-devoirs`

- **Requises** : `sensor:homework_todo`
- **Optionnelles** : `sensor:homework`, `sensor:homework_tomorrow`, `binary_sensor:homework_overdue`, et
  `todo:homework` pour la coche — noter que `sensor:homework`,
  `calendar:homework` et `todo:homework` sont trois entités distinctes
- **Rendu** : liste depuis l'attribut `items`, options `filter`
  (`a_faire` · `demain` · `tous`), `group_by` (`date` · `matiere`), `limit`.
  Devoirs en retard signalés.
- **Écriture** : la case à cocher n'est rendue que si l'entité `todo` annonce
  `UPDATE_ITEM` dans ses `supported_features`. L'intégration ne l'annonce que si
  `write_operations_enabled` — la carte **lit** cette capacité, ne la suppose
  pas.

### 5.5 `pronote-ng-notes`

- **Requises** : au moins une de `sensor:grades`, `sensor:averages`, `sensor:overall_average`
- **Optionnelles** : `sensor:class_average`, `sensor:latest_grade`, `sensor:current_period`,
  `sensor:report_card`, et les variantes `*_period` quand l'option `period` cible une
  période close
- **Rendu** : trois blocs activables par l'option `sections` —
  moyenne générale élève contre classe · dernières notes
  (matière, note, barème, coefficient, date) · moyennes par matière avec écart à
  la classe.
- **Note** : `latest_grade` peut valoir `unknown` avec l'attribut `status`
  portant le motif (sentinelles `|1` à `|8` : absent, dispensé…). La carte
  affiche **le motif**, jamais un vide.

### 5.6 `pronote-ng-menu`

- **Requises** : `sensor:menu_today`
- **Optionnelles** : `sensor:menu_tomorrow`
- **Rendu** : les six champs `first_meal`, `main_meal`, `side_meal`,
  `other_meal`, `cheese`, `dessert` en sections nommées, `is_lunch` pour le
  libellé. Bascule aujourd'hui / demain si l'entité de demain est présente.
- **Vide** : « pas de menu publié pour aujourd'hui » — la cantine ne publie pas
  tous les jours, ce n'est pas une panne.

### 5.7 `pronote-ng-vie-scolaire`

- **Requises** : au moins une de `sensor:absences`, `sensor:delays`, `sensor:punishments`,
  `sensor:unjustified_absences`
- **Optionnelles** : `binary_sensor:absence_in_progress`, `binary_sensor:punishment_upcoming`,
  `sensor:next_punishment`, variantes `*_period`
- **Rendu** : compteurs en tête, puis le détail par section activable —
  absences (dates, heures, justifiée ou non), retards (durée, motif),
  punitions (nature, donneur, durée, exclusion). Alerte visible si
  `absence_in_progress` est actif.

### 5.8 `pronote-ng-limiteur` — `scope: 'account'`

- **Requises** : `sensor:limiter_state`
- **Optionnelles** : `sensor:calls_today`, `sensor:remaining_budget`, `sensor:last_collection`,
  `sensor:next_collection`, `sensor:session_age`, `sensor:session_lifetime`, `sensor:logins_today`,
  `binary_sensor:throttled`
- **Rendu** : pastille d'état (`nominal` · `throttled` · `backoff` ·
  `quiet_hours` · `credentials_hold` · `bootstrap_failed`) avec le motif et
  l'échéance, budget restant en jauge sur `daily_cap`, appels par palier depuis
  `by_tier`, paliers en attente depuis `tiers_due`, prochaine collecte en
  relatif.
- **Action optionnelle** : bouton `pronote_ng.refresh` avec palier au choix,
  grisé pour la durée de l'intervalle après appel (§4.5).
- **Note** : `session_id_hash` est une empreinte tronquée. La carte ne l'affiche
  pas — un diagnostic lisible n'a pas besoin de la montrer, et une carte est une
  surface partageable.

## 6. Éditeur

Un **éditeur générique unique** piloté par le `schema` déclaré à côté de chaque
carte, rendu par `ha-form`. Le coût par carte supplémentaire est celui de son
schéma.

Champs communs à toutes les cartes :

- **Appareil** — sélecteur `device` filtré sur l'intégration `pronote_ng`,
  restreint aux appareils d'enfant (ceux qui portent un `via_device_id`). Rien à
  copier-coller, aucun identifiant à trouver à la main.
- **Titre** — texte optionnel.
- **Surcharges d'entités** — repliées, absentes du cas nominal.

L'éditeur affiche un **diagnostic de résolution** : pour l'appareil choisi, quelles
clés requises sont trouvées et lesquelles manquent. C'est là que l'utilisateur
apprend qu'il n'a pas activé le palier `menus`, plutôt que devant une carte
vide.

## 7. Tests

Vitest, environnement `happy-dom`.

- **`resolve.ts`** — tables `hass.entities` / `hass.devices` synthétiques :
  résolution nominale, appareil de compte via `via_device_id`, clé absente,
  plateforme étrangère sur le même appareil, surcharge explicite, période close.
- **Formateurs** — heure et relatif dans le fuseau de l'établissement, note
  sentinelle, durée, barème.
- **Chaque carte** — quatre tests au minimum : données présentes, liste vide,
  entité indisponible, entité absente de l'appareil (§4.3).
- **Gardes** — les deux tests du §4.4.

Toutes les fixtures utilisent `<enfant>` et `demo.example.invalid`. Une fixture
qui contiendrait un nom réel fait échouer la garde.

## 8. Chaîne de livraison

- **`hacs.json`** — `name`, `render_readme: true`, `filename:
  "pronote-ng-cards.js"`, `homeassistant: "2026.8.0"`. La catégorie `plugin`
  est portée par le dépôt, pas par le fichier.
- **Build** — un `dist/pronote-ng-cards.js` unique, module ES, Lit *bundlé* et
  aucune dépendance externe (Home Assistant ne garantit pas d'*import map*).
  `dist/` est dans `.gitignore` et attaché aux *releases*.
- **`.github/workflows/validate.yml`** — lint, typecheck, tests, build, sur
  poussée et sur *pull request*.
- **`.github/workflows/hacs.yml`** — `hacs/action@main`, `category: plugin`.
- **`.github/workflows/release.yml`** — sur tag `v*` : build, puis attache
  `pronote-ng-cards.js` à la *release*.
- **`.github/workflows/docs.yml`** — MkDocs Material vers GitHub Pages.
- **Pas de `hassfest`** — c'est un greffon, pas une intégration.
- Modèles d'*issues*, `PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md` repris de
  `ha-pronote-ng` et adaptés.

## 9. Documentation

MkDocs Material, **intégralement en français**, publiée sur GitHub Pages :

- installation par HACS en dépôt personnalisé ;
- une page par carte — options, YAML d'exemple avec `device_id` synthétique,
  capture d'écran sans donnée réelle ;
- une page **« ce que ces cartes ne feront jamais »** qui énonce les interdits du
  §2 et leur raison. Elle existe pour que la contrainte survive à ses auteurs :
  la prochaine personne qui proposera une carte « emploi du temps PDF » doit
  trouver la réponse avant d'écrire le code.

Le répertoire `docs/superpowers/` est exclu de la navigation MkDocs.

## 10. Ce qui est hors périmètre

- Toute carte reposant sur un service à réponse (§2).
- Une carte « messagerie » permettant d'envoyer un message : le service
  `send_message` existe, mais une surface d'écriture vers l'établissement
  demande une conception propre, pas un coin de bibliothèque d'affichage.
- Un thème, ou du `card-mod`. Les cartes respectent les variables CSS de Home
  Assistant et se laissent thémer.
- Une stratégie de tableau de bord générant automatiquement une vue « École ».
  C'est une suite crédible, une fois les huit cartes stabilisées ; ce n'est pas
  la v1.
