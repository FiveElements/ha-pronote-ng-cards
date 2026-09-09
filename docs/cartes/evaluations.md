# Évaluations

Les évaluations par compétences, avec leur niveau de maîtrise.

![Aperçu de la carte Évaluations](../assets/cartes/evaluations.svg)

*Illustration synthétique : toutes les valeurs sont fictives.*

## Configuration

Un seul réglage obligatoire : l'appareil de l'enfant.

```yaml
type: custom:pronote-ng-evaluations
device_id: <appareil de l'enfant>
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_acquisitions` | `true` | Détaille chaque compétence sous son évaluation. À `false`, la carte se réduit à la liste des évaluations. |
| `limit` | `8` | Nombre d'évaluations affichées, la plus récente en tête. |

### Exemple complet

Toutes les options renseignées, copiable tel quel :

```yaml
type: custom:pronote-ng-evaluations
device_id: <appareil de l'enfant>
show_acquisitions: true
limit: 8
```

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:evaluations` | Requise. Son attribut `items` porte les évaluations et, pour chacune, ses compétences. |

Le libellé de maîtrise (« Très bonne maîtrise », « Maîtrise fragile »…)
est le texte écrit par l'établissement. Il n'est **jamais traduit** :
traduire inventerait une échelle qui n'est pas la sienne. Quand il
manque, la carte affiche l'abréviation à sa place, et rien si les deux
manquent.

## Si la carte est vide

« Aucune évaluation » veut dire ce qu'il dit : la collecte fonctionne,
la période ne compte simplement aucune évaluation. C'est le cas normal
à la rentrée. Ce message est distinct de « pas encore collectée », qui
signale une entité présente au registre mais sans état exploitable.
