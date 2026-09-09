# Assembler un tableau de bord

Les neuf pages de cartes décrivent chacune une carte. Celle-ci décrit comment on
les met ensemble : dans quel ordre, à quelle largeur, et ce qui change quand il y
a plusieurs enfants.

Toutes les cartes se configurent avec l'appareil de l'enfant — voyez
[Installation](installation.md) pour la raison. Dans les exemples ci-dessous,
remplacez `<appareil de l'enfant>` par l'identifiant que l'éditeur remplit pour
vous ; il n'y a pas d'identifiant d'entité à écrire nulle part.

---

## Sommaire

- [Un enfant, une vue](#un-enfant-une-vue)
- [Les hauteurs, et la seule qui pose probleme](#les-hauteurs-et-la-seule-qui-pose-probleme)
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

**L'emploi du temps de la semaine non plus.** En mode `week`, la carte est trois
fois plus haute que la plus haute des autres : elle mérite sa propre vue, ou au
moins sa propre section pleine largeur. C'est le sujet de la section suivante.

---

## Les hauteurs, et la seule qui pose probleme

Chaque carte annonce une hauteur à Home Assistant. Deux la font varier selon leur
configuration :

| Carte | Hauteur annoncée |
| --- | --- |
| Prochain cours | 2 |
| Élève | 3 |
| Cantine | 4 |
| Évaluations | 4 sans les acquisitions, **8** avec |
| Devoirs | 5 |
| Limiteur | 5 |
| Notes | 6 |
| Vie scolaire | 6 |
| Emploi du temps | 8 en `today` et `tomorrow`, **24** en `week` |

**Le cas isolé, c'est `range: week`.** 24 contre 8 pour la plus haute des
autres. Placée dans une colonne étroite, elle s'y écrase ; placée à côté d'une
petite carte, elle laisse un vide de plusieurs écrans.

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

**Le seul autre appariement qui déséquilibre visiblement** est deux cartes à 8
côte à côte : l'emploi du temps en `today` et les évaluations avec leurs
acquisitions. Séparez-les, ou donnez-leur chacune la pleine largeur.

**Attention aux réglages qui changent la hauteur.** Un tableau de bord équilibré
se déséquilibre quand vous basculez `range` sur `week` ou que vous activez les
acquisitions. Si vous ajustez des largeurs à la main, refaites le tour après
avoir changé un de ces deux réglages.

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

C'est la seule carte des neuf qui n'affiche pas les données d'un enfant. Elle
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
`sections`, réglez `grid_options`. Sans ça, la carte la plus haute des neuf se
retrouve dans la largeur d'une colonne.

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
