# Ce que l'intégration publie et qu'aucune carte ne montre

Analyse critique des quatre cartes issues de l'ancien format — emploi du
temps, devoirs, cantine, vie scolaire — pour repérer l'information que le
**nouveau** producteur expose et que l'ancien n'avait pas, donc qu'un
inventaire de l'ancien produit ne pouvait pas trouver.

Méthode : les 65 entités du registre croisées avec les clés que `src/cards/`
mentionne, puis les attributs réels relevés sur instance croisés avec les
champs que chaque `render` lit. Pas de mémoire ; les formes non observables
viennent du source Python de l'intégration, et c'est dit à chaque fois.

**Ce document liste des manques, pas des bogues.** Rien ici ne rend une
carte fausse. Mais une information qu'on ne montre pas est une information
perdue pour le parent, et le but du projet est qu'elle ne le soit pas par
inadvertance.

## Niveau 1 — les familles entières sans aucune carte

**Dix-neuf clés d'entité qu'aucune carte ne peut lire, quelle que soit sa
configuration.** C'est la perte la plus lourde, et elle est structurelle :
il n'y a pas d'option à activer, il n'y a pas de carte.

| clé | ce qui est perdu | gravité |
| --- | --- | --- |
| `sensor:information`, `sensor:unread_information` | les actualités de l'établissement, et leur compte non lu | **haute** — un parent ne les voit qu'en tuile, sans le titre ni l'auteur |
| `sensor:discussions`, `sensor:unread_messages` | les messages de la messagerie, et leur compte non lu | **haute** — même raison |
| `sensor:teaching_staff` | l'équipe pédagogique | moyenne, et non observable : indisponible sur l'instance de référence |
| `sensor:periods` | la liste de **toutes** les périodes avec leurs bornes | moyenne — les cartes ne lisent que la période en cours |
| `calendar:timetable`, `calendar:punishments` | les évènements de calendrier correspondants | faible — les capteurs portent la même information sous forme de liste |
| `button:refresh`, `button:refresh_marks` | les deux boutons de rafraîchissement | faible — la carte limiteur appelle le service, ce qui est équivalent et mieux encadré |
| les 11 `event:*` | note, devoir, cours modifié, actualité, absence, retard, punition, message, évaluation | faible pour une carte — un `event` sert une automatisation, pas un affichage |

Les deux premières lignes sont le vrai trou : **actualités et messagerie
n'ont aucune carte**, alors que le producteur publie l'intitulé, l'auteur,
la catégorie, la date et l'état lu pour chaque actualité.

## Niveau 2 — les attributs publiés et non rendus

### Vie scolaire — la perte la plus grave du lot

Formes prises du source de l'intégration pour les punitions et les retards,
dont les listes sont vides sur l'instance de référence.

| champ | lu ? | conséquence |
| --- | --- | --- |
| `absences[].days` | **non** | une absence de trois jours s'affiche comme une absence d'une heure ; seule la durée en heures est montrée |
| `delays[].justification` | **non** | champ **distinct** de `reasons` : le texte de justification est perdu |
| `punishments[].exclusion` | **non** | **une exclusion s'affiche exactement comme une retenue.** C'est la perte la plus grave de tout le document : deux sanctions de nature très différente rendues à l'identique |
| `punishments[].reasons` | **non** | le motif de la punition, alors que le motif d'une absence est bien montré |
| `punishments[].schedule[].start` | **non** | la durée totale est calculée, mais **quand** la punition a lieu n'est jamais dit |
| `absences[].id`, `delays[].id`, `punishments[].id` | non | sans conséquence d'affichage |

### Emploi du temps

| champ | lu ? | conséquence |
| --- | --- | --- |
| `lessons[].detention` | **non** | une retenue est rendue comme un cours ordinaire |
| `lessons[].exempted` | **non** | une dispense est rendue comme un cours ordinaire |
| `lessons[].memo` | non | non observable : `null` sur les 37 créneaux relevés |
| `first_start`, `last_end` | **non** | aucune borne de journée affichée |
| `canceled_count` | non | recalculable depuis la liste |
| `weeks` | non | sans usage d'affichage |
| `end_inferred` | **écarté** | délibéré : cette carte n'affiche que l'heure de **début**, elle ne présente donc jamais une fin déduite comme une donnée |

### Devoirs

| champ | lu ? | conséquence |
| --- | --- | --- |
| `items[].attachments` | **non** | les pièces jointes d'un devoir ne sont jamais signalées |
| `items[].done` | **conditionnel** | lu, mais rendu **seulement** si l'entité de liste annonce l'écriture. Sur une installation sans écriture — le cas de l'instance de référence — rien n'indique qu'un devoir est fait |
| `homework_todo.next_due` | non | la carte prend la prochaine échéance de `calendar:homework` à la place ; même information par un chemin plus long |
| `homework_overdue.count`, `.items` | non | le bandeau ne dit pas **combien** de devoirs sont en retard |
| `calendar:homework.end_time`, `.location`, `.description` | non | sans usage clair |

### Cantine

| champ | lu ? | conséquence |
| --- | --- | --- |
| `is_lunch` | **non** | ses **trois** valeurs sont perdues : `null` (on ne sait pas), `true`, `false`. « On ne sait pas s'il s'agit du déjeuner » n'est pas « ce n'est pas le déjeuner » |

## Niveau 3 — décodé par l'intégration, jamais publié

Ni les cartes ni la documentation n'y ont accès : la passerelle décode ces
champs et le capteur ne les expose pas dans `lessons`.

`background_color` (depuis `CouleurFond`), `subject_id`, `groups`,
`virtual_classrooms`, `num`, `place`, `duration`.

Ce n'est pas un manque des cartes. C'est une demande à porter côté
intégration — `background_color` en particulier, parce qu'une couleur venue
du serveur ne tombe pas sous l'interdiction des couleurs en dur, qui vise
les couleurs écrites dans le code d'une carte.

**Correction de portée, mesurée depuis :** le protocole envoie une couleur de
matière sur **trois** familles, pas une. La passerelle la décode quatre fois —
`CouleurFond` sur les créneaux (deux chemins de décodage) et sur les devoirs,
`couleur` en minuscules sur les moyennes par matière — et le capteur n'en
publie aucune : `sensor.py` ne contient pas une seule occurrence de couleur.
Les notes individuelles, elles, n'en portent pas côté protocole.

**Ce point est traité côté carte.** L'emploi du temps, les devoirs et les
moyennes par matière lisent `background_color` et le rendent en accent de
gouttière ; rien ne change à l'écran tant que l'intégration ne publie pas le
champ. C'est le seul poste de ce document où le travail de carte est fait avant
la donnée, et il n'y a pas de raison d'attendre : la lecture est écrite, testée
et sans effet en son absence.

## Priorités, si l'on décide de combler

1. **`punishments[].exclusion`** — deux sanctions de gravité très inégale
   rendues à l'identique.
2. **`items[].done` visible sans écriture** — observable dès maintenant.
3. **`absences[].days`** — une absence longue est illisible aujourd'hui.
4. **`lessons[].detention` et `.exempted`** — deux créneaux qui ne sont pas
   des cours, présentés comme des cours.
5. **Une carte actualités** — la famille publiée la plus riche sans aucune
   surface.
6. `punishments[].reasons` et `.schedule[].start`, `delays[].justification`,
   `items[].attachments`, `is_lunch`, bornes de journée.

Rien de tout ceci n'est décidé. Cette liste existe pour que le choix soit
fait sciemment, et non par oubli.
