# Élève

En-tête de synthèse pour une vue par enfant : classe, état du jour et
prochain cours.

## Configuration

Un seul réglage obligatoire : l'appareil de l'enfant.

```yaml
type: custom:pronote-ng-eleve
device_id: <appareil de l'enfant>
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_photo` | `false` | Affiche la photo de l'élève. L'entité correspondante n'est même pas résolue quand l'option est éteinte. |
| `show_establishment` | `false` | Ajoute le nom de l'établissement sous la classe. **Faux par défaut à dessein** : une carte est une surface partageable — capture d'écran, écran mural, partage de tableau de bord. |

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:class_name` | Requise. Son état est la classe ; son attribut `establishment` porte l'établissement. |
| `image:photo` | Optionnelle, et résolue uniquement si `show_photo` est vrai. |
| `binary_sensor:in_class` | Optionnelle. Un cours est en train de se dérouler. |
| `binary_sensor:school_day` | Optionnelle. Jour de classe. |
| `binary_sensor:holidays` | Optionnelle. Vacances. |
| `sensor:next_lesson` | Optionnelle. Matière et heure du prochain cours. |
| `sensor:current_period` | Optionnelle. Période en cours. |

Le nom affiché vient du **registre d'appareils** de Home Assistant, jamais
d'une chaîne écrite dans la carte : renommer l'appareil renomme la carte.

## Si la carte est vide

Cette carte n'a pas d'état vide propre : sa seule entité requise est la
classe. Si elle manque, le socle affiche « entité introuvable » et nomme
la clé — le palier correspondant n'est pas activé dans les options de
l'intégration. Les lignes optionnelles absentes ne produisent aucun
message : une information qu'on n'a pas n'est pas une information.
