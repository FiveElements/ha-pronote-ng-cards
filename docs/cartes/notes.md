# Notes

Moyenne générale, dernières notes, moyennes par matière et bulletin.

## Configuration

```yaml
type: custom:pronote-ng-notes
device_id: <appareil de l'enfant>
sections:
  - average
  - latest
  - subjects
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `sections` | `average`, `latest`, `subjects` | Blocs affichés, dans cet ordre : `average` (moyenne de l'élève et de la classe), `latest` (dernières notes), `subjects` (moyennes par matière), `report_card` (bulletin). |
| `limit` | `8` | Nombre de dernières notes affichées. |

`report_card` n'est **pas** dans les valeurs par défaut : le bulletin
n'existe qu'en fin de période, et une section vide la plupart de l'année
n'aide personne.

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:overall_average` | Au moins une des trois. Moyenne générale ; son attribut `out_of` porte le barème. |
| `sensor:grades` | Au moins une des trois. `items[]` porte chaque note. |
| `sensor:averages` | Au moins une des trois. `items[]` porte les moyennes par matière. |
| `sensor:class_average` | Optionnelle. Moyenne de la classe. |
| `sensor:latest_grade` | Optionnelle, et lue seulement pour son **motif** (voir ci-dessous). |
| `sensor:current_period` | Optionnelle. Ligne transverse, hors des sections. |
| `sensor:report_card` | Optionnelle. `subjects[]` et l'appréciation générale. |

La carte s'affiche dès qu'**une** des trois premières est résolue. C'est ce
qui permet à un parent dont l'intégration ne publie qu'un palier d'obtenir
quelque chose d'utile.

## Les notes sans valeur numérique

PRONOTE emploie des sentinelles — « Absent », « Non noté », « Dispensé » —
qui rendent l'état non numérique. Le motif vit alors dans l'attribut
`status`, et c'est lui qui est montré : jamais un vide, jamais un zéro.

## Aucun sélecteur de période

L'intégration crée une entité par période close, toutes avec le même nom
de traduction sur le même appareil. La résolution rend la première
correspondance et rien ne permet de distinguer les autres — un sélecteur
afficherait donc une période qu'il ne maîtrise pas. La période **en cours**
s'affiche en revanche comme une ligne transverse, dès qu'elle est
exploitable.

## Si la carte est vide

« Aucune note pour cette période » : c'est le cas normal à la rentrée, et
il est distinct de « pas encore collectée ». Les moyennes par matière ont
leur propre phrase, parce qu'un relevé peut porter des notes sans qu'aucune
moyenne ne soit encore publiée.
