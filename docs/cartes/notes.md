# Notes

Moyenne générale, dernières notes, moyennes par matière et bulletin.

![Aperçu de la carte Notes](../assets/cartes/notes.svg)

*Illustration synthétique : toutes les valeurs sont fictives.*

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
| `subject_colors` | — | Table matière → couleur. **En YAML uniquement**, voir plus bas. |

`report_card` n'est **pas** dans les valeurs par défaut : le bulletin
n'existe qu'en fin de période, et une section vide la plupart de l'année
n'aide personne.

### Exemple complet

Toutes les options renseignées, les quatre sections comprises :

```yaml
type: custom:pronote-ng-notes
device_id: <appareil de l'enfant>
sections:
  - average
  - latest
  - subjects
  - report_card
limit: 10
```

L'ordre des sections dans le YAML ne change pas l'ordre d'affichage : la
carte les rend toujours dans le même ordre, `sections` ne fait que choisir
lesquelles paraissent.

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

## Les couleurs de matière

Chaque ligne de les moyennes par matière porte un **filet vertical** à sa gauche, dans la couleur de sa
matière. La couleur se prend à trois rangs, dans cet ordre :

1. **la couleur publiée par PRONOTE**, quand l'intégration l'expose ;
2. **sinon votre table `subject_colors`** ;
3. **sinon la gouttière reste réservée, mais transparente** — la ligne garde
   son alignement, elle n'a simplement pas de couleur.

!!! info "Aujourd'hui, seul le rang 2 donne des couleurs"

    L'intégration décode la couleur que votre établissement associe à chaque
    matière, mais ne la publie pas encore dans ses entités. Votre table est
    donc ce qui colore la carte pour l'instant. Le jour où l'intégration expose
    le champ, le rang 1 prend le dessus **sans que vous ayez rien à
    supprimer** : votre table reste le repli des matières que le serveur ne
    colore pas.

La table s'écrit **en YAML uniquement**, parce qu'aucun formulaire de Home
Assistant ne rend correctement un dictionnaire dont les clés sont les matières
de votre établissement :

```yaml
subject_colors:
  MATHEMATIQUES: '#1e88e5'
  histoire-geographie: '#43a047'
  anglais: '#fb8c00'
```

Les noms sont comparés **sans tenir compte de la casse, des espaces de bord ni
des accents** : `histoire-geographie` colore « Histoire-Géographie ». Vous
n'avez donc pas à recopier les libellés de PRONOTE à l'identique.

Deux règles encadrent ces couleurs, et elles ne changeront pas :

- **Un filet, jamais un aplat.** Une couleur derrière du texte casse le
  contraste dès qu'un thème sombre est actif, et votre thème n'y peut alors
  plus rien. En filet, le pire cas est un accent peu visible.
- **Seul l'hexadécimal strict est accepté** (`#1e88e5` ou `#f80`). Un nom de
  couleur CSS ou un `rgb()` est ignoré, et la ligne s'affiche sans couleur.
  Cette valeur finit dans une propriété de style : un filtre étroit est ce qui
  empêche une chaîne de configuration d'y injecter autre chose. La règle vaut
  aussi pour **votre** table — l'origine d'une valeur ne dit rien de son
  innocuité.

Le filet **ne porte aucune information à lui seul**. Il situe et il décore ;
le texte de la ligne informe. Une carte lue par quelqu'un qui ne distingue pas
ces teintes ne perd donc rien.

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

## Le code couleur des matières

Les **moyennes par matière** portent la couleur que l'établissement associe
à la matière, en bordure gauche — le même code visuel que sur l'emploi du
temps, dont la page explique [comment il fonctionne et pourquoi il n'est pas
encore visible](emploi-du-temps.md#le-code-couleur-des-matieres).

C'est la seule section colorée de cette carte : PRONOTE n'envoie pas de
couleur pour une note individuelle ni pour une matière de bulletin. Les
autres lignes gardent malgré tout le même retrait, pour que la liste des
notes et celle des moyennes — qui se suivent sans intertitre — restent
alignées.

## Si la carte est vide

« Aucune note pour cette période » : c'est le cas normal à la rentrée, et
il est distinct de « pas encore collectée ». Les moyennes par matière ont
leur propre phrase, parce qu'un relevé peut porter des notes sans qu'aucune
moyenne ne soit encore publiée.
