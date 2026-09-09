# Les couleurs de matière

Quatre cartes savent colorer une matière : [Vue journée](cartes/journee.md),
[Emploi du temps](cartes/emploi-du-temps.md), [Devoirs](cartes/devoirs.md) et
[Notes](cartes/notes.md). Elles partagent une seule option, `subject_colors`,
et exactement les mêmes règles. Cette page les décrit une fois pour toutes.

## Sans table, il n'y a aucune couleur

C'est la première chose à savoir, et elle explique la plupart des surprises :
**tant que vous n'écrivez pas de table, aucune matière n'est colorée nulle
part.**

Ce n'est pas un réglage à trouver. Un créneau publié par l'intégration porte
quatorze champs — la matière, les professeurs, la salle, le début, la fin, le
statut, l'annulation, le contrôle, la sortie, la retenue, la dispense, le mémo
et la marque de fin déduite — et **aucun n'est une couleur**. Le champ n'est pas
vide : il est absent. L'intégration décode pourtant la couleur que votre
établissement associe à chaque matière, sur quatre chemins de sa passerelle,
mais elle ne l'expose sur aucune entité.

Votre table est donc, aujourd'hui, la seule source de couleur.

## Écrire la table

```yaml
type: custom:pronote-ng-journee
device_id: <appareil de l'enfant>
subject_colors:
  MATHEMATIQUES: '#1e88e5'
  histoire-géographie: '#8d6e63'
  Sciences: '#43a047'
```

L'option **n'existe qu'en YAML**, et c'est délibéré : un dictionnaire dont les
clés sont les matières de votre établissement ne se modélise pas dans un
formulaire Home Assistant. Ouvrez l'éditeur de la carte, passez en **Afficher
l'éditeur de code**, et ajoutez le bloc. Les autres options restent modifiables
dans le formulaire ensuite.

## Les trois rangs

La couleur d'une matière se prend dans cet ordre :

1. **la couleur publiée par le serveur**, quand l'intégration l'expose ;
2. **sinon votre table** ;
3. **sinon rien.** Sur les trois cartes qui posent le filet en gouttière à
   gauche, la gouttière reste réservée mais transparente, pour que la ligne
   garde son alignement. Sur [Devoirs](cartes/devoirs.md), où le filet suit
   l'intitulé de la matière, il n'y a rien à réserver : la ligne n'a pas de
   filet du tout.

**Il n'y a pas de quatrième rang, et surtout pas une couleur calculée à partir
du nom.** C'est le rang qui n'existe pas, volontairement. Une couleur déclarée
est assumée et corrigible ; une couleur dérivée d'un hachage aurait l'apparence
d'une information sans en porter aucune — deux matières prendraient deux teintes
qu'un lecteur lirait comme une catégorie, et le jour où le serveur publierait
ses vraies couleurs, elles contrediraient l'habitude prise.

## Hexadécimal strict, et rien d'autre

Seules deux formes sont acceptées : `#1e88e5` et `#f80`.

`red`, `rgb(30, 136, 229)` et `var(--primary-color)` sont **refusés sans un
mot** : la ligne s'affiche simplement sans couleur, et aucun message ne vous dit
pourquoi. Si une matière reste grise alors que vous l'avez renseignée, c'est la
première chose à vérifier.

Le filtre est étroit parce que la valeur finit dans un attribut `style` : une
chaîne non filtrée y ajouterait des propriétés CSS arbitraires. La règle vaut
aussi pour **votre** table — l'origine d'une valeur ne dit rien de son
innocuité.

## La casse et les accents sont ignorés

`histoire-géographie`, `HISTOIRE-GEOGRAPHIE` et `Histoire-Geographie` désignent
la même matière. La comparaison retire les signes diacritiques, coupe les
espaces de bord et passe en minuscules.

Ce n'est pas un confort. PRONOTE écrit souvent les matières en capitales
accentuées, et sans ce repliement une table rédigée sans accents laissait la
ligne grise **sans un mot** — rien ne distinguait alors « j'ai mal écrit la
matière » de « cette matière n'a pas de couleur ». Le risque inverse, deux
matières d'un même établissement ne différant que par un accent, n'existe pas.

## Un filet, jamais un aplat

Une couleur derrière du texte casse le contraste dès qu'un thème sombre est
actif, et votre thème n'y peut alors plus rien. En filet, le pire cas est un
accent peu visible.

Le filet **ne porte aucune information à lui seul**. Il situe et il décore ; les
horaires, l'intitulé et les pastilles informent. Une carte lue par quelqu'un qui
ne distingue pas ces teintes ne perd donc rien.

## Ce que l'option ne fait pas

**Il n'y a pas de réglage global.** La table est une option **par carte** : un
tableau de bord qui affiche l'emploi du temps, la journée, les devoirs et les
notes la répète quatre fois. Avec deux tableaux de bord, huit fois.

Et il n'y a pas d'astuce pour l'éviter : les **ancres YAML** ne survivent pas à
un tableau de bord en mode stockage, qui est enregistré en JSON. Elles ne
fonctionneraient que sur un tableau de bord en mode YAML, et se perdraient au
premier passage par l'éditeur.

**Deux cartes affichent une matière sans avoir l'option** :
[Prochain cours](cartes/prochain-cours.md) et
[Évaluations](cartes/evaluations.md).

## Le jour où l'intégration publiera la couleur

Le rang 1 prendra le dessus **tout seul**. Votre table deviendra le repli des
matières que le serveur ne colore pas : il n'y aura rien à défaire, rien à
retirer, et rien à réécrire.
