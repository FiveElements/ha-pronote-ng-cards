# Limiteur

Le budget d'appels, l'état du limiteur, la prochaine collecte et un bouton
pour relever une priorité.

## Pourquoi cette carte existe

Le serveur PRONOTE sanctionne l'**adresse IP**, pas le compte. Tout le
budget de requêtes est donc géré par un limiteur côté intégration, et
cette carte est la fenêtre qui permet de comprendre pourquoi une donnée
n'est pas encore là — au lieu de conclure à une panne et de retenter.

## Configuration

Comme les huit autres, elle se configure avec l'appareil de **l'enfant**.

```yaml
type: custom:pronote-ng-limiteur
device_id: <appareil de l'enfant>
show_refresh: true
```

Les entités de diagnostic vivent en réalité sur l'appareil de **compte**.
Le socle y remonte tout seul en suivant `via_device_id` : ne demandez
jamais à l'utilisateur de choisir un autre appareil. C'est le point le
plus déroutant de l'intégration.

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_refresh` | `false` | Affiche le bouton de rafraîchissement. |
| `refresh_tier` | *aucun* | Palier à prioriser (`marks`, `timetable`, `homework`…). Vide : la priorité s'applique à l'ensemble. |

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:limiter_state` | Requise. `nominal`, `throttled`, `quiet_hours`, `backoff`, `credentials_hold`, `bootstrap_failed`. |
| `sensor:remaining_budget` | Optionnelle. Son attribut `daily_cap` porte le plafond. |
| `sensor:calls_today` | Optionnelle. `by_tier` détaille les appels par palier. |
| `sensor:next_collection` | Optionnelle. Échéance, `tiers_due`, `overdue_by`, `failing`. |
| `sensor:last_collection` | Optionnelle. Palier et instant de la dernière collecte. |
| `sensor:session_age` | Optionnelle. La carte lit l'unité que l'entité déclare (`unit_of_measurement`) : ces deux capteurs n'ont pas la même. |
| `sensor:session_lifetime` | Optionnelle. Même règle. Si l'unité est absente ou inconnue, la carte affiche la valeur brute suivie de son unité plutôt qu'une durée convertie à tort. |
| `sensor:logins_today` | Optionnelle. Connexions depuis minuit. |
| `binary_sensor:throttled` | Optionnelle. Collectes bridées. |

Un état que le catalogue de traductions ne connaît pas encore — parce que
l'intégration en ajoute un avant que les traductions suivent — retombe sur
l'état brut plutôt que sur une clé technique.

## Le bouton de rafraîchissement

Il appelle `pronote_ng.refresh`, qui **ne place aucune requête** : il
relève une priorité auprès de l'ordonnanceur, dans la limite du budget.
C'est écrit sous le bouton, parce que « rafraîchir » suggère le contraire.

Un boost est plafonné à **un par palier et par intervalle** côté serveur.
Le bouton se grise donc après un appui, et cette garde **survit au
rechargement de la page** : sans cela, recharger l'onglet réarmait le
bouton alors que le serveur refusait toujours — l'utilisateur appuyait,
rien ne se passait, et il recommençait.

**Limite connue.** La garde est globale par appareil, alors que le plafond
serveur est par **palier**. Deux paliers différents partagent donc une
garde qu'ils ne devraient pas partager : appuyer pour les notes grise aussi
le bouton pour l'emploi du temps. Le remède complet est une entité de
diagnostic côté intégration, qui n'existe pas encore.

## Une échéance dans le passé

C'est une lecture légitime : un palier est en retard. Mais « il y a
38 min » sur une *prochaine* collecte se lit comme une erreur d'affichage
et n'apprend rien sur la cause. Deux attributs séparent les deux
situations :

- `overdue_by` — le retard, nommé comme tel (« en retard de 38 min ») ;
- `failing` — le palier qui échoue à chaque tentative (« en échec : … »).

« L'échéance est passée et rien n'a tourné » et « il tourne et échoue à
chaque fois » cessent ainsi de se lire pareil.

## Ce que cette carte n'affichera jamais

L'état détaillé du limiteur est aussi disponible par un service à
réponse. Ce service **n'est pas** appelé ici, et son nom n'apparaît nulle
part dans le dépôt : voir [ce que ces cartes ne feront jamais](../limites.md).
