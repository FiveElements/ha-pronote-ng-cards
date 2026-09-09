# Devoirs

Les devoirs à faire, groupés par échéance ou par matière, avec la case à
cocher quand l'intégration l'autorise.

![Aperçu de la carte Devoirs](../assets/cartes/devoirs.svg)

*Illustration synthétique : toutes les valeurs sont fictives.*

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
| `group_by` | `date` | `date` ou `subject`. Le tri suit le regroupement. |
| `limit` | *tout* | Nombre maximum de devoirs. Absent ou négatif : tout. `0` : rien. |
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

## Les couleurs de matière

Chaque devoir porte un filet dans la couleur de sa matière, posé **après
l'intitulé de la matière**, dans la ligne — les trois autres cartes le
gardent en gouttière à gauche. Ce placement n'a **pas de troisième cas** :
un devoir sans couleur n'a simplement pas de filet. Une gouttière a besoin
d'un repli transparent pour réserver sa place, sinon la ligne se décale de
quelques pixels par rapport à sa voisine colorée ; un filet posé après un
intitulé de longueur variable ne décale rien, et un filet gris de repli
affirmerait que la matière a une couleur, et que cette couleur est grise. Il n'y en a aucune tant que vous n'avez pas écrit de table
`subject_colors` : l'intégration ne publie pas encore la couleur de
votre établissement.

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
