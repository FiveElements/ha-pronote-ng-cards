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

Le socle de cette bibliothèque ne donne aux cartes aucun moyen
d'appeler ces services : ils sont absents du type qui décrit ce qu'une
carte peut faire, et deux tests automatiques échouent si leur nom
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
