# Vie scolaire

Absences, retards et punitions, avec leurs compteurs et la prochaine
échéance.

![Aperçu de la carte Vie scolaire](../assets/cartes/vie-scolaire.svg)

*Illustration synthétique : rien n'y vient d'un élève réel. Les dates, les
horaires et les valeurs sont inventés ; le motif d'absence est du vocabulaire
courant.*

## Configuration

```yaml
type: custom:pronote-ng-vie-scolaire
device_id: <appareil de l'enfant>
sections:
  - absences
  - delays
  - punishments
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `sections` | les trois | `absences`, `delays`, `punishments`. Restreint le détail affiché, jamais les compteurs. |
| `limit` | `8` | Nombre d'éléments par section, les plus récents en tête. |

### Exemple complet

Toutes les options renseignées, les trois sections comprises :

```yaml
type: custom:pronote-ng-vie-scolaire
device_id: <appareil de l'enfant>
sections:
  - absences
  - delays
  - punishments
limit: 8
```

`sections` filtre **aussi les compteurs de tête**, pas seulement le détail :
retirer `delays` retire à la fois la ligne « Retards » et la liste des
retards.

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:absences` | Au moins une des quatre. `items[]` porte chaque absence. |
| `sensor:delays` | Au moins une des quatre. `items[]` porte chaque retard. |
| `sensor:punishments` | Au moins une des quatre. `items[]` porte chaque punition. |
| `sensor:unjustified_absences` | Au moins une des quatre. Compteur des absences non justifiées. |
| `binary_sensor:absence_in_progress` | Optionnelle. Signale une absence en cours. |
| `binary_sensor:punishment_upcoming` | Optionnelle. Signale une punition à venir. |
| `sensor:next_punishment` | Optionnelle. Jour et heure de la prochaine retenue. |

`sensor:unjustified_absences` figure parmi les quatre pour une raison
précise : il appartient à un palier différent des trois autres, et un
parent dont l'intégration ne publie que celui-là doit quand même obtenir
une carte utile.

## Ce que `sections` filtre vraiment

`sections` ne choisit pas seulement les listes détaillées : il filtre
**aussi les compteurs de tête**. Retirer `delays` retire à la fois la ligne
« Retards » et la liste des retards.

`sensor:unjustified_absences` n'a pas de section à lui : c'est une
sous-mesure des absences, et il suit donc le sort d'`absences`.

Les deux bandeaux — absence en cours, punition à venir — ne sont filtrés
par rien. Ce sont des faits du moment, souvent pas encore consignés dans les
listes détaillées, et les masquer avec une section les ferait disparaître au
pire moment.

## Ce que les données disent réellement

- **Une absence est justifiée ou non selon son champ `justified`, jamais
  selon son motif.** C'est le piège le plus coûteux de cette famille : une
  absence peut porter le motif « MALADIE SANS CERTIFICAT » **et** être
  justifiée. Le motif dit pourquoi l'enfant était absent, le champ dit si
  l'établissement l'a acceptée. Chercher un mot dans le motif pour en
  déduire l'autre donne une réponse fausse sur une absence ordinaire.
- La **durée d'une absence** est écrite par l'établissement, déjà composée
  (« 2h00 ») : c'est un texte, pas un nombre d'heures. Il est rendu tel
  quel. Un nombre, lui, est bien converti en durée.
- Les **motifs** (« maladie sans certificat »…) sont le texte du serveur.
  Ils complètent la ligne sans être traduits.
- La **durée d'une punition** n'existe qu'au niveau de ses créneaux : la
  carte en affiche la somme. Une punition n'a pas de durée au premier
  niveau, et ce n'est pas un oubli — PRONOTE ne la donne pas autrement.

## L'ordre et le plafond

Absences et retards sont triés sur l'**instant** — une absence sur sa fin,
ou sur son début à défaut — puis tronqués à `limit`, le plus récent en
tête. Un horodatage illisible part en fin de liste plutôt que de
s'intercaler au hasard.

**Les punitions ne sont pas triées**, et c'est faute de matière : une
punition ne porte aucune date au premier niveau, seulement ses créneaux.
`limit` les tronque donc dans l'ordre où l'intégration les envoie.

Une absence qui commence et finit à la même heure n'affiche pas sa borne de
fin : une flèche vers la même heure se lit comme une donnée manquante.

## Si la carte est vide

« Rien à signaler ». Le vide ne porte que sur le **détail** : les
compteurs et le bandeau d'échéance restent affichés, même quand aucune
section n'a de ligne. Les effacer avec le détail ferait disparaître
l'information la plus utile de la carte.
