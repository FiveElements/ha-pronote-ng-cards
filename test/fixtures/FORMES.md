# Les formes que l'intégration publie vraiment

Ce fichier existe parce que **trois défauts de ce dépôt ont été causés par une
forme d'attribut supposée plutôt que vérifiée**, et que les trois avaient des
tests verts :

| défaut | ce que le code lisait | ce que l'intégration publie |
| --- | --- | --- |
| toutes les notes affichées en « — » | `grade` | `value` |
| deux cartes entièrement vides | `locale.time_zone` comme identifiant IANA | une préférence, `'local'` ou `'server'` |
| « 22 h 33 » pour une session de 29 min | des minutes supposées | des secondes, **déclarées** dans `unit_of_measurement` |

Le point commun n'est pas l'inattention : c'est que **la fixture répétait
l'hypothèse du code**. Un test dont les données viennent de la même supposition
que le code ne teste que la cohérence de la supposition. Écrire
`compte('sensor:session_age', 'sensor.abc_age', '45')` sans unité ne vérifie
rien — ça fige l'erreur.

**Avant d'écrire une fixture, prenez la forme ici.** Ne l'inventez pas, et ne
la déduisez pas du nom de l'attribut.

## Aucune donnée réelle ici

Ce fichier ne porte que des **noms** d'attributs, leurs **types** et leurs
**unités**. Aucun identifiant d'entité réel, aucun nom d'élève, aucun nom
d'établissement : les identifiants dépendent de l'installation, et seule la clé
qualifiée est stable. C'est aussi pourquoi le tableau est indexé par clé et non
par `entity_id`.

## Les deux attributs que portent presque toutes les entités de données

| attribut | type | sens |
| --- | --- | --- |
| `fetched_at` | `string` (ISO 8601 avec décalage) | instant de la collecte qui a produit cet état |
| `stale` | `boolean` | l'état est un repli, la dernière collecte a échoué |

Aucune carte ne les lit aujourd'hui. Ils sont là si une carte veut un jour dire
« figée depuis 11:21 » plutôt que de se taire.

## Le piège des unités

Deux capteurs de durée, **deux unités différentes**, toutes deux déclarées :

| clé | `unit_of_measurement` |
| --- | --- |
| `sensor:session_age` | `s` — des **secondes** |
| `sensor:session_lifetime` | `min` — des **minutes** |

Passez par `durationToMinutes(état, unité)` (dans `src/core/format.ts`), jamais
par `Number(état)` supposé être des minutes. Et **déclarez l'unité dans la
fixture** : sans elle, le test valide l'hypothèse au lieu de la forme.

`sensor:next_collection.overdue_by` est aussi en secondes, mais sans unité
déclarée — c'est un attribut, pas un état : la conversion est donc explicite
sur son site d'appel.

## Enfant — les clés que les cartes lisent

| clé | attributs |
| --- | --- |
| `sensor:class_name` | `establishment` (`string`) |
| `sensor:next_lesson` | `subject`, `classroom`, `end` (ISO), `teachers` (`array<string>`), `canceled` (`boolean`), `end_inferred` (`boolean`) |
| `sensor:end_of_lessons` | `subject`, `end_inferred` (`boolean`) |
| `sensor:next_wake_up` | `first_lesson` (ISO), `subject`, `margin_minutes` (`number`) |
| `sensor:lessons_today` | `lessons` (voir plus bas), `first_start`, `last_end`, `canceled_count` (`number`) |
| `sensor:timetable_tomorrow` | `lessons` |
| `sensor:timetable_week` | `lessons`, `weeks` (`array<number>`) |
| `sensor:homework_todo` | `items` (voir plus bas), `next_due` (ISO) |
| `sensor:homework`, `sensor:homework_tomorrow` | `items` |
| `calendar:homework` | `message`, `start_time`, `end_time`, `location`, `description`, `all_day` |
| `sensor:absences` | `items` (voir plus bas) |
| `sensor:unjustified_absences`, `sensor:delays`, `sensor:punishments` | `items` |
| `sensor:grades` | `items` (voir plus bas) |
| `sensor:averages` | `items` |
| `sensor:overall_average`, `sensor:class_average` | `period` (`string`), `out_of` (`number`) |
| `sensor:latest_grade` | `subject`, `out_of`, `coefficient`, `date` (ISO), `class_average`, `status` |
| `sensor:report_card` | `subjects` (voir plus bas), `comments` (`array<string>`), `period` |
| `sensor:current_period` | `start`, `end`, `index` (`number`) |
| `sensor:periods` | `items` : `{index, name, start, end}` ; `current_index` (`number`) |
| `sensor:evaluations` | `items` |
| `sensor:menu_today`, `sensor:menu_tomorrow` | `first_meal`, `main_meal`, `side_meal`, `other_meal`, `cheese`, `dessert` (tous `array`), `is_lunch`, `published` (`boolean`) |
| `binary_sensor:in_class` | `subject`, `classroom`, `teachers`, `ends_at` (ISO) |
| `binary_sensor:homework_overdue` | `count` (`number`), `items` : `{subject, due, description}` |
| `binary_sensor:test_today` | `count`, `subjects` (`array`) |
| `binary_sensor:lessons_canceled` | `count`, `items` |
| `binary_sensor:holidays` | `inferred` (`boolean`), `lookahead_days`, `next_lesson`, `weeks_fetched` |
| `todo:homework` | `supported_features` — le bit `UPDATE_TODO_ITEM` vaut **4** |

### Les listes imbriquées

```
lessons[]   id, subject, teachers, classroom, start, end, canceled, status,
            test, outing, detention, exempted, memo, end_inferred

items[] de sensor:homework*
            id, subject, description, description_text, due, done, attachments

items[] de sensor:absences
            id, from_date, to_date, justified, hours, days, reasons

subjects[] de sensor:report_card
            id, name, student_average, class_average, coefficient,
            comments, teachers
```

`description` est du **HTML** ; `description_text` est le même énoncé en texte
simple, avec de vrais retours à la ligne. Lisez `description_text` d'abord.

`end_inferred` vaut **exactement** « le serveur n'a pas envoyé la fin » —
vérifié dans les deux chemins de décodage de l'intégration, qui le posent tous
deux comme un simple test d'absence du champ. Rien d'autre ne le lève. Le
champ est toujours présent, et il peut valoir `true` sur **tous** les créneaux
— sur l'instance de référence, 37 sur 37 et **zéro** `false`, parce que cet
établissement ne publie aucune heure de fin. Le champ existe bel et bien côté
protocole et d'autres serveurs le renseignent : ne concluez pas de ce 37/37
que la donnée est toujours déduite.

Attention au sens de `false` : l'intégration remplace aussi une fin
**impossible** (à l'heure de début ou avant) par un créneau d'une heure, et ce
remplacement **ne lève pas** le drapeau. `false` veut donc dire « le serveur a
envoyé une fin », pas « cette fin est celle du serveur ». Aucun créneau de ce
genre n'a été observé sur l'instance de référence, faute de fin envoyée du
tout.

Les `lessons` publiées sont un **sous-ensemble** de ce que la passerelle
décode : `background_color`, `subject_id`, `groups`, `virtual_classrooms`,
`num`, `place` et `duration` existent côté intégration mais **ne sont pas**
dans l'attribut. Une carte ne peut donc pas s'en servir — ce n'est pas une
donnée manquante côté serveur, c'est une donnée non exposée.

### `background_color` — lu par les cartes, pas encore publié

Trois cartes lisent `background_color` **aujourd'hui** : l'emploi du temps sur
`lessons[]`, les devoirs sur `items[]`, les notes sur les `items[]` de
`sensor:averages`. Aucune installation ne le reçoit encore : la passerelle le
décode aux quatre endroits où le protocole l'envoie (`CouleurFond` sur les
créneaux et les devoirs, `couleur` — en minuscules — sur les moyennes par
matière) et le capteur ne l'expose sur aucune entité. Une demande de
publication est déposée côté intégration.

C'est donc le seul champ de ce fichier dont la forme vient d'une **demande** et
non d'un relevé. Les fixtures l'écrivent en hexadécimal (`#1e88e5`) parce que
c'est ce que le contrat demandé prévoit ; quand une installation le recevra
vraiment, **vérifiez la forme reçue et mettez cette section à jour** — c'est
exactement le genre de supposition qui a produit les trois défauts du tableau
en tête de fichier.

Une valeur qui n'est pas un hexadécimal strict est ignorée par `subjectColor`,
et la ligne s'affiche alors sans accent de couleur. Le champ est donc sans
risque de régression : le pire cas est le rendu d'aujourd'hui.

`status` est **orthogonal** à `canceled` : `canceled` dit si le cours a lieu,
`status` dit pourquoi. Relevé réel sur une semaine — `canceled: true` avec
« Prof. absent », et `canceled: false` avec « Cours modifié ». Traitez `status`
comme du texte opaque : les libellés observés sont ceux qu'un établissement a
écrits, pas une énumération fermée.

`hours` est une **chaîne écrite par l'établissement** (« 2h00 »), pas un nombre,
et `reasons` un tableau de chaînes. Ni l'un ni l'autre ne se reformule : un
motif d'absence peut contredire le drapeau `justified` sans que ce soit une
erreur à corriger.

## Compte — les clés de la carte limiteur

| clé | attributs |
| --- | --- |
| `sensor:limiter_state` | `options` (`array<string>`), `reason`, `until`, `consecutive_failures` (`number`) |
| `sensor:remaining_budget` | `daily_cap`, `hourly_rate`, `tokens` |
| `sensor:calls_today` | `by_tier` (`object`, palier → nombre), `logins`, `failed_logins` |
| `sensor:next_collection` | `tiers_due` (`array<string>`), `overdue_by` (secondes), `failing` (`object`, palier → nombre d'échecs consécutifs) |
| `sensor:last_collection` | `tier`, `duration_ms`, `calls` |
| `sensor:logins_today` | `failed`, `cap` |
| `sensor:session_age`, `sensor:session_lifetime` | voir « Le piège des unités » |

`consecutive_failures` du limiteur et `failing` de la prochaine collecte **ne
comptent pas la même chose**, délibérément : le premier ne compte que les
erreurs de transport et les refus du serveur, parce que c'est lui qui pilote le
recul exponentiel. Un palier qui ne sait pas décoder une réponse pourtant bien
formée apparaît donc dans `failing` avec un limiteur à zéro. « Le serveur va
bien, un palier ne comprend pas sa réponse » est l'histoire que les deux
nombres racontent ensemble : ne les réconciliez pas sur une carte.

## Ce qui n'est PAS vérifié sur instance

Les formes ci-dessus viennent d'une instance réelle, sauf celles dont la liste
était vide au moment du relevé. Leur forme vient alors du source Python de
l'intégration — la bonne provenance, mais pas une observation :

- `items` de `sensor:grades`, `sensor:averages`, `sensor:evaluations`,
  `sensor:punishments`, `sensor:delays`
- `subjects` de `sensor:report_card`, et tous les attributs de
  `sensor:latest_grade` : les deux entités étaient `unknown`, la période
  venant de commencer
- `image:photo` — **l'entité n'existe pas** sur toutes les installations.
  L'intégration ne la crée que si le compte annonce une photo.

Quand vous vérifiez une de ces formes sur une instance où elle est renseignée,
mettez la ligne à jour ici.

## Et `sensor:teaching_staff`

Elle existe, et **aucune carte ne la lit**. Ce n'est pas un oubli à corriger
sans réfléchir : ajouter une carte qui la consomme demande d'abord d'en voir la
forme renseignée, ce qui n'a pas encore été le cas.
