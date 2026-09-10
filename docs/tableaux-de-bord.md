# Assembler un tableau de bord

Les onze pages de cartes décrivent chacune une carte. Celle-ci décrit comment on
les met ensemble : dans quel ordre, à quelle largeur, et ce qui change quand il y
a plusieurs enfants.

Toutes les cartes se configurent avec l'appareil de l'enfant — voyez
[Installation](installation.md) pour la raison. Dans les exemples ci-dessous,
remplacez `<appareil de l'enfant>` par l'identifiant que l'éditeur remplit pour
vous ; il n'y a pas d'identifiant d'entité à écrire nulle part.

---

## Sommaire

- [Un enfant, une vue](#un-enfant-une-vue)
- [Une fenetre glissante sur la semaine](#une-fenetre-glissante-sur-la-semaine)
- [Les hauteurs, et les deux qui posent probleme](#les-hauteurs-et-les-deux-qui-posent-probleme)
- [Plusieurs enfants](#plusieurs-enfants)
- [La carte limiteur, une par entree de configuration](#la-carte-limiteur-une-par-entree-de-configuration)
- [Ce qui ne doit pas se faire](#ce-qui-ne-doit-pas-se-faire)

---

## Un enfant, une vue

Une vue `sections`, dans l'ordre où on lit une journée d'école : qui, puis
maintenant, puis ce qui attend, puis les résultats, puis les incidents.

```yaml
type: sections
title: Enfant Un
sections:
  - type: grid
    cards:
      - type: custom:pronote-ng-eleve
        device_id: <appareil de l'enfant>
      - type: custom:pronote-ng-prochain-cours
        device_id: <appareil de l'enfant>

  - type: grid
    cards:
      - type: custom:pronote-ng-emploi-du-temps
        device_id: <appareil de l'enfant>
        range: today
      - type: custom:pronote-ng-menu
        device_id: <appareil de l'enfant>

  - type: grid
    cards:
      - type: custom:pronote-ng-devoirs
        device_id: <appareil de l'enfant>

  - type: grid
    cards:
      - type: custom:pronote-ng-notes
        device_id: <appareil de l'enfant>
      - type: custom:pronote-ng-evaluations
        device_id: <appareil de l'enfant>

  - type: grid
    cards:
      - type: custom:pronote-ng-vie-scolaire
        device_id: <appareil de l'enfant>
```

**Pourquoi cet ordre.** « Élève » est un en-tête : classe, état du jour,
prochain cours. Il n'a de sens qu'en premier. « Vie scolaire » est en dernier
parce qu'elle est vide la plupart du temps, et qu'une carte vide en haut d'une
vue donne l'impression que rien ne fonctionne.

**La carte limiteur n'est pas dans cette liste.** Elle n'appartient pas à la vue
d'un enfant — voyez
[plus bas](#la-carte-limiteur-une-par-entree-de-configuration).

**L'emploi du temps de la semaine non plus.** En mode `week`, la carte annonce
24 : elle mérite sa propre vue, ou au moins sa propre section pleine largeur.
C'est le sujet des [hauteurs](#les-hauteurs-et-les-deux-qui-posent-probleme).

---

## Une fenetre glissante sur la semaine

Trois cartes [Vue journée](cartes/journee.md) sur la même vue, chacune sur son
jour : trois jours d'affilée d'un coup d'œil, sans cliquer. C'est ce que
`day_offset` achète — le détail de l'option est sur
[sa page](cartes/journee.md#plusieurs-jours-cote-a-cote).

```yaml
type: sections
max_columns: 3
title: Les jours qui viennent
sections:
  - type: grid
    cards:
      - type: custom:pronote-ng-journee
        device_id: <appareil de l'enfant>
        day_offset: 0

  - type: grid
    cards:
      - type: custom:pronote-ng-journee
        device_id: <appareil de l'enfant>
        day_offset: 1
        show_nav: false

  - type: grid
    cards:
      - type: custom:pronote-ng-journee
        device_id: <appareil de l'enfant>
        day_offset: 2
        show_nav: false
```

**Une section par carte, et `max_columns: 3`** : trois colonnes sur un écran
large, une pile sur un téléphone, sans rien régler de plus. Rien n'oblige à
trois — deux suffisent souvent, et `-1` regarde en arrière plutôt qu'en avant.

**`show_nav: false` sur les deux dernières**, parce que six flèches sur une
même vue font beaucoup. Les cartes restent indépendantes de toute façon : les
flèches de chacune partent de **son** jour, et naviguer dans l'une ne déplace
pas les autres. Aucune des trois ne déclenche de collecte — les jours autres
qu'aujourd'hui viennent de la semaine déjà en mémoire du navigateur.

**`show_current` n'agit que sur la carte à `0`.** La mise en avant se calcule
sur l'heure courante, donc aucun créneau de demain ne peut être « en cours ».
Le laisser actif sur les trois n'est pas une incohérence, c'est simplement sans
effet sur deux d'entre elles.

**Le décalage part du jour de repos, pas d'aujourd'hui.** Sans `auto_advance`,
les deux sont le même jour et `1` est bien demain : il n'y a rien de plus à
savoir. Avec `auto_advance`, le jour de repos avance au prochain jour de cours
une fois la journée finie, et la fenêtre glisse **avec** lui — le mercredi à
22 h, les trois cartes montrent jeudi, vendredi et samedi. C'est ce que ce
choix d'origine achète : si le décalage partait d'aujourd'hui, la première
suivrait le saut et les deux autres non — **jeudi, jeudi, vendredi**, un jour
en double et un de perdu.

**Hors de la fenêtre, la carte dit qu'elle ne sait pas.** Un décalage qui
pointe au-delà de la semaine collectée affiche « ce jour n'est pas dans la
semaine collectée », et non « aucun cours ce jour-là ». La distinction n'est
pas du style : « aucun cours » est une **affirmation** sur une journée, et la
carte n'a pas le droit de la faire sur une date dont elle ne sait rien.
L'en-tête reste affiché, avec la date demandée — la phrase dit donc de quel
jour on n'a rien.

**Ce motif se dégrade en fin de semaine, et c'est normal.** La semaine
collectée s'arrête au dernier jour qui porte des cours, en général le vendredi.
Une vue à trois cartes est donc pleine du lundi au mercredi, puis partielle :
un jeudi, la carte à `2` vise samedi et affiche déjà le message ; un vendredi,
celles à `1` et `2` l'affichent toutes les deux, et elles continuent tout le
week-end. Constaté sur une instance le 10 septembre 2026. Rien n'est cassé —
mais quelqu'un qui installe ce motif un samedi verra deux cartes sur trois dire
qu'elles ne savent pas, et conclura le contraire.

---

## Les hauteurs, et les deux qui posent probleme

Chaque carte annonce une hauteur à Home Assistant. Trois la font varier selon
leur configuration :

| Carte | Hauteur annoncée |
| --- | --- |
| Prochain cours | 2 |
| Élève | 3 |
| Cantine | 4 |
| Mode de collecte | 4 |
| Évaluations | 4 sans les acquisitions, **8** avec |
| Limiteur | 5 |
| Notes | 6 |
| Vie scolaire | 6 |
| Vue journée | 10 |
| Emploi du temps | 8 en `today` et `tomorrow`, **24** en `week` |
| Devoirs | 13 en `tomorrow`, **31** en `todo`, **40** en `all` |

**Deux cartes sortent du lot, et pas pour la même raison.**

Les **devoirs** annoncent 31 par défaut, et jusqu'à 40 avec `filter: all` : c'est
la plus haute du dépôt. La cause est dans la donnée et non dans le dessin —
l'énoncé est le contenu de cette carte, et quinze devoirs de deux lignes font
plus de mille trois cents pixels, mesurés sur une instance. Deux options la
ramènent : `max_lines: 3` la fait tomber à 28, et un `limit` explicite la fixe
exactement, la carte n'ayant alors plus rien à estimer. Voir
[L'énoncé long](cartes/devoirs.md#lenonce-long-et-la-hauteur-de-la-carte).

L'**emploi du temps** en `range: week` annonce 24, et sa gêne n'est pas la
même : sa grille de semaine veut aussi de la largeur. Placée dans une colonne
étroite, elle s'y écrase ; placée à côté d'une petite carte, elle laisse un vide
de plusieurs écrans.

**Ce que les cartes ne font pas pour vous.** Elles déclarent leur hauteur par
`getCardSize()`, qui est l'API de dimensionnement des vues **masonry**. Aucune
ne déclare d'options de grille. Dans une vue `sections`, c'est donc à vous de
donner la largeur, et l'emploi du temps de la semaine veut la largeur complète :

```yaml
- type: custom:pronote-ng-emploi-du-temps
  device_id: <appareil de l'enfant>
  range: week
  grid_options:
    columns: 12
```

**L'appariement qui déséquilibre le plus** est désormais les devoirs à côté de
quoi que ce soit d'autre : à 31, leur voisine flotte en haut d'une colonne
presque vide. Viennent ensuite deux des trois cartes moyennes côte à côte :
l'emploi du temps en `today` (8), les évaluations avec leurs acquisitions (8) et
la vue journée (10). Séparez-les, ou
donnez-leur chacune la pleine largeur — c'est d'ailleurs pourquoi la
[fenêtre glissante](#une-fenetre-glissante-sur-la-semaine) met une section par
carte.

**Attention aux réglages qui changent la hauteur.** Un tableau de bord équilibré
se déséquilibre quand vous basculez `range` sur `week`, quand vous activez les
acquisitions, et quand vous touchez au `filter`, au `limit` ou au `max_lines`
des devoirs. Si vous ajustez des largeurs à la main, refaites le tour après
avoir changé un de ces réglages.

---

## Plusieurs enfants

Chaque carte lit **un** enfant : sur un compte parent, il faut donc décider
d'une structure. Les deux qui marchent :

| | Une vue par enfant | Une vue par thème |
| --- | --- | --- |
| Structure | un onglet « Enfant Un », un onglet « Enfant Deux » | un onglet « Devoirs » avec une carte par enfant |
| Ce qu'on lit vite | tout d'un enfant | le même sujet, comparé entre enfants |
| Nombre de cartes | 8 par enfant | 1 par enfant et par thème |
| Répétition | l'en-tête « Élève » dans chaque vue | aucune |

**Une vue par enfant est le choix par défaut**, et pour une raison de fond :
c'est ainsi que l'intégration modélise les données — un appareil par enfant,
avec ses propres entités. La vue suit le modèle, et une question du type
« qu'est-ce qu'Enfant Un fait cet après-midi » se répond sans balayer trois
colonnes.

**Une vue par thème a un usage précis** : le matin, « qui a des devoirs
aujourd'hui » se lit mieux avec trois cartes « Devoirs » côte à côte qu'en
ouvrant trois onglets. Rien n'empêche d'avoir les deux — les vues par enfant pour
le détail, une vue « Ce matin » pour la synthèse.

Dans les deux cas, **une seule carte limiteur** pour tout le tableau de bord.

---

## La carte limiteur, une par entree de configuration

C'est, avec [Mode de collecte](cartes/mode-collecte.md), l'une des deux cartes
qui n'affichent pas les données d'un enfant. Elle
montre le budget de requêtes, l'état du limiteur et un bouton de
rafraîchissement — trois choses qui appartiennent au **compte**, pas à l'élève.

Elle vous demande quand même l'appareil d'un enfant, et remonte toute seule
jusqu'à l'appareil de compte. Deux conséquences qui ne se devinent pas :

**L'enfant que vous choisissez est arbitraire.** Ne lisez pas cette carte comme
« le budget d'Enfant Un ». Il n'y a pas de budget par enfant : la session, le
budget et l'adresse IP sont partagés par tous les enfants d'un même compte.

**Trois cartes limiteur sur trois enfants affichent trois fois le même budget.**
Les trois appareils d'enfants d'un compte pointent vers le même appareil de
compte, donc les trois cartes résolvent les mêmes entités. Une seule suffit, et
son bouton de rafraîchissement agit de toute façon sur le compte entier — raison
de plus pour ne pas en avoir trois.

**La règle exacte est « une par entrée de configuration », pas « une par tableau
de bord ».** Un parent qui suit des enfants dans **deux établissements** a deux
entrées de configuration, donc deux appareils de compte, donc deux budgets
distincts — et là, deux cartes limiteur sont justifiées, une par établissement.

**Ne choisissez pas l'appareil de compte dans le sélecteur.** L'éditeur le
refuse et vous le signale : c'est l'appareil d'un enfant qu'il attend, même pour
cette carte.

---

## Ce qui ne doit pas se faire

**Une carte limiteur par enfant.** Trois fois la même information. Voir
ci-dessus.

**L'emploi du temps de la semaine sans largeur explicite.** Dans une vue
`sections`, réglez `grid_options`. Sans ça, la carte la plus haute des onze se
retrouve dans la largeur d'une colonne.

**Coiffer une fenêtre glissante d'intertitres « Aujourd'hui / Demain /
Après-demain ».** C'est le piège de ce motif. Un libellé écrit en dur cesse
d'être vrai dès que la fenêtre glisse : avec `auto_advance`, la carte à `0`
montre le prochain jour de cours et non aujourd'hui, et celle à `1` le jour
d'après. L'intertitre contredit alors la date que la carte affiche elle-même —
plausible et faux, la famille de défauts que ce dépôt traque. Chaque carte
porte sa vraie date dans son en-tête ; il n'y a rien à ajouter au-dessus.

**Une vue par thème pour un seul enfant.** Elle n'a d'intérêt que pour comparer
plusieurs enfants ; avec un seul, elle disperse en cinq onglets ce qui tenait
dans un.

**Recopier un identifiant d'entité depuis une autre installation.** Il n'y en a
aucun à recopier : les cartes n'en prennent pas. Si vous en cherchez un, c'est
que vous êtes sur la mauvaise carte.

**Mettre « Vie scolaire » en haut de la vue.** Elle est vide la plupart du
temps, ce qui est une bonne nouvelle — mais en haut, ça se lit comme une panne.

---

## Voir aussi

- [Installation](installation.md) — HACS, mode YAML, et pourquoi aucun
  identifiant d'entité
- [Ce que ces cartes ne feront jamais](limites.md) — ce qui est volontairement
  absent
- [Afficher les données](https://fiveelements.github.io/ha-pronote-ng/AFFICHER-LES-DONNEES/)
  — côté intégration : les cartes intégrées de Home Assistant, pour ce que ces
  cartes ne couvrent pas
