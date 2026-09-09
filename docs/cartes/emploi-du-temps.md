# Emploi du temps

Les cours du jour, du lendemain ou de la semaine, le créneau en cours
surligné.

![Aperçu de la carte Emploi du temps](../assets/cartes/emploi-du-temps.svg)

*Illustration synthétique : toutes les valeurs sont fictives.*

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

### Exemple complet

Toutes les options renseignées, copiable tel quel :

```yaml
type: custom:pronote-ng-emploi-du-temps
device_id: <appareil de l'enfant>
range: week
show_rooms: true
show_teachers: true
```

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

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

## Le code couleur des matières

PRONOTE laisse l'établissement choisir une couleur par matière, et l'élève
la connaît déjà de l'interface officielle. Les cartes la reprennent : une
**bordure colorée** à gauche de la ligne, de la couleur de la matière.

C'est la seule couleur que ces cartes n'inventent pas. Trois précisions,
parce qu'elle se comporte différemment de tout le reste.

**Une bordure, jamais un fond.** Les couleurs PRONOTE sont choisies pour le
fond blanc de son interface. Posées en aplat derrière du texte, elles
cassent le contraste dès qu'un thème sombre est actif, et le thème n'y peut
alors plus rien. En bordure, le pire cas est un accent peu visible : on perd
un rappel, jamais la lisibilité de la ligne.

**Rien à configurer, et rien à faire si votre établissement n'en met pas.**
Les lignes sans couleur gardent le même retrait que les autres — la
gouttière est réservée, simplement transparente. Une matière sans couleur ne
décale donc pas son voisinage.

**Les cartes concernées sont celles dont le producteur envoie une couleur** :
l'emploi du temps, les [devoirs](devoirs.md) et les moyennes par matière de
la carte [notes](notes.md). Les notes individuelles, les évaluations et le
bulletin n'en portent pas côté PRONOTE ; le prochain cours non plus, faute
d'être publié pour cette entité.

!!! info "Pas encore visible"

    L'intégration décode cette couleur mais ne la publie pas encore dans les
    attributs de ses entités. Les cartes la lisent déjà : l'accent
    apparaîtra dès qu'une version de l'intégration l'expose, sans aucune
    modification de votre tableau de bord. D'ici là, l'affichage est
    inchangé.

## Si la carte est vide

« Aucun cours » : week-end, jour férié, vacances. Ce n'est pas une panne
de collecte. Un cours **annulé** reste visible, barré : le retirer
donnerait l'illusion qu'il n'a jamais existé.
