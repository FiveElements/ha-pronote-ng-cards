# Mode de collecte

Le mode de récupération en vigueur, et de quoi le forcer à la main.

```
Mode en vigueur                              [ Heures calmes ]

[ Normal ]  [ Heures calmes ]

Repasser en mode normal peut faire repartir la collecte immédiatement
si des paliers sont en attente.
```

## À quoi elle sert

L'intégration collecte selon un ordonnanceur et un budget de requêtes, et elle
s'arrête pendant les **heures calmes** — une fenêtre nocturne où elle ne
demande plus rien au serveur PRONOTE. Ce réglage vit dans les options de
l'intégration, à trois niveaux de menu, et le sauvegarder **recharge
l'intégration**.

Cette carte existe pour rendre la bascule immédiate quand on en a besoin :
mettre l'intégration au repos pendant une soirée, ou la relancer pour vérifier
qu'une collecte repart. C'est un outil de **mise au point**, pas un réglage du
quotidien — sa place est sur un tableau de bord de diagnostic, à côté de la
carte [limiteur](limiteur.md).

## Ce qui marche aujourd'hui, et ce qui attend l'intégration

!!! warning "La bascule n'est pas encore disponible"

    La carte **affiche** le mode en vigueur dès maintenant. Elle ne peut pas
    encore le **changer** : l'intégration ne publie aucune entité pour ça, et
    aucun de ses services n'y touche.

    La carte le dit en clair au lieu d'afficher des boutons inertes. Le jour où
    une version de l'intégration expose le contrôle, les boutons apparaissent
    **tout seuls** — vous n'aurez rien à modifier dans votre tableau de bord.

    Il y en aura **deux** : *Normal* et *Heures calmes*. Un troisième mode qui
    suspendrait la collecte a été écarté par l'intégration, parce qu'une
    intégration qui ne collecte plus est indistinguable d'une panne pour qui
    regarde ses cartes.

D'ici là, pour changer le mode : **Paramètres → Appareils et services →
Pronote NG → Configurer → Limitation de débit**. Et sachez qu'enregistrer cette
page recharge l'intégration, donc vide temporairement les cartes. C'est
précisément ce que cette carte servira à éviter.

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `show_note` | `true` | Affiche l'avertissement sous les boutons. |

```yaml
type: custom:pronote-ng-mode-collecte
device_id: <appareil de l'enfant>
show_note: true
```

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

**Configurez-la avec l'appareil de l'enfant**, comme les dix autres, même si
elle lit des entités qui vivent sur l'appareil de compte. La carte remonte
toute seule. C'est le point le plus déroutant de l'intégration, et il n'y a
jamais d'autre appareil à choisir.

## L'avertissement sous les boutons

Il dit que repasser en mode normal **peut faire repartir la collecte
immédiatement** si des paliers sont en attente. Ce n'est pas une précaution de
façade : le serveur PRONOTE sanctionne l'adresse IP, et le budget de requêtes
est ce qui protège votre compte. Une bascule de mode n'est pas un bouton
d'affichage, c'est un bouton qui touche à ce budget.

Une seconde phrase apparaît quand la bascule est disponible : **un forçage ne
survit pas à un redémarrage de Home Assistant.** Le mode revient alors à ce que
disent les options de l'intégration. C'est délibéré du côté de l'intégration —
un forçage est un geste de mise au point, pas un réglage — et la carte le dit
plutôt que de vous laisser le découvrir.

Vous pouvez masquer les deux avec `show_note: false` sur un tableau de bord où
elles sont connues par cœur. Sur une vue que d'autres personnes de la maison
consultent, mieux vaut les garder.

## Ce que la carte ne fait pas

**Elle ne déclenche aucune collecte à l'affichage.** C'est vrai de toutes les
cartes de ce dépôt et c'est garanti par le type : voir
[Ce que ces cartes ne feront jamais](../limites.md). Un clic sur un mode est un
geste délibéré, comme le bouton de rafraîchissement de la carte limiteur — pas
un effet du rendu.

**Elle n'affiche pas la fenêtre horaire des heures calmes.** L'intégration ne
la publie pas comme état d'entité, et cette carte n'invente rien : elle dirait
« 22:00 – 06:00 » sans l'avoir lu, ce qui serait faux le jour où vous changez
la fenêtre. Elle est visible dans les options de l'intégration.

**Elle ne dit pas non plus pourquoi le mode est celui qu'il est.** « Heures
calmes » peut venir de la fenêtre horaire ou d'un forçage ; l'état publié ne
distingue pas les deux. La carte [limiteur](limiteur.md) porte le reste du
diagnostic — budget, prochaine collecte, paliers en attente.

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:limiter_state` | Requise. Le mode en vigueur, sur un ensemble de six valeurs fermé. |
| `select:collection_mode` | Optionnelle. La bascule. **Pas encore publiée par l'intégration.** |

Les deux vivent sur l'appareil de **compte**.

## Si la carte ne s'affiche pas

`sensor:limiter_state` est la seule entité requise. Si la carte affiche
« Entité introuvable sur cet appareil », c'est que les capteurs de diagnostic
ne sont pas activés dans les options de l'intégration — la carte
[limiteur](limiteur.md) sera vide pour la même raison.
