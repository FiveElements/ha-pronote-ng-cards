# Ce que ces cartes ne feront jamais

## L'URL iCal, l'identité et le PDF d'emploi du temps

L'intégration expose ces trois données par des services à réponse, et
non par des entités. Ce n'est pas un oubli : c'est la raison d'être de
ce choix.

L'URL iCal donne accès à l'emploi du temps complet d'un élève **sans
aucun identifiant**. Quiconque l'obtient l'a pour de bon. Elle se traite
comme un mot de passe.

Une carte est une surface partageable par construction : une capture
d'écran, un partage d'écran en visioconférence, un tableau de bord
ouvert sur une tablette de cuisine, une photo envoyée pour demander de
l'aide. Aucune de ces trois données n'y a sa place.

Le type qui décrit ce qu'une carte peut faire n'autorise que deux
appels de service — tenter d'en passer un autre ne compile pas :

- `pronote_ng.refresh`, qui ne place aucune requête PRONOTE : il
  relève une priorité auprès de l'ordonnanceur (détail plus bas) ;
- `todo.update_item`, qui coche un devoir sur une entité `todo` de
  Home Assistant — sans rapport avec le limiteur ni avec les données
  ci-dessus.

Les six services à réponse qui exposent ces trois données restent donc
hors d'atteinte par le type : une carte ne peut ni les appeler
directement, ni s'en approcher en passant un couple domaine/service
arbitraire à la place des deux ci-dessus. À côté de cette garantie de
type, un test de garde vérifie en plus qu'aucun couple domaine/service
en dehors de cette liste n'apparaît dans le code source — une
vérification de texte, complémentaire à celle du type, pas un
substitut. Un second test échoue si le nom de l'un de ces services
réapparaît dans le code ou la documentation.

**Cette page est la réponse aux demandes de carte « emploi du temps
PDF » ou « fiche élève complète ». La réponse est non, et elle ne
dépend pas de qui demande.**

## Le journaliseur pronotepy

Ne l'activez jamais. Au niveau `DEBUG`, il écrit l'hexadécimal de chaque
requête, identifiants compris. Pour déboguer, activez uniquement :

```yaml
logger:
  logs:
    custom_components.pronote_ng: debug
```

## Le déclenchement de collectes

Aucune carte ne provoque de collecte en s'affichant. Le serveur PRONOTE
sanctionne l'adresse IP, et tout le budget de requêtes est géré par un
limiteur côté intégration.

La carte « limiteur » propose un bouton qui appelle `pronote_ng.refresh`.
Ce service ne place aucun appel : il relève une priorité auprès de
l'ordonnanceur. Un boost est plafonné à un par palier et par intervalle,
et le bouton se grise en conséquence — cliquer plus n'obtient pas plus.

## Le choix de la période (trimestre, semestre)

Aucune carte ne propose de sélecteur de période : les notes et la vie
scolaire affichées sont toujours celles de la période en cours. Il n'y
a aucun moyen d'afficher, depuis une carte, une période close — le
trimestre 1 une fois le trimestre 2 commencé, par exemple.

Ce n'est pas un oubli : c'est un trou structurel. Pour chaque période
close qu'elle suit, l'intégration crée un jeu d'entités suffixées par
un index. Mais toutes ces entités, sur un même appareil, partagent le
même `translation_key` — c'est exactement la clé que les cartes
utilisent pour retrouver une entité. La résolution ne peut donc pas
distinguer un trimestre 1 d'un trimestre 2 : elle rendrait l'une des
deux entités au hasard de l'ordre dans lequel le registre de Home
Assistant les liste.

L'échappatoire de surcharge d'entité (l'option `entities` d'une carte)
ne comble pas ce trou non plus : elle attend un identifiant d'entité
complet, et cet identifiant dérive du nom affiché de l'enfant dans
Home Assistant (voir [Installation](installation.md)) — une
information que la carte ignore par conception. Il n'y a donc pas
d'identifiant à proposer, même en configuration avancée.

Si vous avez besoin d'une période close précise, consultez-la
directement dans PRONOTE ou dans l'historique de l'intégration : pas
depuis une carte de cette bibliothèque.
