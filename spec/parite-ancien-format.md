# Spécification des cartes — parité et exploitation du nouveau format

Document de contributeur. Destiné à qui implémente ou relit une carte, non à qui l'installe.

**Objet.** Les huit cartes de `lovelace-pronote` sont déjà couvertes par les neuf cartes de ce dépôt. Ce document a donc deux moitiés, et il faut les lire différemment :

- **Parité** — les fonctionnalités des anciennes cartes, réécrites contre le format réel. Colonne *Parité* à remplir : `couvert`, `manquant`, ou `écarté` avec sa raison.
- **Exploitation** — ce que le nouveau format publie et que l'ancien ne pouvait pas connaître. Ce n'est pas de la parité : c'est ce qu'une carte perdrait à se contenter de reproduire l'ancienne.

**La couche de données de l'ancien format n'apparaît nulle part.** Écartée en totalité, pas traduite : l'ancien dépôt lit **un seul état** dans ses huit cartes, tout le reste vivant dans des attributs de liste que la carte parcourait elle-même. La cible met le fait dans l'état. Chaque fait désormais porté par un état **supprime** une ancienne règle au lieu de la réécrire — et c'est pourquoi la raison de chaque exigence est écrite : elle seule permet de distinguer une règle qui tombe parce que la cible la rend inutile d'une règle qui tombe parce qu'on l'a oubliée.

## Convention

Chaque exigence commence par **Exigence.**, énonce ce qui est demandé, **puis la raison**. Convention reprise de la spécification du module d'intégration. Deux règles de rédaction l'accompagnent, et ce document s'y astreint :

- **Une limite écrite parce qu'elle est souhaitable n'est pas une limite.** Là où la tentation est d'écrire « la carte ne peut pas X », écrire « la carte ne doit pas X, voici l'échappatoire et son coût ».
- **Ce qu'un type garantit n'est pas ce qu'un test vérifie.** Les deux n'ont pas la même force de preuve.

## Provenance

| Marque | Signification | Force |
| --- | --- | --- |
| `mesuré` | Relevé sur instance réelle, avec type observé et sans valeur reproduite. | Fiable pour l'établissement mesuré. Une seule instance. |
| `catalogue` | Lu dans le catalogue d'entités du module cible ou dans ses constructeurs. | Fiable comme contrat publié. Non observé en fonctionnement. |
| `fonctionnel` | Fonctionnalité établie par lecture intégrale du code d'origine — huit cartes, huit éditeurs, deux classes de base. | Fiable comme intention. L'ancien module n'est installé sur aucune instance accessible. |
| `décision` | Ni mesurable ni portable : la donnée n'existe pas, ou plusieurs réponses se défendent. | Ouvert. Appartient au propriétaire des cartes. |
| `bloqué` | Dépend d'une donnée que l'intégration ne publie pas. Demande de développement déposée. | Non spécifiable en l'état. |

Aucun identifiant relevé sur une instance réelle n'apparaît dans ce document, et ce n'est pas une précaution de style : l'identifiant interne de l'entrée de configuration expose l'adresse réelle de l'établissement et un identifiant de session, et l'appareil de compte porte le nom réel de l'établissement, qui se retrouve incrusté dans les identifiants de diagnostic. Un relevé copié tel quel fuit sans qu'on l'ait cherché.

## Correspondance des cartes

Établie par le propriétaire des cartes depuis les huit enregistrements d'éléments de l'ancien dépôt.

| Carte d'origine | Carte de ce dépôt | Note |
| --- | --- | --- |
| Emploi du temps | `pronote-ng-emploi-du-temps` | Correspondance directe. |
| Devoirs | `pronote-ng-devoirs` | Directe. Coche conditionnelle — voir DEV-10. |
| Notes | `pronote-ng-notes` | Section des dernières notes. |
| Moyennes | `pronote-ng-notes` | **Fusion.** Sections moyenne et matières. Même famille d'entités, même période. |
| Évaluations | `pronote-ng-evaluations` | Directe. |
| Cantine | `pronote-ng-menu` | Directe. États vides et périmètre à écrire de zéro. |
| Absences | `pronote-ng-vie-scolaire` | **Fusion** avec les retards. |
| Retards | `pronote-ng-vie-scolaire` | Fusion bénéfique — voir VIE-7. |
| *aucune* | `eleve`, `prochain-cours`, `limiteur` | Sans équivalent d'origine. Aucune exigence de ce document ne les concerne. |

Le module cible publie en outre des familles qu'aucune carte d'origine ne couvrait — actualités, messagerie, punitions et sanctions, équipe pédagogique, diagnostics du limiteur. Elles sortent du périmètre de ce document, qui part de l'inventaire de l'ancien format ; elles sont signalées là où elles complètent une famille existante.

---

# 1. Exigences transverses

S'appliquent à toutes les cartes. Vérifiables une fois pour le socle, sauf mention contraire.

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| TRV-1 | **Exigence.** Une carte résout ses entités par clé qualifiée par domaine et appareil, et ne connaît aucun identifiant d'entité. *Raison :* les identifiants suivent le nom de l'enfant et les renommages de l'utilisateur. Mesuré : lors de l'orphelinage d'un appareil enfant, les cartes résolvant par clé ont suivi sans reconfiguration, tandis que les badges natifs câblés sur identifiant ont dû être recâblés à la main. La qualification par domaine est obligatoire, une clé n'étant unique qu'à l'intérieur d'un domaine. | `mesuré` |  **couvert** — garanti par construction |
| TRV-2 | **Exigence.** Tout tri, regroupement ou filtre temporel opère sur l'instant résolu, jamais sur la chaîne d'horodatage. *Raison :* les horodatages portent un décalage explicite et un même jeu peut mélanger les notations ; la comparaison textuelle donne alors le mauvais ordre, l'instant le plus tardif paraissant le plus petit. | `mesuré` |  **couvert** — tri sur l'instant |
| TRV-3 | **Exigence.** La préférence de fuseau de Home Assistant est traduite en fuseau effectif, **puis** le fuseau obtenu est validé avant usage. *Raison :* cette préférence n'est pas un identifiant de fuseau mais un choix entre heure du navigateur et heure du serveur ; la passer directement à un formateur de dates lève une erreur sur sa valeur par défaut, et une exception dans le rendu laisse la racine d'ombre **vide, sans message**. Mesuré : deux cartes n'affichaient plus rien en jetant plus de mille exceptions. | `mesuré` |  à auditer |
| TRV-4 | **Exigence.** Aucune couleur littérale dans le code d'une carte ; toutes proviennent des variables de thème. *Échappatoire admise :* une couleur **fournie par le serveur** n'est pas une couleur écrite dans le code et ne tombe pas sous cette interdiction. *Raison :* les cartes doivent suivre le thème de l'utilisateur. Contre-exemple d'origine : un séparateur blanc en dur, invisible en thème clair. | `fonctionnel` |  à auditer |
| TRV-5 | **Exigence.** Une unité se lit sur la donnée, jamais ne se suppose. *Raison :* mesuré, des secondes prises pour des minutes ont affiché « 22 h 33 » pour une durée de 29 minutes. Les anciennes cartes écrivent l'unité en français à côté du nombre sans jamais la lire, ce qui rend la faute indétectable. *Portée réelle, relevée à l'audit :* seuls les **états** portent une unité déclarée ; les valeurs situées dans les éléments d'un attribut de liste n'en portent aucune. Pour celles-ci, le nom du champ est le seul signal disponible — c'est le mieux accessible, ce n'est pas une lecture d'unité, et c'est une raison de plus pour DEM-1. | `mesuré` |  à auditer |
| TRV-6 | **Exigence.** Aucun rendu ne déclenche de collecte. *Raison :* le serveur amont ne publie pas de limite de débit et sanctionne l'adresse, suspension coûteuse incluse. Les services d'action du module — collecte prioritaire, cocher un devoir, marquer une actualité lue, envoyer un message — ne sont appelables que sur geste explicite de l'utilisateur, et les trois derniers seulement si l'écriture est activée. *Propriété déjà acquise :* l'ancien dépôt compte **zéro appel de service**, vérifié par recherche exhaustive. | `catalogue` |  à auditer |
| TRV-7 | **Exigence.** Un rafraîchissement périodique est **déclaré** par la carte et installé par le socle ; la carte n'installe aucune minuterie. *Raison :* un repeint sur des données déjà présentes ne collecte rien et ne contrevient pas à TRV-6 — l'interdit porte sur les requêtes. Ce qui est proscrit est la minuterie posée dans la carte, non le repeint. | `mesuré` |  **couvert** — intervalle déclaré au socle |
| TRV-8 | **Exigence.** Quatre situations sont distinguées et rendues différemment : absente du registre ; indisponible ; **vide** ; restaurée sans producteur. *Raison :* le vide appartient à la carte parce qu'elle seule sait que zéro devoir se dit « rien à rendre » et non « donnée indisponible ». Et deux attributs répondent à deux questions distinctes — l'un « est-ce vieux ? », l'autre « est-ce mort ? » — la seconde ne se posant jamais à la première. Mesuré : une entité restaurée est indisponible, ne conserve aucune valeur et perd les attributs de fraîcheur. | `mesuré` |  à auditer |
| TRV-9 | **Exigence.** Un état d'indisponibilité ne promet rien : ni retour imminent, ni compte à rebours. *Raison :* l'indisponibilité étant par ailleurs qualifiée de transitoire, une panne définitive prend l'apparence d'un incident passager, et la carte ne peut pas distinguer les deux cas. | `mesuré` |  à auditer |
| TRV-10 | **Exigence.** Un vide provoqué par un filtre de configuration nomme le filtre responsable. *Raison :* c'est le seul des vides que l'utilisateur peut corriger lui-même ; le confondre avec un vide de données le laisse sans recours. | `fonctionnel` |  à auditer |
| TRV-11 | **Exigence.** Une carte n'infère aucun motif d'une absence de données — ni vacances, ni jour férié, ni déjeuner, ni grève. *Échappatoire :* le module publie lui-même un indicateur de vacances, et le catalogue le déclare explicitement comme une **déduction** ; une carte peut l'afficher en tant que tel, mais ne doit pas refaire la déduction de son côté ni la présenter comme un fait établi. *Raison :* la donnée ne porte pas ces mots. « Aucun cours entre 12:30 et 14:00 » est vrai ; « pause déjeuner » est une interprétation. | `catalogue` |  à auditer |
| TRV-12 | **Exigence.** Tout texte rédigé par l'établissement est affiché tel quel : jamais traduit, jamais normalisé, jamais énuméré comme domaine fermé. *Raison :* mesuré, quatre libellés de statut sur une semaine d'un seul établissement ; un autre en écrira d'autres. Une carte qui testait une valeur particulière a masqué deux cours modifiés de la semaine. *Exception documentée :* EDT-7 admet de reconnaître le libellé d'annulation en l'absence du drapeau, certaines versions du module ne posant que le libellé. L'asymétrie de gravité la justifie — un faux positif improbable contre un cours annulé rendu comme normal — et c'est la seule comparaison de libellé admise dans tout ce document. | `mesuré` |  à auditer |
| TRV-13 | **Exigence.** Une capacité d'entité est **lue**, jamais supposée, et l'interface qui en dépend n'existe que si elle est annoncée. *Raison :* mesuré sur l'entité de devoirs, masque de fonctionnalités à zéro. Une commande présentée mais inopérante est un mensonge ; une commande grisée invite quand même à cliquer. | `mesuré` |  **couvert** — capacité lue, preuve en DEV-10 |
| TRV-14 | **Exigence.** Aucun identifiant relevé sur une instance réelle ne figure dans un document, une capture ou un message. *Raison :* l'identifiant interne de l'entrée de configuration expose l'adresse réelle de l'établissement et un identifiant de session ; le nom réel de l'établissement est incrusté dans les identifiants de diagnostic. | `mesuré` |  à auditer |
| TRV-15 | **Exigence.** Aucune carte, aucun gabarit ne fait apparaître l'adresse iCal, le bloc d'identité, le lien du PDF d'emploi du temps, l'export d'identifiants, l'état exporté du limiteur ou le numéro INE. *Raison :* l'adresse iCal ouvre l'emploi du temps complet d'un élève sans aucun identifiant — elle se traite comme un mot de passe — et une carte est partageable par construction : capture d'écran, visioconférence, tablette de cuisine. Ces valeurs ne sont accessibles que par service à réponse seule, précisément pour qu'aucune surface partageable ne les retienne. *Constat :* aucune des huit cartes d'origine n'approche ces surfaces, vérifié. | `catalogue` |  à auditer |
| TRV-16 | **Exigence.** Les gardes traitent un seul cas d'absence. *Raison :* mesuré et confirmé par les constructeurs, tous les champs sont présents sur tous les éléments, l'absence étant signalée par un nul ou un tableau vide et jamais par un champ manquant. Distinguer « champ absent » de « champ vide » est du code mort. C'est l'inverse de l'ancien format, où la carte devait deviner. | `mesuré` |  à auditer |
| TRV-17 | **Exigence.** Un fait publié comme état d'entité est **lu**, non recalculé depuis une liste d'attributs. *Raison :* c'est la doctrine du module — tout fait sur lequel on peut déclencher a sa propre entité, dont l'état porte le fait — et la recalculer dans la carte crée une seconde source de vérité qui divergera. La moitié des exigences de ce document existe uniquement parce que l'ancien format n'offrait pas ce choix. | `catalogue` |  à auditer |
| TRV-18 | **Exigence.** Une carte qui veut réagir à une **nouveauté** s'appuie sur les entités d'événement du module, non sur une comparaison de dates. *Raison :* le catalogue publie un événement par changement — note ajoutée, devoir ajouté, cours annulé, déplacé, salle ou professeur changé, absence, retard, punition, évaluation. Un déclencheur d'état ne peut pas dire « une note *nouvelle* est arrivée », ce qui est la raison d'être de ces entités. *Limite à écrire :* rien n'est rejoué au démarrage, et un changement double produit deux événements — une carte ne peut donc pas reconstituer un historique depuis eux. | `catalogue` |  à auditer |

---

# 2. Emploi du temps

Carte cible `pronote-ng-emploi-du-temps`.

## 2.1 Parité — reprises de l'ancienne carte

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| EDT-1 | **Exigence.** Les créneaux sont groupés par date civile dérivée de l'instant. *Raison :* l'ancienne carte détecte le changement de jour en comparant des dates **formatées en français**, ce qui est la faute de TRV-2 en pire — et rend le regroupement dépendant de la locale d'affichage. | `fonctionnel` |  **manquant** — regroupement par libellé formaté ; correctif identifié, 3 lignes |
| EDT-2 | **Exigence.** La carte trie les créneaux elle-même, par instant de début. *Raison :* l'ancienne délègue le tri au producteur sans le vérifier ; un tableau désordonné y produit des journées dupliquées et un appariement de remplacements erratique. | `fonctionnel` |  **couvert** |
| EDT-3 | **Exigence.** Les bornes horaires d'une journée sont le premier début et la dernière fin parmi les créneaux **non annulés**. Journée intégralement annulée : aucune plage affichée. *Raison :* afficher une plage bâtie sur des cours qui n'ont pas lieu annonce une présence non requise. | `fonctionnel` |  **manquant** — bornes publiées, non lues |
| EDT-4 | **Exigence.** Les heures affichées sont dérivées des instants, d'une source unique. *Raison :* l'ancienne carte affiche des champs pré-formatés dans la ligne et recalcule en en-tête de journée — deux sources pour la même information, qui peuvent diverger sans que rien ne le signale. | `fonctionnel` |  **couvert** — source unique |
| EDT-5 | **Exigence.** La salle est omise lorsqu'elle est nulle, et cette absence est un **cas normal**, non une dégradation à signaler. *Raison :* mesuré, salle nulle sur trois créneaux d'une semaine avec matière présente. | `mesuré` |  **couvert** |
| EDT-6 | **Exigence.** Les enseignants sont traités comme une liste ; liste vide, la mention disparaît. *Raison :* mesuré, toujours un tableau, jamais une chaîne. Une carte qui attend une chaîne affiche une énumération technique. | `mesuré` |  **couvert** |
| EDT-7 | **Exigence.** L'annulation est marquée par le seul champ d'annulation. *Raison :* mesuré, l'annulation et son motif sont **orthogonaux** ; un motif présent sans annulation désigne un cours qui a bien lieu. | `mesuré` |  **écarté** — le libellé d'annulation est aussi reconnu sans le drapeau ; voir l'exception en TRV-12 |
| EDT-8 | **Exigence.** Le motif est affiché tel quel, dans une marque distincte de celle de l'annulation, et se tait lorsqu'il ne fait que la répéter. *Raison :* mesuré, deux cours « modifiés » non annulés s'affichaient comme ordinaires dans la carte cible parce que le motif n'était lu que pour y chercher une annulation — le motif était alors la seule information disponible. Unique déduplication admise ; voir TRV-12. | `mesuré` |  **couvert** — depuis le correctif né de cette exigence |
| EDT-9 | **Exigence.** Les créneaux passés sont atténués, comparaison sur l'instant, rafraîchis par l'intervalle déclaré de TRV-7. *Raison :* sans rafraîchissement, l'atténuation dépend d'une poussée d'état et un cours terminé reste présenté comme en cours. | `fonctionnel` |  **manquant** — surlignage « en cours » présent, atténuation des créneaux passés absente |
| EDT-10 | **Exigence.** Une interruption entre deux créneaux consécutifs d'une même journée est signalée au-delà d'un seuil ; l'interruption principale de la journée se **dérive** du plus grand intervalle intra-journée, non d'une heure fixe. Le libellé énonce l'absence de cours et sa plage, sans nommer de repas. *Raison :* aucun marqueur de demi-journée n'existe dans la donnée, et une bascule codée en dur serait fausse dans tout établissement qui déjeune à une autre heure. Voir TRV-11. | `mesuré` |  **manquant** |
| EDT-11 | **Exigence.** Un créneau annulé et son remplaçant sont appariés sur l'instant, sur l'ensemble des créneaux du même horaire. *Raison :* l'ancienne carte n'examine que l'élément suivant, et rate donc le remplaçant placé avant l'annulé ainsi que l'annulé en dernière position du tableau. | `fonctionnel` |  **manquant** |
| EDT-12 | **Exigence.** Une restriction de semaine, si elle existe, compare le couple année ISO et semaine ISO, et **filtre** au lieu d'interrompre le parcours. *Raison :* l'ancienne compare des numéros de semaine sans l'année ; en semaine 52, janvier est jugé antérieur et n'est pas filtré. Voir IND-2 : l'option peut n'avoir plus d'objet, les capteurs de la cible étant bornés au jour, au lendemain et à la semaine. | `fonctionnel` |  **écarté** — voir CLO-5 |
| EDT-13 | **Exigence.** Un plafond de journées coupe sur une frontière de journée : une journée rendue l'est intégralement. *Raison :* une journée tronquée en son milieu laisse croire à une fin de journée qui n'en est pas une. | `fonctionnel` |  **manquant** |
| EDT-14 | **Exigence.** L'identité de l'élève provient de la résolution de TRV-1. *Raison :* l'ancienne la lit sur un attribut de l'entité reçue en configuration, ce qui la lie au nommage. | `fonctionnel` |  **couvert** — garanti par construction |
| EDT-15 | **Exigence.** L'en-tête de journée porte une date lisible et la plage horaire de la journée, dérivée des instants des créneaux affichés et d'aucune autre source. | `fonctionnel` |  **à moitié** — date couverte, plage manquante (= EDT-3) |
| EDT-16 | **Exigence.** Le mode « une journée à la fois » est une option qui **existe réellement**, l'alternative étant les journées empilées. *Raison :* dans l'ancien dépôt, la carte Cantine lit une option de ce nom qui n'est déclarée nulle part et reste donc figée en mode navigation, sans échappatoire. | `fonctionnel` |  **manquant** — trois plages fixes au lieu d'un navigateur |
| EDT-17 | **Exigence.** L'index de la journée visible est un état réactif du composant, jamais une classe posée sur le DOM ; les contrôles de navigation sont focusables et étiquetés. *Raison :* l'ancienne mute le DOM hors du cycle de rendu — la sélection survit par effet de bord et se perd dès que le nombre de journées change — et ses flèches sont de simples éléments cliquables, inatteignables au clavier. | `fonctionnel` |  **manquant** — dépend d'EDT-16 |
| EDT-18 | **Exigence.** La journée ouverte est aujourd'hui si elle est présente, sinon la première à venir, sinon la dernière disponible ; l'index est **borné aux journées existantes**. *Raison :* l'ancienne désigne un index hors borne dès que la dernière journée est terminée, et la carte se vide entièrement en mode navigation. | `fonctionnel` |  **manquant** — dépend d'EDT-16 |

## 2.2 Exploitation du nouveau format

Faits publiés par le module cible qu'aucune règle d'origine ne couvre. Les six premiers sont des champs de créneau ; les suivants sont des **entités à part entière**, et TRV-17 impose de les lire plutôt que de les recalculer.

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| EDT-19 | **Exigence.** Un créneau portant un contrôle prévu le signale. *Raison :* c'est l'information qu'un parent cherche en priorité après l'heure et la salle, et l'ancien format n'y donnait pas accès. La donnée est un booléen : ne pas supposer de vocabulaire. | `mesuré` |  **couvert** — pastille par créneau et en tête de journée |
| EDT-20 | **Exigence.** Une sortie est signalée, distinctement d'une annulation. *Raison :* le cours n'a pas lieu en salle mais l'élève est attendu — le confondre avec une annulation produit une absence. | `mesuré` |  **couvert** — distincte de l'annulation |
| EDT-21 | **Exigence.** Une retenue est signalée et n'est pas comptée comme un cours ordinaire. | `mesuré` |  **manquant** — champ publié, non lu |
| EDT-22 | **Exigence.** Une dispense est signalée. *Raison :* elle modifie l'heure à laquelle l'élève est réellement attendu, donc interagit avec les bornes de journée d'EDT-3. | `mesuré` |  **manquant** — champ publié, non lu |
| EDT-23 | **Exigence.** Le champ de mémo est traité comme du texte opaque et n'est pas spécifié plus avant. *Raison :* nul sur tous les créneaux mesurés, sa forme peuplée est inconnue. Signalé pour ne pas l'oublier, non pour l'implémenter. | `mesuré` |  **invérifiable** — nul sur tous les créneaux observés |
| EDT-24 | **Exigence.** Le rendu de liste s'appuie sur l'identifiant propre du créneau. *Raison :* il évite de réattribuer un état de navigation au mauvais créneau quand la liste change — le défaut exact d'EDT-17 dans l'ancienne carte — et fiabilise l'appariement d'EDT-11. | `mesuré` |  **manquant** — rendu sans clé |
| EDT-27 | **Exigence.** Le cours en cours est désigné par l'**indicateur publié**, non par une comparaison d'instants faite dans la carte. *Raison :* TRV-17. L'indicateur est rafraîchi par le module ; une comparaison locale dépend de l'intervalle de repeint de la carte et se désynchronise entre deux poussées d'état. | `catalogue` |  à auditer |
| EDT-28 | **Exigence.** Le prochain cours, la fin des cours du jour et le prochain contrôle sont lus sur les **horodatages publiés**. *Raison :* trois faits que l'ancienne carte devait dériver de la liste, et qu'elle ne dérivait pas — elle n'avait ni notion de prochain cours ni notion de prochain contrôle. Le prochain contrôle est de plus une information qu'aucune règle de parité ne réclamait et qu'un parent utilise. | `catalogue` |  à auditer |
| EDT-29 | **Exigence.** Les compteurs publiés — cours du jour, du lendemain, de la semaine — sont utilisés pour les décomptes affichés. *Raison :* TRV-17, et ils permettent un état vide correct avant même que la liste soit parcourue. | `catalogue` |  à auditer |
| EDT-30 | **Exigence.** Les indicateurs binaires publiés — jour de classe, cours annulés dans la journée, sortie pédagogique, contrôle prévu — sont lus quand la carte veut résumer une journée. *Raison :* ils répondent en un état à des questions que l'ancienne carte ne pouvait poser qu'en parcourant toute la liste. | `catalogue` |  à auditer |
| EDT-31 | **Exigence.** L'indicateur de vacances, s'il est affiché, est présenté comme une **déduction** du module et non comme un fait de l'établissement. *Raison :* le catalogue le déclare lui-même comme tel, et TRV-11 interdit à la carte d'en produire une équivalente. | `catalogue` |  à auditer |
| EDT-32 | **Exigence.** Si la carte propose une vue calendaire, elle s'appuie sur l'entité d'agenda publiée — un événement par cours, annulés compris — plutôt que de reconstruire un calendrier depuis la liste. | `catalogue` |  à auditer |

## 2.3 États vides propres à la carte

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| EDT-25 | **Exigence.** Une journée présente et sans créneau reste affichée avec son en-tête daté et porte sa propre mention. En mode « une journée à la fois », elle reste atteignable à la navigation. *Raison :* l'escamoter fait disparaître une information — il n'y a pas cours ce jour-là — et crée un trou inexplicable dans la navigation. | `fonctionnel` |  **manquant** — journée vide absente de la vue semaine |
| EDT-26 | **Exigence.** L'absence de tout créneau sur la plage porte une mention distincte de la précédente, au niveau de la carte. *Raison :* « pas cours ce jeudi » et « rien sur la semaine » ne se corrigent pas de la même façon. L'ancienne carte n'a **aucun** état vide : son message est défini et jamais rendu, et un week-end elle affiche un en-tête nu. | `fonctionnel` |  **couvert** — mais la distinction d'avec EDT-25 n'est qu'à moitié tenue |

## 2.4 Décisions ouvertes

| Réf | Décision | Prov. | Statut |
| --- | --- | --- | --- |
| EDT-D1 | **Un créneau à huit enseignants.** Mesuré : un créneau porte huit noms avec une salle nulle, vraisemblablement un dédoublement de groupe ; joints par des virgules ils débordent la largeur d'une carte, et ce n'est pas un défaut de donnée. Quatre réponses se défendent : troncature avec décompte, premier nom et reste, retour à la ligne, masquage au-delà d'un seuil. **Seule exigence :** qu'une règle de dégradation existe et soit explicite. *Note :* l'information de groupe qui expliquerait ce cas est décodée mais non publiée — voir DEM-2. | `décision` | ouvert |
| EDT-D2 | **La colonne de couleur de matière.** La couleur est **décodée par l'intégration mais publiée dans aucun attribut** — de même que l'identifiant de matière, les groupes, les classes virtuelles, le numéro, le lieu et la durée. Deux voies : supprimer la colonne, ou attendre la publication du champ. Dériver une palette d'un hachage du libellé **inventerait une identité visuelle que l'établissement définit déjà**. Si le champ est exposé, la colonne devient un portage authentique et TRV-4 ne s'y oppose pas. | `bloqué` | déposé |
| EDT-D3 | **Signaler une fin non fiable.** Tranchée par le propriétaire des cartes : marqueur **ligne par ligne**, non mention globale en pied de carte, parce qu'une mention globale généraliserait depuis un seul établissement. Le libellé porte désormais sur la **confiance** : voir CLO-1, le drapeau répond à « puis-je faire confiance à cette heure ? ». | `décision` | tranchée |
| EDT-D4 | **Seuil de l'interruption signalée.** EDT-10 dérive l'interruption principale de la donnée. Reste à décider le seuil en deçà duquel une interruption n'est pas signalée — l'ancienne employait trente minutes sans justification retrouvable — et si un second intervalle notable mérite mention. | `décision` | ouvert |

---

# 3. Devoirs

Carte cible `pronote-ng-devoirs`.

## 3.1 Contrat d'élément

Lu dans les constructeurs. Tous les champs sont présents, `null` signalant l'absence.

| Clé | Type | Conséquence pour la carte |
| --- | --- | --- |
| `id` | chaîne | L'identifiant à fournir au service de cochage. |
| `subject` | chaîne **nullable** | Une carte qui suppose la matière présente affiche un titre vide. |
| `description` | chaîne, **HTML** | Saisi par le professeur. Voir DEV-6. |
| `description_text` | chaîne, texte simple | Le même énoncé, sans balisage. **C'est ce qu'une carte affiche.** |
| `due` | **date** ISO | Une date, pas un horodatage : aucune heure à afficher. |
| `done` | booléen | |
| `attachments` | tableau de **noms** | **Aucune URL.** Voir DEV-5. |

## 3.2 Parité et exploitation

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| DEV-1 | **Exigence.** Les devoirs sont groupés par date d'échéance, sur la date civile. *Raison :* voir EDT-1. L'échéance étant une date et non un horodatage, aucune heure n'est affichée ni utilisée pour trier à l'intérieur d'une journée. | `catalogue` |  **manquant** — même mécanisme qu'EDT-1 |
| DEV-2 | **Exigence.** L'état fait ou à faire est signalé **inconditionnellement**, indépendamment de toute capacité d'écriture. *Raison :* corrigé après audit — coupler l'affichage de l'état au contrôle qui le modifie fait disparaître l'information quand l'écriture n'est pas annoncée, ce qui est le cas sur l'instance de référence : plus rien n'y indique qu'un devoir est fait. Lire l'état et pouvoir l'écrire sont deux exigences distinctes ; seule la seconde est conditionnelle (DEV-10). | `mesuré` |  à auditer |
| DEV-3 | **Exigence.** Une option masque entièrement les devoirs faits. | `fonctionnel` |  **manquant** |
| DEV-4 | **Exigence.** Une option replie l'énoncé des devoirs **faits**, dépliable à la demande. *Raison :* la liste des devoirs restants est ce qu'on consulte ; l'énoncé d'un devoir terminé encombre sans informer. | `fonctionnel` |  **manquant** |
| DEV-5 | **Exigence.** Les pièces jointes sont listées **par nom**, sans lien de téléchargement. *Raison :* le module ne publie que des noms — il n'existe aucune URL de pièce jointe. L'ancienne carte produit un lien par pièce, et cette fonctionnalité **n'est pas portable** : ce n'est pas un choix de conception, c'est une donnée absente. Nommer la pièce reste utile — l'élève sait quoi chercher dans l'espace scolaire. | `catalogue` |  **manquant** — champ publié, non lu |
| DEV-6 | **Exigence.** La carte affiche `description_text` et **n'insère jamais** `description` comme balisage. *Raison :* les deux champs existent exprès et le code du module le dit — une carte ne peut pas produire l'un depuis l'autre. Injecter le HTML ferait de chaque champ saisi par un professeur une voie d'entrée dans le tableau de bord. L'ancienne carte insère précisément ce champ comme balisage brut, sans assainissement. *Échappatoire :* un rendu qui interprète réellement le HTML peut utiliser `description`, à condition de l'assainir explicitement ; le coût est de maintenir cet assainissement. | `catalogue` |  **couvert** — texte simple d'abord, jamais d'injection HTML |
| DEV-7 | **Exigence.** Tous les retours à la ligne de l'énoncé en texte simple sont préservés. *Raison :* l'ancienne carte n'en convertit que le premier, faute de portée globale : un énoncé de plusieurs paragraphes s'affiche aggloméré à partir du deuxième. | `fonctionnel` |  **couvert** |
| DEV-8 | **Exigence.** Une restriction de semaine, si elle existe, **ne perd aucun jour**. *Raison :* défaut le plus grave de l'ancienne carte, et actif par défaut. Son bloc résiduel n'est rendu que si le dernier devoir de tout le tableau appartient à la semaine courante ; avec le moindre devoir au-delà, les devoirs du dernier jour **disparaissent silencieusement**. Le même test d'égalité stricte interrompt aussi le parcours au premier élément si le tableau commence par une semaine passée. | `fonctionnel` |  **écarté** — pas d'option, donc le défaut ne peut se produire |
| DEV-9 | **Exigence.** En mode « une journée à la fois », la journée ouverte est désignée parmi les journées **réellement rendues**. *Raison :* l'ancienne incrémente son compteur même pour une journée qui ne produit aucun bloc, tous ses devoirs étant faits et masqués ; le premier bloc rendu n'a alors pas l'index attendu, aucun bloc n'est ouvert et la carte est vide. | `fonctionnel` |  **écarté** — pas de journée ouverte à décaler |
| DEV-10 | **Exigence conditionnelle.** Si l'entité de liste de tâches annonce la capacité de mise à jour, l'état fait est modifiable depuis la carte ; **sinon aucune commande n'est rendue**. *Raison :* mesuré, le masque de fonctionnalités vaut zéro — la capacité n'existe pas sur l'instance de référence. Le module expose par ailleurs un service dédié de cochage, lui aussi conditionné à l'activation de l'écriture. Voir TRV-13. *Écart d'origine indépendant :* l'ancienne carte simule le « fait » par une case sans effet, ce qui est **pire** que ne rien afficher, l'utilisateur croyant avoir agi. | `mesuré` |  **couvert** — vérifié en direct, zéro commande rendue |
| DEV-11 | **Exigence.** Aucun devoir : mention positive et non erreur. *Raison :* c'est la raison d'être du projet, et l'ancienne carte est la seule des trois surchargeant leur rendu à ne pas avoir perdu son état vide. | `fonctionnel` |  **couvert** — trois mentions distinctes selon le filtre |
| DEV-12 | **Exigence.** Les compteurs publiés sont lus plutôt que recalculés : devoirs à faire, devoirs pour demain, total. *Raison :* TRV-17. Ils donnent de plus un résumé exact avant tout parcours de liste. | `catalogue` |  à auditer |
| DEV-13 | **Exigence.** L'indicateur de **devoirs en retard** est exploité. *Raison :* fait publié qu'aucune règle d'origine ne couvre — l'ancienne carte ne distingue pas un devoir non fait dont l'échéance est passée. C'est l'information la plus actionnable de la famille. | `catalogue` |  à auditer |
| DEV-14 | **Exigence.** Si la carte propose une vue calendaire, elle s'appuie sur l'entité d'agenda publiée, un événement par échéance. | `catalogue` |  à auditer |

---

# 4. Notes et moyennes

Carte cible `pronote-ng-notes`, fusion de deux cartes d'origine. Les deux familles lisent les mêmes entités et la même période.

## 4.1 Notes

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| NOT-1 | **Exigence.** La valeur d'une note est lue sous son nom réel, vérifié contre le producteur. *Raison :* mesuré, une carte a lu un nom inventé et **toutes les notes s'affichaient absentes** — matière et coefficient corrects, valeur manquante, sans un signe d'erreur — et ses tests ne l'ont pas vu parce que leurs fixtures reprenaient le nom inventé. Un nom deviné se vérifie contre lui-même. | `mesuré` |  à auditer |
| NOT-2 | **Exigence.** Une note peut n'être **pas un nombre**. L'état vaut inconnu lorsque la note est une mention — absent, non rendu — et le motif est porté par un champ de statut distinct. La carte rend la mention, jamais un zéro ni un tiret muet. *Raison :* fait publié qu'aucune règle d'origine ne couvre ; l'ancienne carte convertit la valeur en nombre sans condition et afficherait un résultat non numérique. Un zéro affirmerait une note de zéro, ce qui est faux et lourd de conséquences. | `catalogue` |  à auditer |
| NOT-3 | **Exigence.** Le barème est lu et utilisé pour toute comparaison. *Raison :* le catalogue le déclare obligatoire pour comparer correctement — une note sur 10 et une note sur 20 ne se comparent pas entre elles. | `catalogue` |  à auditer |
| NOT-4 | **Exigence.** Une comparaison à un seuil de ratio, si elle est configurée, a priorité sur la comparaison à la moyenne de classe. *Raison :* les deux modes sont exclusifs ; l'ancienne carte établit cette priorité et il n'y a pas de raison de l'inverser. | `fonctionnel` |  à auditer |
| NOT-5 | **Exigence.** À défaut de seuil, la note est comparée à la moyenne de classe **lorsque celle-ci est disponible**, et aucune comparaison n'est affichée sinon. | `fonctionnel` |  à auditer |
| NOT-6 | **Exigence.** Le résultat de la comparaison est signalé autrement que par la seule couleur. *Raison :* TRV-4 réduit la palette disponible, et une information portée par la seule couleur est perdue pour une partie des lecteurs. L'ancienne carte n'a que la couleur. | `décision` |  à auditer |
| NOT-7 | **Exigence.** Une note nouvelle est repérée par l'**entité d'événement** publiée, non par comparaison de la date à aujourd'hui. *Raison :* TRV-18. L'ancienne carte marque comme nouvelle toute note datée du jour, ce qui rate une note saisie en retard et marque à tort une note ancienne ressaisie. *Limite :* rien n'étant rejoué au démarrage, la marque ne survit pas à un rechargement — à assumer, ou à compléter par la date. | `catalogue` |  à auditer |
| NOT-8 | **Exigence.** Le format de note est choisissable entre valeur sur barème et valeur seule. | `fonctionnel` |  à auditer |
| NOT-9 | **Exigence.** Le nombre de notes affichées peut être plafonné, et un plafond supérieur au nombre d'éléments n'est pas une erreur. *Raison :* voir EVA-2, où l'absence de cette garde casse la carte. | `fonctionnel` |  à auditer |
| NOT-10 | **Exigence.** Aucune note : mention d'absence, le sélecteur de période restant visible. *Raison :* sans le sélecteur, l'utilisateur ne peut pas découvrir qu'une autre période contient des notes. | `fonctionnel` |  à auditer |

## 4.2 Moyennes

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| MOY-1 | **Exigence.** L'agrégation de plusieurs périodes est **refusée** pour les moyennes. *Raison :* additionner ou moyenner des moyennes de trimestres n'a aucun sens arithmétique sans les coefficients, et rien ne publie de moyenne annuelle — un tel calcul **inventerait un chiffre**. Si un onglet « toutes périodes » existe, il juxtapose sans calculer. | `catalogue` |  à auditer |
| MOY-2 | **Exigence.** La moyenne générale et la moyenne de classe sont lues sur leurs **entités dédiées**, résolues par TRV-1. *Raison :* l'ancienne fabrique le nom de l'entité par concaténation d'un préfixe déduit et d'un suffixe de période ; si le nom construit n'existe pas, la ligne disparaît sans avertissement, indiscernable d'une absence de donnée. | `catalogue` |  à auditer |
| MOY-3 | **Exigence.** Une valeur d'état est traitée comme une valeur d'état. *Raison :* c'est le **seul endroit de tout l'ancien dépôt qui lit un état, et il est faux** — la chaîne y est traitée comme un objet dont on demande le barème, ce qui lève une exception et vide la carte dès qu'un seuil de ratio est configuré. Le chemin n'étant atteint qu'avec cette option, le défaut a survécu. | `fonctionnel` |  à auditer |
| MOY-4 | **Exigence.** Les moyennes par matière sont indexées par l'**identifiant de matière** publié, jamais par leur rang dans la liste. *Raison :* le catalogue le précise explicitement ; un index de position change dès qu'une matière apparaît ou disparaît, et associe alors la moyenne à la mauvaise matière. | `catalogue` |  à auditer |
| MOY-5 | **Exigence.** Les bornes de classe sont affichables séparément de la moyenne de classe. | `fonctionnel` |  à auditer |
| MOY-6 | **Exigence.** Le bulletin, s'il est exploité, est distingué des moyennes par matière. *Raison :* deux familles distinctes dans le catalogue, l'une pouvant être vide quand l'autre est garnie. Aucune carte d'origine ne couvrait le bulletin. | `catalogue` |  à auditer |

## 4.3 Périodes

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| PER-1 | **Exigence.** La liste des périodes et la désignation de la période courante sont lues sur les **entités dédiées** — l'une portant le nombre de périodes et la liste, l'autre le nom de la période en cours. Aucun nom d'entité n'est reconstruit. *Raison :* c'est le mécanisme d'origine le plus fragile, supprimé en totalité : découpage de l'identifiant reçu pour en déduire un préfixe, puis concaténation d'un suffixe de période. | `catalogue` |  à auditer |
| PER-2 | **Exigence.** La carte tolère une période courante **indisponible**. *Raison :* le module la rend délibérément indisponible plutôt que de désigner la mauvaise quand elle est indéterminable, ce qui arrive pendant les vacances entre deux trimestres. Une valeur par défaut « période courante » doit donc avoir un repli. | `catalogue` |  à auditer |
| PER-3 | **Exigence.** Les périodes closes sont atteintes comme des **entités sœurs réelles**, désignées explicitement dans la configuration de la carte. *Raison :* la période est une dimension d'identité d'entité, non une tranche d'un attribut. Le sélecteur d'onglets de l'ancienne carte survit, mais il choisit entre entités et plus jamais par reconstruction de nom. *Note :* les périodes closes ne sont relues qu'une fois par jour, ce qui rend tout affichage de fraîcheur trompeur si la carte ne le distingue pas. | `catalogue` |  à auditer |

---

# 5. Évaluations

Carte cible `pronote-ng-evaluations`.

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| EVA-1 | **Exigence.** La carte n'accède à aucune autre famille de données que la sienne. *Raison :* défaut critique de l'ancienne carte, qui fabrique le nom du capteur d'emploi du temps par **substitution de sous-chaîne dans son propre identifiant** pour y emprunter les couleurs de matière, puis lit ses attributs sans vérifier que l'entité existe. Un utilisateur sans ce capteur obtient une carte qui ne rend rien — un couplage inter-familles pour un usage purement décoratif. | `fonctionnel` |  à auditer |
| EVA-2 | **Exigence.** Un plafond d'éléments supérieur au nombre d'éléments disponibles n'est pas une erreur. *Raison :* l'ancienne itère jusqu'au plafond configuré sans vérifier les bornes, puis déréférence les acquisitions d'un élément inexistant : un plafond de dix avec trois évaluations **casse la carte**. La carte Notes possède exactement la garde qui manque ici. | `fonctionnel` |  à auditer |
| EVA-3 | **Exigence.** Chaque acquisition est représentée, et le détail par acquisition est consultable. | `fonctionnel` |  à auditer |
| EVA-4 | **Exigence.** Le **niveau** d'acquisition publié est exploité, en plus de son abréviation. *Raison :* fait publié qu'aucune règle d'origine ne couvre — l'ancienne carte ne dispose que de l'abréviation et doit la remapper à la main pour en déduire un niveau. Le niveau étant publié, le remappage devient facultatif. | `catalogue` |  à auditer |
| EVA-5 | **Exigence.** Le **domaine** d'acquisition publié est exploitable pour regrouper les acquisitions d'une évaluation. *Raison :* fait publié sans équivalent d'origine ; il donne la structure d'un référentiel de compétences que l'ancienne carte rendait à plat. | `catalogue` |  à auditer |
| EVA-6 | **Exigence.** Si une table de correspondance des abréviations est offerte, elle est éditable depuis l'éditeur graphique. *Raison :* c'est la **seule option de tout l'ancien dépôt absente de l'éditeur**, le cadre n'ayant pas de champ pour une structure ; un utilisateur passé par l'interface ne peut pas la découvrir. Le niveau publié (EVA-4) peut rendre cette table inutile. | `fonctionnel` |  à auditer |
| EVA-7 | **Exigence.** Les codes d'acquisition non reconnus restent lisibles. *Raison :* l'ancienne n'attribue un glyphe qu'à deux codes remappés et laisse les autres sans texte, ne portant plus que la couleur — information perdue si la couleur ne s'applique pas. | `fonctionnel` |  à auditer |
| EVA-8 | **Exigence.** Enseignant, intitulé, énoncé, date et coefficient sont individuellement masquables, et le coefficient est omis lorsqu'il est absent. | `fonctionnel` |  à auditer |
| EVA-9 | **Exigence.** Aucune évaluation : mention d'absence, sélecteur de période conservé. | `fonctionnel` |  à auditer |

---

# 6. Cantine

Carte cible `pronote-ng-menu`. **La famille n'est pas modélisée comme les autres et le périmètre de l'ancienne carte n'existe pas dans la cible.** Les deux points sont à lire avant toute exigence.

## 6.1 Contrat, et pourquoi il change tout

Il n'y a **pas de tableau d'éléments**. Deux entités — menu du jour, menu du lendemain — portent huit attributs plats, toujours les mêmes :

| Clé | Type |
| --- | --- |
| `first_meal`, `main_meal`, `side_meal`, `other_meal`, `cheese`, `dessert` | six tableaux de chaînes |
| `is_lunch` | booléen **nullable** |
| `published` | booléen |

L'état porte le **nombre total de plats**, et vaut **inconnu** quand rien n'est publié — jamais zéro, parce que zéro plat affirmerait qu'un menu existe.

La forme est constante par conception, et la raison vaut d'être citée parce qu'elle est l'argument de toute cette section : un jeu d'attributs qui apparaît et disparaît est inutilisable depuis une carte, un lecteur d'attribut obtenant la même absence quand la cantine ne publie rien et quand le palier de collecte n'a jamais tourné — deux situations qui disent des choses très différentes à un parent.

## 6.2 Exigences

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| CAN-1 | **Exigence.** Les trois situations sont distinguées et formulées différemment : *pas encore collecté* — aucun attribut ; *rien de publié* — état inconnu, six listes présentes et vides, drapeau de publication à faux ; *menu publié* — état égal au nombre de plats. *Raison :* mesuré, **le drapeau de publication est le seul élément qui les distingue**, les six listes étant vides dans les deux premiers cas. Tester seulement les listes est insuffisant. L'ancienne carte rend un en-tête nu dans les trois cas. | `mesuré` | **couvert** — vérifié en direct, les trois |
| CAN-2 | **Exigence.** Le drapeau « s'agit-il du déjeuner » est **affiché** et conserve ses trois valeurs, sans être écrasé en booléen. *Raison :* mesuré, il vaut **nul** et non faux — « on ne sait pas s'il s'agit du déjeuner » n'est pas « ce n'est pas le déjeuner ». Le module ne devine pas un service pour un repas qui n'existe pas. | `mesuré` | **manquant** — champ publié, non lu |
| CAN-3 | **Exigence.** Les six services sont rendus dans un ordre stable, chacun seulement s'il contient au moins un plat. *Raison :* l'ancienne carte écrit **cinq** intitulés en dur et ignore donc entièrement le sixième — le plat complémentaire. Un service vide rendu avec son titre laisse croire à une donnée manquante. | `catalogue` | **couvert** — six services, ordre fixe, vide sauté |
| CAN-4 | **Exigence.** Les plats d'un même service sont distinguables les uns des autres. | `fonctionnel` | **couvert** — séparateur explicite |
| CAN-5 | **Exigence suspendue.** Les régimes et libellés par plat ne sont pas spécifiés en l'état. *Raison :* les six services sont des **tableaux de chaînes** et aucun champ de régime n'apparaît dans les données mesurées. L'ancienne fonctionnalité n'est donc pas portable — mais son absence a des conséquences hors écran, allergies et régimes, ce qui justifie de la signaler comme un manque plutôt que de la taire. *À lever :* l'intégration décode-t-elle un tel champ sans le publier, comme pour la couleur de matière ? Si oui, c'est une troisième demande de développement. | `catalogue` | **invérifiable** — champ absent des données |
| CAN-6 | **Exigence.** Le choix de la journée présentée **existe réellement et est réversible**. *Raison :* l'ancienne carte pose sans condition la classe qui masque toutes les journées sauf une, et lit une option d'activation déclarée nulle part : elle est figée en mode navigation, sans échappatoire. | `fonctionnel` | **couvert autrement** — option jour/lendemain, réversible ; forme différente, besoin tenu |
| CAN-7 | **Exigence.** Un passage automatique au lendemain, s'il existe, ne dépend d'aucune heure écrite en dur et ne peut désigner une journée inexistante. *Raison :* l'ancienne fixe une bascule à quatorze heures locales — seule heure en dur du dépôt — et désigne un index hors borne après le dernier jour publié, ce qui vide la carte. | `fonctionnel` | **manquant** — aucun passage automatique |
| CAN-8 | **Exigence.** Aucun plafond de journées ni restriction de semaine n'est offert. *Raison :* voir CAN-10 — la cible ne publie pas de menu au-delà du lendemain, ces options n'ont donc pas d'objet. | `catalogue` | **écarté** — sans objet |
| CAN-9 | **Exigence.** Aucun indicateur de dîner n'est affiché. *Raison :* le champ existe dans le modèle amont et **n'est pas publié** ; l'inférer du seul drapeau de déjeuner reviendrait à traiter son absence de valeur comme une négation, ce que CAN-2 interdit. | `catalogue` | à auditer |
| CAN-10 | **Exigence.** Le périmètre de la carte est de **deux journées au plus** — aujourd'hui et demain. *Raison :* la cible ne publie pas de menu au-delà du lendemain. Quatre options de l'ancienne carte perdent leur objet : elles ne sont pas à réécrire, elles sont à **supprimer**. C'est la famille où l'écart de périmètre entre les deux formats est le plus large. | `catalogue` | à auditer |

---

# 7. Vie scolaire

Carte cible `pronote-ng-vie-scolaire`, fusion des cartes Absences et Retards. **Les deux natures ne sont pas symétriques dans la cible non plus** : ne pas lisser leurs différences.

## 7.1 Contrats d'élément

| Absence | Type | | Retard | Type |
| --- | --- | --- | --- | --- |
| `id` | chaîne | | `id` | chaîne |
| `from_date` | horodatage | | `date` | horodatage |
| `to_date` | horodatage | | `minutes` | **entier** |
| `hours` | **chaîne** nullable | | `justified` | booléen |
| `days` | entier | | `justification` | chaîne nullable |
| `justified` | booléen | | `reasons` | tableau de chaînes |
| `reasons` | tableau de chaînes | | | |

Deux asymétries à conserver : la durée d'un retard **est** un nombre là où le volume d'une absence est du texte, et le retard porte une justification textuelle distincte de ses motifs, que l'absence n'a pas.

## 7.2 Exigences

| Réf | Exigence | Prov. | Parité |
| --- | --- | --- | --- |
| VIE-1 | **Exigence.** Le motif est lu sous son nom **pluriel** et traité comme un **tableau de chaînes**, sur les deux natures. *Raison :* vérifié dans les constructeurs. L'ancienne carte Absences lit un nom au singulier et **affiche donc un motif vide depuis toujours**, sans que rien ne le signale — le défaut le plus silencieux de l'ancien dépôt. | `catalogue` |  **couvert** — pluriel, liste, sur les deux natures |
| VIE-2 | **Exigence.** La justification se lit sur son **drapeau**, jamais en cherchant un mot dans les motifs. *Raison :* mesuré, une absence porte un motif « sans certificat » **et** le drapeau justifié à vrai. Ce n'est pas une incohérence : les motifs sont ce que la famille a fourni, le drapeau ce que l'établissement a décidé. Une condition textuelle conclurait ici l'exact contraire de la vérité, et masquer l'un au nom de l'autre effacerait la plus intéressante des deux informations. Le catalogue le dit dans les deux sens : une absence peut porter un motif sans être justifiée, ou l'inverse. | `mesuré` |  **couvert** — drapeau propre, aucune recherche textuelle |
| VIE-3 | **Exigence.** Le volume d'une absence n'est ni calculé, ni converti, ni sommé. *Raison :* c'est une **chaîne** rédigée par l'établissement ; un consommateur qui l'a multipliée a affiché un résultat non numérique. Le décompte de journées, lui, est un entier et se somme. La seule durée calculable est l'écart entre les deux horodatages. Voir DEM-1. | `catalogue` |  **couvert** — chaîne rendue telle quelle, compteurs pris sur l'état |
| VIE-4 | **Exigence.** Toute durée affichée nomme son unité d'après la donnée, jamais depuis le gabarit. *Raison :* les deux anciennes cartes écrivent l'unité en français dans le gabarit, à côté d'un nombre dont elles ignorent l'unité réelle. *Limite relevée à l'audit :* les attributs ne portent pas d'unité déclarée, seuls les états en portent — pour une valeur d'élément, le nom du champ reste le seul signal. Voir TRV-5. | `catalogue` | **couvert avec réserve** — unité déduite du nom de champ, faute d'unité déclarée sur les attributs |
| VIE-5 | **Exigence.** Une date invalide ou absente ne produit **aucun texte technique**. *Raison :* les deux anciennes cartes protègent leur formatage par un test toujours vrai — un objet date invalide reste un objet — et affichent en clair la mention d'erreur du moteur, dans la langue du navigateur. | `fonctionnel` |  **couvert** |
| VIE-6 | **Exigence.** La nature de l'élément est lisible dans la carte fusionnée. *Raison :* conséquence de la fusion ; sans marque de nature, deux listes concaténées deviennent indistinctes, d'autant que leurs champs diffèrent. | `décision` |  **couvert** — intertitres par nature |
| VIE-7 | **Constat.** La fusion **supprime** l'incohérence de nommage entre les deux cartes jumelles au lieu de la porter : une carte unique n'a qu'un seul chemin de lecture des motifs. Aucune exigence n'en découle. | `mesuré` |  à auditer |
| VIE-8 | **Exigence.** Le statut de justification est signalé autrement que par la seule couleur. *Raison :* les anciennes cartes le portent par une icône **et** une couleur en dur ; TRV-4 supprime la seconde. | `fonctionnel` |  **couvert** — le mot porte l'information, la teinte renforce |
| VIE-9 | **Exigence.** Aucun élément : mention positive. *Raison :* « aucune absence » est une bonne nouvelle, pas une donnée manquante ; les anciennes cartes ont raison sur ce point. | `fonctionnel` |  **couvert** — compteurs et bandeaux survivent au vide |
| VIE-10 | **Exigence.** Le compteur d'**absences non justifiées** est lu sur son entité dédiée. *Raison :* TRV-17. L'ancienne carte doit filtrer la liste entière pour obtenir ce nombre, alors que c'est précisément celui qui intéresse un parent. | `catalogue` |  à auditer |
| VIE-11 | **Exigence.** L'indicateur d'**absence en cours** est exploité. *Raison :* fait publié sans équivalent d'origine — l'ancienne carte ne peut pas dire qu'une absence est en train de se produire. | `catalogue` |  à auditer |
| VIE-12 | **Exigence.** Les punitions, si la carte les couvre, exploitent leur compteur, l'horodatage de la **prochaine punition** et l'indicateur de punition à venir. Le créneau d'une punition porte sa durée **par créneau** et non au niveau de la punition. *Raison :* famille entièrement absente de l'ancien inventaire ; sa structure de créneaux ne se déduit d'aucune règle de parité. | `catalogue` |  à auditer |
| VIE-13 | **Exigence.** Si la carte propose une vue calendaire des retenues, elle s'appuie sur l'entité d'agenda publiée. | `catalogue` | à auditer |
| VIE-14 | **Exigence.** La justification textuelle d'un retard est affichée, distinctement de ses motifs. *Raison :* champ publié sur le retard et absent de l'absence, qu'aucune règle d'origine ne couvre — l'ancienne carte Retards ne le lit pas. | `catalogue` | à auditer |

---

# 8. Ce qui n'est pas demandé

Consigné pour qu'aucune lecture de ce document ne conclue le contraire.

- **Aucune carte de fiche élève, aucun emploi du temps en PDF, aucune exposition de l'adresse iCal, du numéro INE ou des responsables légaux.** Voir TRV-15. Aucune des huit cartes d'origine n'en approche.
- **Aucun lien de téléchargement de pièce jointe.** Voir DEV-5 : la donnée n'existe pas.
- **Aucun nommage d'option de l'ancien format.** Les options d'origine sont citées comme fonctionnalités, pas comme contrat.
- **Aucun sélecteur CSS de l'ancien format.** Il porte de plus les couleurs en dur que TRV-4 proscrit.
- **Aucune exigence dépendant d'un identifiant interne.** Leur forme change à la prochaine version du module.
- **Aucune reconstitution d'historique depuis les événements.** Voir TRV-18 : rien n'est rejoué au démarrage.

# 9. Demandes de développement déposées

| Réf | Demande | Conséquence si non satisfaite |
| --- | --- | --- |
| DEM-1 | **Un volume d'absence dans un état, avec son unité.** L'état porte un compte d'absences sans unité ; le volume n'existe que comme chaîne d'établissement non sommable. « Combien d'heures ce trimestre » est une question ordinaire de parent, et elle n'est **pas reconstituable par un modèle**. L'analyse du texte est mieux placée dans l'intégration — un endroit, testable — que répétée dans chaque carte. | VIE-3 reste une exigence de non-calcul. Seul le décompte de journées est sommable. |
| DEM-2 | **La couleur de matière dans un attribut.** Décodée dans quatre objets de transfert, exposée nulle part, et explicitement exclue de la comparaison de changements — donc connue et volontairement retenue. Même situation pour l'identifiant de matière, les **groupes**, les classes virtuelles, le numéro, le lieu et la durée. Donnée déjà en mémoire : l'exposer ne place aucune requête. | EDT-D2 reste bloquée, et EDT-D1 reste sans l'information de groupe qui l'expliquerait. |

# 10. Points clos

Traçabilité des points qui ont changé pendant la rédaction. Conservés parce qu'une contrainte dont on a oublié l'histoire finit par être rétablie à tort.

| Réf | Point | Résolution |
| --- | --- | --- |
| CLO-1 | **Sens du drapeau de fin de créneau.** A changé trois fois en deux heures : provenance seule, puis deux causes — affirmation de pair non vérifiée en source, et fausse —, puis un correctif amont qui rend les deux causes vraies. **État final :** le drapeau répond désormais à « puis-je faire confiance à cette heure de fin ? » et non à « d'où vient-elle ? ». À faux, l'heure est celle du serveur, telle quelle. Une garantie, plus une indétermination. *Le fait que ce point ait bougé est ce qui a permis de repérer quelle version chaque document portait.* | clos par correctif amont |
| CLO-2 | **Nom du champ de motif en vie scolaire.** Hypothèse d'une incohérence entre les deux anciennes cartes, confirmée : le nom est au pluriel et c'est un tableau, sur les deux natures. L'ancienne carte Absences lit un singulier. | confirmé |
| CLO-3 | **Écriture des devoirs.** Annoncée comme disponible sur la foi d'une lecture optimiste, puis mesurée absente : masque de fonctionnalités à zéro. DEV-10 est devenue conditionnelle. | mesuré |
| CLO-4 | **Couleur de matière.** Annoncée « absente », puis précisée « décodée mais non publiée ». La nuance change la décision : demander la publication d'un champ existant, non inventer une palette. | précisé |
| CLO-5 | **La restriction à la semaine courante.** Interrogée comme indétermination, tranchée à l'audit : la carte cible n'offre aucune option de ce genre, le capteur hebdomadaire bornant déjà la plage, et refaire un calcul de semaine par-dessus ajouterait une seconde source de vérité. EDT-12 est donc `écarté` et non `manquant`. | tranché à l'audit |

# 11. Indéterminations

| Réf | Indétermination | Qui peut lever |
| --- | --- | --- |
| IND-3 | **Notes, moyennes, évaluations et bulletin ne sont pas observables** sur l'instance de référence : vides ou inconnues, le trimestre venant de commencer. Les exigences des sections 4 et 5 sont établies par le catalogue et par lecture du code d'origine, non par mesure. | mesure ultérieure |
| IND-4 | **Une seule instance, une seule semaine** sous-tend toutes les mentions `mesuré`. Les types sont fiables ; les fréquences observées ne sont pas des statistiques. | mesure élargie |
| IND-5 | **Deux défauts d'origine restent non observés** : la carte Emploi du temps qui se vide après la fin du dernier jour en mode navigation, et le week-end qui n'affiche qu'un en-tête. L'ancien module n'est installé sur aucune instance accessible — vérifié, pas supposé. Marqués « déduit du code, non observé ». | néant |
| IND-6 | **Aucune de ces exigences n'est couverte par un test.** L'ancien dépôt n'en a aucun, et sa commande de vérification ne couvre par erreur de motif que son fichier d'entrée, lequel ne contient que des imports — ce qui explique la survie de code mort, d'une option non déclarée et d'une méthode définie deux fois. Les règles de parité sont établies par lecture, pas par exécution. | néant |
| IND-7 | **Le périmètre des familles nouvelles n'est pas arbitré.** Actualités, messagerie, équipe pédagogique et diagnostics du limiteur sont publiés et ne relèvent d'aucune carte d'origine. Ce document ne les spécifie pas ; il signale seulement qu'ils existent. | cartes |
