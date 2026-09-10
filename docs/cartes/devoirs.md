# Devoirs

Les devoirs à faire, groupés par échéance ou par matière, avec la case à
cocher quand l'intégration l'autorise.

![Aperçu de la carte Devoirs](../assets/cartes/devoirs.svg)

*Illustration synthétique : rien n'y vient d'un élève réel. Les dates, les
horaires et les valeurs sont inventés ; les matières sont des matières de
programme.*

## Configuration

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
filter: todo
group_by: date
```

## Options

| Option | Défaut | Effet |
| --- | --- | --- |
| `filter` | `todo` | `todo` (à faire), `tomorrow` (pour demain) ou `all` (tous). Change l'entité lue. |
| `group_by` | `date` | `date` ou `subject`. Les devoirs sont toujours ordonnés par échéance — groupés par matière, à l'intérieur de chaque matière. Groupé par échéance, la date titre le groupe et n'est plus répétée en fin de chaque ligne. |
| `limit` | *tout* | Nombre maximum de devoirs. Absent ou négatif : tout. `0` : rien — et la carte dit alors que la cause est l'option, non l'absence de devoirs. |
| `max_lines` | *aucun repli* | Nombre de lignes d'énoncé avant repli. Voir [L'énoncé long](#lenonce-long-et-la-hauteur-de-la-carte). |
| `show_attachments` | `true` | Afficher les pièces jointes d'un devoir, une pastille par pièce. Voir [Les pièces jointes](#les-pieces-jointes). |
| `subject_colors` | — | Table matière → couleur. **En YAML uniquement**, voir plus bas. |

### Exemple complet

Les trois options les plus courantes, copiables telles quelles. Les autres
— la table de couleurs, le repli de l'énoncé, les pièces jointes — ont chacune
leur section plus bas :

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
filter: todo
group_by: date
limit: 12
```

`title` et `entities` fonctionnent en plus sur toutes les cartes : voir
[Deux options communes](../installation.md#deux-options-communes-a-toutes-les-cartes).

## L'énoncé long, et la hauteur de la carte

C'est la plus haute des onze cartes, pour une raison qui lui est propre :
l'énoncé est son **contenu**, pas sa décoration. Mesuré le 10 septembre 2026
sur une instance — des énoncés allant jusqu'à 313 caractères, l'un d'eux
occupant à lui seul 161 pixels, et la carte atteignant **1 376 pixels** avec
le filtre « à faire », **1 647** avec « tous ».

`max_lines` replie l'énoncé au nombre de lignes voulu :

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
max_lines: 3
```

Trois choses rendent ce repli sûr, et elles comptent : un énoncé tronqué sans
le dire cacherait la moitié d'un devoir à quelqu'un qui ne sait pas qu'il y a
une moitié cachée.

- **Le repli se signale tout seul.** Les points de suspension sont peints par
  le navigateur, et **seulement quand le texte déborde vraiment**. Un énoncé
  qui tient déjà dans le nombre de lignes demandé n'est pas replié du tout.
- **Un clic ou une touche déplie**, et referme. C'est un bloc `details`
  natif, donc il s'annonce comme tel à un lecteur d'écran.
- **Le texte entier reste dans la page** pendant qu'il est replié. Une
  recherche dans le navigateur le trouve ; seule la peinture est coupée.

L'option est vide par défaut : sans elle, rien ne change.

!!! note "Le repli n'est pas exact, et l'erreur dépend de la largeur"

    La carte décide de replier **avant** de connaître sa largeur, en comptant
    80 caractères par ligne. Mesuré sur les mêmes vingt devoirs, à trois
    largeurs, avec `max_lines: 3` :

    | largeur | caractères par ligne | replis posés | replis utiles | replis inutiles |
    |---|---|---|---|---|
    | 380 px | ≈ 54 | 6 | 6 | 0 |
    | 700 px | ≈ 104 | 6 | 4 | 2 |
    | 1 100 px | ≈ 168 | 6 | 3 | 3 |

    Cette page a d'abord annoncé que l'erreur allait toujours dans le même
    sens — replier moins souvent qu'il ne faudrait. C'est vrai sur une carte
    étroite et **faux** au-delà d'environ 550 pixels, où la constante devient
    trop basse : la carte replie alors des énoncés qui tenaient déjà.

    Ce qui reste exact à toute largeur, et c'est ce qui fait tenir le
    mécanisme : les points de suspension sont peints par le navigateur, et
    seulement sur un débordement réel. Un repli inutile pose donc un bloc
    dépliable qui n'annonce rien — le canal visuel ne ment jamais. Seule la
    sémantique se trompe, en offrant à déplier ce qui était entier.

    Aucune constante ne corrige les deux bouts. Le rendre exact demande de
    faire descendre la largeur de la carte jusqu'au rendu, ce qui touche le
    socle et n'est pas décidé.

### La hauteur annoncée à Home Assistant

Home Assistant demande à chaque carte sa hauteur pour équilibrer les colonnes
d'une vue en maçonnerie. Celle-ci annonçait **5**, soit environ 250 pixels,
pour 1 376 mesurés — un facteur cinq, et le plus large écart du dépôt : la
carte la plus haute se déclarait parmi les plus courtes. Elle l'estime
désormais d'après son `filter`, son `limit` et son `max_lines`.

Cette estimation reste approximative, et il vaut mieux le savoir que le
découvrir : la hauteur dépend surtout de la longueur des énoncés, qui est une
**donnée** et non une option — or Home Assistant ne passe que la
configuration. Un `limit` explicite, lui, est exact et remplace l'estimation.

## Les couleurs de matière

La couleur de la matière est une **gouttière à gauche** du bloc, comme sur
les quatre autres cartes à gouttière. La [vue journée](journee.md) est
l'exception : elle pose son filet **entre l'heure et la matière**, parce que
sa colonne d'horaires se lit seule et qu'un filet à sa gauche colorerait
l'heure autant que la matière. Un devoir sans couleur
garde sa gouttière, réservée mais transparente : sans elle, la ligne se
décalerait de neuf pixels par rapport à sa voisine colorée, ce qui se lit
comme un défaut d'affichage plutôt que comme une matière sans couleur.

Cette page a décrit pendant un temps un autre placement — un filet pleine
hauteur posé entre la matière et l'énoncé, qui coupait la ligne en deux —
et une colonne de matière de largeur commune à toutes les lignes d'un même
jour. Les deux ont été retirés par la même décision, et pour une raison qui
n'est pas l'esthétique : la matière **titre** désormais le bloc, et
l'énoncé passe dessous sur toute la largeur de la carte. En colonne, il ne
disposait que de 132 pixels sur une carte de 420 — or l'énoncé est ce que
la carte a à dire.

Depuis la version 0.0.13 de l'intégration, cette couleur vient
**du serveur** : vous n'avez rien à écrire pour la voir. Une table
`subject_colors` ne sert plus qu'à colorer une matière que votre
établissement laisse sans couleur, ou à remplacer une teinte qui vous
déplaît — et le serveur **gagne** sur votre table, donc une entrée qui
double une couleur reçue ne fait plus rien.

```yaml
type: custom:pronote-ng-devoirs
device_id: <appareil de l'enfant>
subject_colors:
  MATHEMATIQUES: '#1e88e5'
  histoire-géographie: '#8d6e63'
  Sciences: '#43a047'
```

Les trois rangs de la couleur, le format accepté — hexadécimal strict,
le reste est refusé sans un mot — le repliement de la casse et des
accents, et ce que l'option ne fait pas sont décrits une fois pour
toutes dans [Les couleurs de matière](../couleurs-de-matiere.md).

## Entités consommées

| Clé | Rôle |
| --- | --- |
| `sensor:homework_todo` | Requise avec `filter: todo`. |
| `sensor:homework_tomorrow` | Requise avec `filter: tomorrow`. |
| `sensor:homework` | Requise avec `filter: all`. |
| `binary_sensor:homework_overdue` | Optionnelle. Bandeau « en retard » en tête. |
| `todo:homework` | Optionnelle. Rend la case à cocher possible (voir ci-dessous). |
| `calendar:homework` | Optionnelle. Nomme la prochaine échéance, quel que soit le filtre. |

Trois entités distinctes portent le même nom de traduction sur des
domaines différents — `sensor:homework`, `calendar:homework` et
`todo:homework`. C'est la raison pour laquelle toutes les clés du projet
sont qualifiées par leur domaine.

`calendar:homework` n'est lue que dans ses **attributs**. Obtenir la liste
de ses évènements demanderait un appel de service, donc une collecte au
rendu — que le projet interdit et que le type refuse à la compilation. La
ligne « prochaine échéance » survit à l'état vide, et c'est là qu'elle sert
le plus : rien à rendre demain, mais une échéance existe plus loin.

## Ce que « en retard » veut dire, et ses deux sources

La pastille apparaît à **deux** endroits, qui ne disent pas la même chose.

En tête de carte, un bandeau suit `binary_sensor:homework_overdue`. Il porte
sur l'élève entier, pas sur la fenêtre affichée : avec `filter: tomorrow`,
vous pouvez donc le voir alors qu'aucune ligne visible n'est en retard. C'est
voulu, et c'est même le seul endroit où l'information vous parvient dans ce
filtre.

Il annonce **combien** : « 4 en retard », et non le seul mot. Le chiffre vient
de l'attribut `count` du capteur, que la carte jetait jusqu'au 10 septembre
2026. Sur une intégration antérieure à cet attribut, le bandeau garde le
libellé nu plutôt que de disparaître.

Sur une ligne, la pastille suit la **date du devoir** : échéance passée **et**
devoir non fait. Les deux conditions comptent. Un devoir coché dont l'échéance
est passée est le cas normal — on coche après avoir fait, et l'échéance passe
ensuite.

Ce second point a été corrigé le 10 septembre 2026. La carte ne regardait que
la date : mesuré sur une instance avec `filter: all`, **neuf** lignes portaient
la pastille pour **quatre** retards réels, et les cinq de trop étaient
exactement les cinq devoirs cochés. L'intégration, elle, comptait juste. La
carte criait donc au retard d'autant plus fort que l'élève avait travaillé, et
elle contredisait son propre bandeau sur la même page.

## Les pièces jointes

Un devoir peut porter des documents. L'intégration les publie dans
`attachments`, et la carte les a ignorés pendant onze versions : un devoir qui
demandait d'ouvrir une fiche ne le disait pas.

Chaque pièce apparaît désormais en **pastille** sous l'énoncé, et
`show_attachments: false` les retire. Elles restent visibles quand l'énoncé
est replié : c'est justement le devoir dont on ne lira que les premières
lignes, et s'il porte un document il doit continuer à le dire.

La pastille n'est pas une décoration, c'est le vocabulaire de la carte
notes, de la carte élève et de l'emploi du temps — elle prend ses couleurs
du thème, elle passe à la ligne toute seule quand la carte est étroite, et
elle donne une cible de clic prenable au doigt le jour où il y aura quelque
chose à ouvrir. Une première version reprenait le gabarit du site web de
PRONOTE, une liste à tirets précédée d'un libellé « Pièces jointes : ».
Ce libellé coûtait une ligne entière pour ce qu'un nom de fichier dit déjà :
il ne s'écrit plus, mais il nomme le groupe pour un lecteur d'écran, qui
annoncerait sinon « liste, deux éléments » sans dire de quoi.

Deux mesures faites dans un thème réel, parce qu'elles ont chacune renversé
une préférence :

- **la pastille lit à la taille de l'énoncé**, pas plus petit. La primitive
  réduit de 0,8 et la ligne secondaire déjà de 0,9 : un nom de fichier tombait
  à dix pixels, plus petit que le texte au-dessus de lui. Un nom de document
  est du contenu, pas une étiquette d'état ;
- **une pastille ouvrable est soulignée**, et de la même couleur que les
  autres. La couleur d'accent du thème sur le fond de pastille donnait 2,59
  contre 1 — la règle sur le contraste des textes demande 4,5. Le soulignement
  ne dépend d'aucune couleur, ce qui est justement ce qu'on attend d'un lien
  posé au milieu d'un texte. Sans adresse, pas de soulignement : c'est ce qui
  distingue ce qui s'ouvre de ce qui se lit.

Les pastilles de pièces jointes ne se confondent pas avec la pastille
« en retard », et c'est mesuré plutôt qu'espéré : celle-ci est blanche sur
rouge, plus petite, et posée dans la partie finale de la ligne, là où les
pièces sont grises sur gris, sous l'énoncé. La couleur porte l'alerte, la
taille porte la lisibilité : les deux familles n'occupent pas le même canal.

Mesuré le 10 septembre 2026 sur une instance : douze pièces réparties sur neuf
devoirs sur vingt, deux au plus par devoir.

### Ouvrir la pièce : ce qui s'ouvre, et ce qui ne s'ouvrira pas

**Une pastille sur trois s'ouvre, et les autres ne s'ouvriront jamais.** Ce
n'est pas un chantier en cours : c'est une propriété de PRONOTE, et elle vaut
d'être comprise une fois pour ne pas l'attendre indéfiniment.

Il y a **deux sortes de pièces**, et la différence décide de tout. Établi dans
la source de la bibliothèque, pas déduit d'une adresse observée :

- une pièce de type **lien** porte son adresse telle quelle — stable, sans
  secret. Un lien vers elle vivrait ;
- une pièce de type **fichier** n'a pas d'adresse stable du tout. Le long
  jeton de son chemin n'identifie pas le document : c'est son numéro chiffré
  avec la clé **et** le vecteur de la session en cours, suivi d'un paramètre
  de session. Deux adresses du même document, obtenues depuis deux sessions,
  n'ont aucun octet commun. Une telle adresse meurt à la connexion suivante,
  et une session inactive est abandonnée au bout d'une heure.

Ce que ça change : pour un fichier, « le lien qui échouera un jour » n'est
pas un risque à pondérer, c'est le résultat garanti. Une pastille cliquable
qui ouvre une page d'erreur est pire qu'un nom, parce qu'elle a promis. C'est
pourquoi l'intégration ne publie l'adresse **que** des pièces de type lien :
ce n'est pas un oubli, c'est le refus de promettre.

Une pastille de type lien s'ouvre donc dans un nouvel onglet ; une pastille de
type fichier reste du texte, sans soulignement, et rien n'invite à cliquer
dessus. Mesuré le 10 septembre 2026 sur une instance : **quatre pièces
ouvrables sur douze**, sur quatre devoirs de vingt, vers des adresses
publiques collées par des professeurs — un site de vente, une vidéo, un
éditeur scolaire.

Ce compte est une propriété des devoirs de la quinzaine, **pas de votre
établissement** : une semaine sans lien n'ouvrira aucune pastille, et ce n'est
pas une panne. La pastille muette est le cas courant, pas le cas dégradé.

Une pastille qui ne s'ouvre pas **dit pourquoi au survol**. Sans ça, elle
ressemble à une panne de la carte, et c'est exactement la conclusion qu'en a
tirée le propriétaire la première fois : « les liens sur les fichiers ne
fonctionnent pas ». La phrase est dans l'infobulle et non sous la pastille,
parce qu'on ne la lit qu'une fois et qu'elle coûterait cinq lignes sur huit
pièces.

Si vous comptez les ancres et qu'il vous en manque une, vérifiez d'abord quel
capteur la carte lit. Un devoir **coché fait** sort de la liste à faire par
construction, avec sa pièce ouvrable : c'est arrivé le 10 septembre 2026, où
`filter: all` montrait quatre liens et le réglage par défaut trois.

#### Comment les deux listes se rejoignent

L'intégration publie sur chaque devoir `attachments`, les noms de toutes les
pièces, et `attachment_links`, les seules pièces ouvrables. La carte les
rapproche **par le nom**, la même chaîne des deux côtés, et garde l'ordre de
la première liste — un tri qui remonterait les pièces ouvrables ferait bouger
les pastilles d'un devoir à l'autre sans qu'on puisse le prévoir.

Pourquoi deux listes et non une adresse ajoutée à la première, puisque ça
aurait été plus simple ici : `attachments` porte des chaînes depuis l'origine,
et y mettre des objets casserait tout gabarit qui la joint par des virgules
— ce qui est la façon normale d'écrire « Pièces jointes : a.pdf, b.pdf »
dans une notification. Le coût a été pesé des deux côtés, et une ligne de
carte coûtait moins cher qu'une rupture pour tous les lecteurs de l'attribut.

Ce rapprochement a une **faiblesse connue**, signalée plutôt que découverte :
si un même devoir porte deux pièces de même nom dont une seule est un lien,
le nom ne les distingue plus et les deux pastilles s'ouvrent vers la même
adresse. C'est rare, c'est cosmétique, et c'est le prix assumé de ne pas
rompre la forme. La carte ne « corrige » pas ce cas en n'ouvrant que la
première pastille : rien ne dirait que c'est la bonne.

Trois précautions encadrent ce lien :

- **seuls `http` et `https` sont acceptés.** Cette valeur vient du serveur et
  atterrit dans un attribut `href` : un `javascript:` y exécuterait du code
  dans votre page Home Assistant. Un schéma refusé laisse la pastille
  affichée sans lien — l'information ne disparaît pas ;
- **une adresse relative est refusée**, faute de savoir de quel hôte PRONOTE
  elle viendrait. La résoudre contre celui de Home Assistant fabriquerait un
  lien mort. C'est un garde et non un cas attendu : la bibliothèque préfixe
  par le site racine, donc une adresse publiée serait absolue — le relatif
  est un fait sur le HTML du site web, pas sur ce qui nous parviendrait ;
- **une adresse de pièce jointe ouvre le document sans demander
  d'identifiant.** Elle se traite comme l'URL iCal : sa place n'est ni dans le
  dépôt, ni dans cette documentation, ni dans une capture d'écran. Les quatre
  adresses mesurées sont publiques et ne portent aucune autorisation, mais
  c'est une propriété de ces quatre-là et pas une garantie de la clé ;
- **le lien s'ouvre dans un nouvel onglet, sans référent.** Le document est
  sur un serveur tiers : `rel="noreferrer"` évite de lui annoncer l'adresse
  de votre Home Assistant.

Un détail de forme, pour finir : quand une adresse arrive sans nom, la
pastille écrit « Ouvrir la pièce jointe » plutôt que le dernier segment du
chemin. Le chemin d'une pièce PRONOTE ne porte pas de nom de fichier, et ce
segment serait le même mot sous chaque devoir.

Une dernière chose, parce que cette page a été écrite trois fois en un soir et
que l'ordre des erreurs vaut d'être connu. Elle a d'abord affirmé qu'ouvrir
une pièce « demanderait un appel de service, interdit au rendu » — faux, un
lien n'appelle aucun service. Elle a ensuite affirmé que la carte ne pourrait
« pas encore » ouvrir de document, ce qui laissait attendre le jour où toutes
les pastilles s'ouvriraient : ce jour n'existe pas pour les fichiers. **Les
deux fois, l'erreur était de décrire une limite sans savoir d'où elle
venait.**

Cette page a elle-même affirmé le contraire, et il vaut de le savoir pour ne
pas le réécrire : elle disait qu'ouvrir une pièce « demanderait un appel de
service, interdit au rendu ». C'était faux — un lien n'appelle aucun service.
**Une limite écrite parce qu'elle arrange n'est pas une limite**, et
`docs/limites.md` porte déjà deux leçons de ce genre.

## La case à cocher

Elle n'apparaît que si `todo:homework` est résolue **et** annonce la
capacité d'écriture dans son attribut `supported_features`. La capacité est
lue, jamais supposée.

Cocher appelle `todo.update_item` — l'un des deux seuls appels de service
que ces cartes peuvent émettre. Si l'appel échoue, la case revient à son
état précédent : elle ne doit pas mentir sur ce que le serveur sait.

## L'énoncé

PRONOTE écrit les énoncés en HTML. L'intégration publie une variante en
texte simple (`description_text`), et c'est elle qui est affichée. Sur une
intégration plus ancienne, la carte dévêt le HTML elle-même — sans jamais
l'injecter.

Cette section dit d'où vient le texte ; sa **longueur**, et ce qu'elle fait à
la hauteur de la carte, sont traitées dans
[L'énoncé long](#lenonce-long-et-la-hauteur-de-la-carte).

## Si la carte est vide

Trois phrases, selon le filtre : « rien à faire », « rien à rendre
demain », « aucun devoir ». C'est le vide qui appartient à la carte : elle
seule sait qu'une liste de zéro devoir pour demain se dit ainsi, et non
« donnée indisponible ».
