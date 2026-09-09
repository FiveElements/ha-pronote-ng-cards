# Vue journée

La journée d'aujourd'hui en grille : une colonne d'horaires, un filet de
couleur par matière, l'intitulé, et les créneaux sans cours du midi.

C'est un portage d'apparence de l'ancienne carte `lovelace-pronote`, sur la
**journée courante uniquement**. Pour le lendemain ou la semaine, voyez
[Emploi du temps](emploi-du-temps.md) : deux cartes qui répondent à la même
question de deux façons sont deux cartes qu'on maintient mal.

## Configuration

```yaml
type: custom:pronote-ng-journee
device_id: <appareil de l'enfant>
show_meal: true
show_rooms: true
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_meal` | `true` | Affiche la zone repas dans le creux du midi. |
| `meal_label` | « Repas » | Le mot affiché sur cette zone. |
| `meal_from` | `11:00` | Début de la plage du midi, en `HH:MM`. |
| `meal_to` | `14:30` | Fin de la plage du midi, en `HH:MM`. |
| `show_rooms` | `true` | Affiche la salle à côté de la matière. |
| `show_current` | `true` | Met en avant le cours en cours. |
| `subject_colors` | — | Table matière → couleur. **En YAML uniquement**, voir ci-dessous. |

Une plage du midi illisible (`meal_from: midi`) est **ignorée** : la plage
par défaut reprend, plutôt que de faire disparaître la zone repas sur une
faute de frappe.

## Les couleurs de matière

Le filet vertical prend sa couleur à **trois rangs**, dans cet ordre :

1. **la couleur publiée par PRONOTE**, quand l'intégration l'expose ;
2. **sinon votre table `subject_colors`** ;
3. **sinon un accent neutre**, pris dans les couleurs de votre thème.

!!! info "Aujourd'hui, seul le rang 2 donne des couleurs"

    L'intégration décode la couleur que votre établissement associe à chaque
    matière, mais ne la publie pas encore dans ses entités. Votre table est
    donc ce qui colore la carte pour l'instant. Le jour où l'intégration
    expose le champ, le rang 1 prend le dessus **sans que vous ayez rien à
    supprimer** : votre table reste le repli des matières que le serveur ne
    colore pas.

La table se renseigne en YAML, parce qu'aucun formulaire de Home Assistant ne
rend correctement un dictionnaire dont les clés sont les matières de votre
établissement :

```yaml
type: custom:pronote-ng-journee
device_id: <appareil de l'enfant>
subject_colors:
  MATHEMATIQUES: '#1e88e5'
  histoire-geographie: '#43a047'
  Anglais: '#fb8c00'
```

Les noms sont comparés **sans tenir compte de la casse** ni des espaces de
bord : PRONOTE écrit souvent les matières en capitales, et vous n'avez pas à
les recopier à l'identique.

Deux règles encadrent ces couleurs, et elles ne changeront pas :

- **Un filet, jamais un aplat.** Une couleur derrière du texte casse le
  contraste dès qu'un thème sombre est actif, et votre thème n'y peut alors
  plus rien. En filet, le pire cas est un accent peu visible.
- **Seul l'hexadécimal strict est accepté** (`#1e88e5` ou `#f80`). Un nom de
  couleur CSS ou un `rgb()` est ignoré, et la ligne s'affiche sans couleur.
  Cette valeur finit dans une propriété de style : un filtre étroit est ce
  qui empêche une chaîne de configuration d'y injecter autre chose.

Le filet **ne porte aucune information à lui seul**. Il situe et il décore ;
les horaires, l'intitulé et les pastilles informent. Une carte lue par
quelqu'un qui ne distingue pas ces teintes ne perd donc rien.

## La zone repas

Elle apparaît sur un **creux sans cours** qui recouvre la plage du midi et
dure au moins une demi-heure. Un interclasse de dix minutes n'en déclenche
pas.

Ce qu'elle dit : **il n'y a pas cours ici.** Rien de plus. Ni qu'un menu est
servi, ni que votre enfant mange au réfectoire — la carte ne lit aucune
entité de cantine. Le mot « Repas » est une convention que vous assumez,
c'est pourquoi il est modifiable.

Pour le menu du jour, voyez la carte [Cantine](menu.md), qui lit les
entités faites pour ça.

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:lessons_today` | Requise. Son attribut `lessons` porte toute la journée. |
| `binary_sensor:in_class` | Optionnelle. **Droit de veto** sur la mise en avant. |

Le capteur de cours en cours dit **si** un cours a lieu ; les horodatages
disent **lequel**. À `off`, aucun créneau n'est mis en avant même si
l'horloge le suggère : le capteur voit ce que l'attribut ne porte pas — jour
banalisé, cours déplacé après la collecte, élève dispensé.

## Le « ≈ » devant une heure de fin

PRONOTE n'envoie pas toujours l'heure de **fin** d'un cours. L'intégration la
calcule alors depuis la grille horaire de l'établissement, et ce calcul peut
se tromper. La carte le signale par un `≈`, dont le sens est donné en
infobulle.

Sur certains établissements ce marqueur est présent sur **chaque ligne** :
le serveur n'y publie aucune heure de fin. Ce n'est pas un défaut
d'affichage — c'est le cas de l'établissement sur lequel ces cartes sont
validées, où les 37 créneaux d'une semaine étaient tous dans ce cas.

Comme cette carte affiche l'heure de fin sur **toutes** ses lignes, c'est
elle qui rencontre le plus ce marqueur. Sans lui, sa colonne d'horaires
présenterait un calcul comme une donnée, toute la journée.

Le marqueur peut aussi apparaître sur la **zone repas** : le creux commence à
la fin du cours précédent, donc quand cette fin est déduite, la position du
repas l'est aussi.

## Si la carte est vide

« Aucun cours aujourd'hui » : week-end, jour férié, vacances. C'est un état
normal, distinct de « pas encore collectée ». Un cours **annulé** reste
visible, barré et marqué : le retirer donnerait l'illusion qu'il n'a jamais
existé.
