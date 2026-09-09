# Emploi du temps

Les cours du jour, du lendemain ou de la semaine, le créneau en cours
surligné.

## Configuration

```yaml
type: custom:pronote-ng-emploi-du-temps
device_id: <appareil de l'enfant>
range: today
show_rooms: true
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `range` | `today` | `today`, `tomorrow` ou `week`. Change l'entité lue, pas seulement l'affichage. |
| `show_rooms` | `true` | Affiche la salle sous chaque cours. |
| `show_teachers` | `false` | Affiche le ou les professeurs. |

En mode `week`, un intertitre marque chaque jour. La hauteur annoncée à
Home Assistant suit le mode : une poignée de lignes en mode journée, trois
fois plus en mode semaine — sans quoi la répartition en colonnes se ferait
de travers.

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:lessons_today` | Requise en mode `today`. |
| `sensor:timetable_tomorrow` | Requise en mode `tomorrow`. |
| `sensor:timetable_week` | Requise en mode `week`. |
| `binary_sensor:in_class` | Optionnelle. **Droit de veto** sur le surlignage (voir ci-dessous). |
| `binary_sensor:test_today` | Optionnelle. Pastille de tête, en mode `today` uniquement. |
| `binary_sensor:outing_today` | Optionnelle. Idem. |

Chaque cours porte ses propres attributs `test` et `outing` : ce sont eux
qui situent l'information au bon créneau dans tous les modes. Les deux
pastilles de tête ne sont qu'un résumé du **jour**, et un résumé faux vaut
moins que pas de résumé — c'est pourquoi elles ne s'affichent pas en mode
`tomorrow` ni `week`.

## Qui décide du cours « en cours »

Deux sources pourraient répondre, et les faire concourir produirait tôt ou
tard deux réponses contradictoires. Elles ont donc des rôles distincts :

- les **horodatages** des créneaux désignent lequel ;
- `binary_sensor:in_class` a un **droit de veto**, jamais celui de désigner.

À `off`, aucun créneau n'est surligné même si l'horloge le suggère : le
capteur voit ce que l'attribut ne porte pas — jour banalisé, cours déplacé
après la collecte, élève dispensé. À `on` sans créneau correspondant, la
carte ne fabrique rien.

## Si la carte est vide

« Aucun cours » : week-end, jour férié, vacances. Ce n'est pas une panne
de collecte. Un cours **annulé** reste visible, barré : le retirer
donnerait l'illusion qu'il n'a jamais existé.
