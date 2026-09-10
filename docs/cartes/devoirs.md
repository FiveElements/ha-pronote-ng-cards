# Devoirs

Les devoirs à faire, groupés par échéance ou par matière, avec la case à
cocher quand l'intégration l'autorise.

![Aperçu de la carte Devoirs](../assets/cartes/devoirs.svg)

*Illustration synthétique : rien n'y vient d'un élève réel. Les dates, les
horaires et les valeurs sont inventés ; les matières sont des matières de
programme.*

## Configuration

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
filter: todo
group_by: date
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `filter` | `todo` | `todo` (à faire), `tomorrow` (pour demain) ou `all` (tous). Change l'entité lue. |
| `group_by` | `date` | `date` ou `subject`. Le tri suit le regroupement. Groupé par échéance, la date titre le groupe et n'est plus répétée en fin de chaque ligne. |
| `limit` | *tout* | Nombre maximum de devoirs. Absent ou négatif : tout. `0` : rien — et la carte dit alors que la cause est l'option, non l'absence de devoirs. |
| `max_lines` | *aucun repli* | Nombre de lignes d'énoncé avant repli. Voir [L'énoncé long](#lenonce-long-et-la-hauteur-de-la-carte). |
| `show_attachments` | `true` | Nommer les pièces jointes d'un devoir. Voir [Les pièces jointes](#les-pieces-jointes). |
| `subject_colors` | — | Table matière → couleur. **En YAML uniquement**, voir plus bas. |

### Exemple complet

Toutes les options renseignées, copiable tel quel :

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
filter: todo
group_by: date
limit: 12
```

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

## L'énoncé long, et la hauteur de la carte

C'est la plus haute des onze cartes, pour une raison qui lui est propre :
l'énoncé est son **contenu**, pas sa décoration. Mesuré le 10 septembre 2026
sur une instance — des énoncés allant jusqu'à 313 caractères, l'un d'eux
occupant à lui seul 161 pixels, et la carte atteignant **1 376 pixels** avec
le filtre « à faire », **1 647** avec « tous ».

`max_lines` replie l'énoncé au nombre de lignes voulu :

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
max_lines: 3
```

Trois choses rendent ce repli sûr, et elles comptent : un énoncé tronqué sans
le dire cacherait la moitié d'un devoir à quelqu'un qui ne sait pas qu'il y a
une moitié cachée.

- **Le repli se signale tout seul.** Les points de suspension sont peints par
  le navigateur, et **seulement quand le texte déborde vraiment**. Un énoncé
  qui tient déjà dans le nombre de lignes demandé n'est pas replié du tout.
- **Un clic ou une touche déplie**, et referme. C'est un bloc `details`
  natif, donc il s'annonce comme tel à un lecteur d'écran.
- **Le texte entier reste dans la page** pendant qu'il est replié. Une
  recherche dans le navigateur le trouve ; seule la peinture est coupée.

L'option est vide par défaut : sans elle, rien ne change.

!!! note "Le repli n'est pas exact, et il se trompe exprès dans le bon sens"

    La carte décide de replier **avant** de connaître sa largeur, en comptant
    80 caractères par ligne — plus généreux que la réalité mesurée, environ
    66 sur une carte de 380 pixels. Elle sous-évalue donc le nombre de lignes,
    et replie **moins** souvent qu'il ne faudrait.

    C'est le sens sûr de l'erreur. Ne pas replier un énoncé qui aurait pu
    l'être rend la carte plus haute : ça se voit, et ça ne trompe personne.
    Replier un énoncé qui tenait déjà poserait un bloc dépliable vide, annoncé
    comme du contenu caché à un lecteur d'écran qui irait chercher ce qui
    n'existe pas.

### La hauteur annoncée à Home Assistant

Home Assistant demande à chaque carte sa hauteur pour équilibrer les colonnes
d'une vue en maçonnerie. Celle-ci annonçait **5**, soit environ 250 pixels,
pour 1 376 mesurés — un facteur cinq, et le plus large écart du dépôt : la
carte la plus haute se déclarait parmi les plus courtes. Elle l'estime
désormais d'après son `filter`, son `limit` et son `max_lines`.

Cette estimation reste approximative, et il vaut mieux le savoir que le
découvrir : la hauteur dépend surtout de la longueur des énoncés, qui est une
**donnée** et non une option — or Home Assistant ne passe que la
configuration. Un `limit` explicite, lui, est exact et remplace l'estimation.

## Les couleurs de matière

La couleur de la matière est une **gouttière à gauche** du bloc, comme sur
les quatre autres cartes à gouttière. La [vue journée](journee.md) est
l'exception : elle pose son filet **entre l'heure et la matière**, parce que
sa colonne d'horaires se lit seule et qu'un filet à sa gauche colorerait
l'heure autant que la matière. Un devoir sans couleur
garde sa gouttière, réservée mais transparente : sans elle, la ligne se
décalerait de neuf pixels par rapport à sa voisine colorée, ce qui se lit
comme un défaut d'affichage plutôt que comme une matière sans couleur.

Cette page a décrit pendant un temps un autre placement — un filet pleine
hauteur posé entre la matière et l'énoncé, qui coupait la ligne en deux —
et une colonne de matière de largeur commune à toutes les lignes d'un même
jour. Les deux ont été retirés par la même décision, et pour une raison qui
n'est pas l'esthétique : la matière **titre** désormais le bloc, et
l'énoncé passe dessous sur toute la largeur de la carte. En colonne, il ne
disposait que de 132 pixels sur une carte de 420 — or l'énoncé est ce que
la carte a à dire.

Depuis la version 0.0.13 de l'intégration, cette couleur vient
**du serveur** : vous n'avez rien à écrire pour la voir. Une table
`subject_colors` ne sert plus qu'à colorer une matière que votre
établissement laisse sans couleur, ou à remplacer une teinte qui vous
déplaît — et le serveur **gagne** sur votre table, donc une entrée qui
double une couleur reçue ne fait plus rien.

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
subject_colors:
  MATHEMATIQUES: '#1e88e5'
  histoire-géographie: '#8d6e63'
  Sciences: '#43a047'
```

Les trois rangs de la couleur, le format accepté — hexadécimal strict,
le reste est refusé sans un mot — le repliement de la casse et des
accents, et ce que l'option ne fait pas sont décrits une fois pour
toutes dans [Les couleurs de matière](../couleurs-de-matiere.md).

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:homework_todo` | Requise avec `filter: todo`. |
| `sensor:homework_tomorrow` | Requise avec `filter: tomorrow`. |
| `sensor:homework` | Requise avec `filter: all`. |
| `binary_sensor:homework_overdue` | Optionnelle. Bandeau « en retard » en tête. |
| `todo:homework` | Optionnelle. Rend la case à cocher possible (voir ci-dessous). |
| `calendar:homework` | Optionnelle. Nomme la prochaine échéance, quel que soit le filtre. |

Trois entités distinctes portent le même nom de traduction sur des
domaines différents — `sensor:homework`, `calendar:homework` et
`todo:homework`. C'est la raison pour laquelle toutes les clés du projet
sont qualifiées par leur domaine.

`calendar:homework` n'est lue que dans ses **attributs**. Obtenir la liste
de ses évènements demanderait un appel de service, donc une collecte au
rendu — que le projet interdit et que le type refuse à la compilation. La
ligne « prochaine échéance » survit à l'état vide, et c'est là qu'elle sert
le plus : rien à rendre demain, mais une échéance existe plus loin.

## Ce que « en retard » veut dire, et ses deux sources

La pastille apparaît à **deux** endroits, qui ne disent pas la même chose.

En tête de carte, un bandeau suit `binary_sensor:homework_overdue`. Il porte
sur l'élève entier, pas sur la fenêtre affichée : avec `filter: tomorrow`,
vous pouvez donc le voir alors qu'aucune ligne visible n'est en retard. C'est
voulu, et c'est même le seul endroit où l'information vous parvient dans ce
filtre.

Il annonce **combien** : « 4 en retard », et non le seul mot. Le chiffre vient
de l'attribut `count` du capteur, que la carte jetait jusqu'au 10 septembre
2026. Sur une intégration antérieure à cet attribut, le bandeau garde le
libellé nu plutôt que de disparaître.

Sur une ligne, la pastille suit la **date du devoir** : échéance passée **et**
devoir non fait. Les deux conditions comptent. Un devoir coché dont l'échéance
est passée est le cas normal — on coche après avoir fait, et l'échéance passe
ensuite.

Ce second point a été corrigé le 10 septembre 2026. La carte ne regardait que
la date : mesuré sur une instance avec `filter: all`, **neuf** lignes portaient
la pastille pour **quatre** retards réels, et les cinq de trop étaient
exactement les cinq devoirs cochés. L'intégration, elle, comptait juste. La
carte criait donc au retard d'autant plus fort que l'élève avait travaillé, et
elle contredisait son propre bandeau sur la même page.

## Les pièces jointes

Un devoir peut porter des documents. L'intégration les publie dans
`attachments`, et la carte les a ignorés pendant onze versions : un devoir qui
demandait d'ouvrir une fiche ne le disait pas. Leurs noms apparaissent
désormais sous l'énoncé, et `show_attachments: false` les retire.

Mesuré le 10 septembre 2026 sur une instance : douze pièces réparties sur neuf
devoirs sur vingt, deux au plus par devoir.

Deux précisions qui évitent une déception :

- **ce sont des noms, pas des liens.** La carte ne peut pas ouvrir un
  document : il faudrait un appel de service, que le projet interdit au
  rendu et que le type refuse à la compilation. Les noms ne sont donc ni
  soulignés ni cliquables, exprès — inviter à cliquer sur ce qui ne répond
  pas est pire que de ne rien afficher ;
- **ils restent visibles quand l'énoncé est replié.** C'est justement le
  devoir dont on ne lira que les premières lignes : s'il porte un document,
  il doit continuer à le dire.

## La case à cocher

Elle n'apparaît que si `todo:homework` est résolue **et** annonce la
capacité d'écriture dans son attribut `supported_features`. La capacité est
lue, jamais supposée.

Cocher appelle `todo.update_item` — l'un des deux seuls appels de service
que ces cartes peuvent émettre. Si l'appel échoue, la case revient à son
état précédent : elle ne doit pas mentir sur ce que le serveur sait.

## L'énoncé

PRONOTE écrit les énoncés en HTML. L'intégration publie une variante en
texte simple (`description_text`), et c'est elle qui est affichée. Sur une
intégration plus ancienne, la carte dévêt le HTML elle-même — sans jamais
l'injecter.

Cette section dit d'où vient le texte ; sa **longueur**, et ce qu'elle fait à
la hauteur de la carte, sont traitées dans
[L'énoncé long](#lenonce-long-et-la-hauteur-de-la-carte).

## Le code couleur des matières

Chaque devoir porte la couleur que l'établissement associe à sa matière, en
bordure gauche — le même code visuel que sur l'emploi du temps, dont la page
explique [comment il fonctionne et pourquoi il n'est pas encore
visible](emploi-du-temps.md#le-code-couleur-des-matieres).

## Si la carte est vide

Trois phrases, selon le filtre : « rien à faire », « rien à rendre
demain », « aucun devoir ». C'est le vide qui appartient à la carte : elle
seule sait qu'une liste de zéro devoir pour demain se dit ainsi, et non
« donnée indisponible ».
