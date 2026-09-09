# Prochain cours

Le prochain cours à venir : matière, plage horaire, salle et professeur.

## Configuration

```yaml
type: custom:pronote-ng-prochain-cours
device_id: <appareil de l'enfant>
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_wake_up` | `false` | Ajoute l'heure de réveil calculée par l'intégration. |
| `show_end_of_day` | `false` | Ajoute l'heure de fin des cours. |
| `show_next_test` | `false` | Ajoute le prochain contrôle, avec son jour et son heure. |

Les trois entités correspondantes ne sont **résolues que si leur option est
active** : une option éteinte ne coûte aucun balayage de registre.

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:next_lesson` | Requise. Son état est l'horodatage de début ; ses attributs portent matière, salle, professeurs, fin et annulation. |
| `sensor:next_wake_up` | Optionnelle, sous `show_wake_up`. |
| `sensor:end_of_lessons` | Optionnelle, sous `show_end_of_day`. |
| `sensor:next_test` | Optionnelle, sous `show_next_test`. |
| `binary_sensor:in_class` | Optionnelle. Pose la mention « Cours en ce moment ». |
| `binary_sensor:lessons_canceled` | Optionnelle. Signale des annulations dans la journée. |

## Ce que la carte ne prétend pas savoir

Quand `binary_sensor:in_class` est à `on`, un intitulé « Prochain cours »
sépare la mention du cours affiché : la pastille décrit **maintenant**, la
ligne décrit **la suite**. Sans cet intitulé, on lisait l'une pour l'autre.

Une heure de fin peut être **déduite** plutôt que fournie. Elle porte alors
un `≈`, dont le sens est donné en infobulle. Deux causes, et le marqueur ne
les distingue pas :

- PRONOTE **omet** la fin du créneau, et elle est calculée depuis la
  position du cours dans la grille horaire de l'établissement ;
- PRONOTE **fournit** une fin inutilisable — à l'heure de début ou avant —
  et l'intégration la remplace par un créneau d'une heure.

Le `≈` se lit donc « ne prenez pas cette heure au pied de la lettre », et
non « le serveur ne l'a pas envoyée ». Sur certains établissements il est
allumé sur **chaque** ligne : le serveur n'y publie aucune heure de fin, et
ce n'est pas un défaut d'affichage.

## Si la carte est vide

« Aucun cours à venir » : la journée est terminée, ou la semaine. C'est un
état normal, distinct de « pas encore collectée ». La carte le décide
elle-même, parce que l'intégration publie ici un état que le socle ne peut
pas interpréter à sa place.

Un état illisible n'efface pas la carte : matière, salle et professeur
restent affichés s'ils sont exploitables.
