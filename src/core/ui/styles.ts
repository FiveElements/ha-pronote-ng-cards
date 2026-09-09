import { css } from 'lit';

export const sharedStyles = css`
  :host {
    display: block;
  }
  ha-card {
    padding: 0;
    overflow: hidden;
  }
  .body {
    padding: 12px 16px 16px;
  }
  .title {
    font-size: var(--ha-card-header-font-size, 24px);
    font-weight: 400;
    padding: 12px 16px 8px;
    color: var(--ha-card-header-color, var(--primary-text-color));
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--divider-color);
  }
  .row:last-child {
    border-bottom: none;
  }
  .row .primary {
    font-weight: 500;
    color: var(--primary-text-color);
  }
  .row .secondary {
    color: var(--secondary-text-color);
    font-size: 0.9em;
    /* Les énoncés de devoirs comptent plusieurs lignes : sans ceci, les
       retours posés par plainText() se replient en espaces et deux phrases
       se collent. */
    white-space: pre-line;
  }
  .row .trailing {
    margin-left: auto;
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }
  .notice {
    color: var(--secondary-text-color);
    font-style: italic;
    padding: 8px 0;
  }
  .notice.problem {
    color: var(--error-color);
    font-style: normal;
  }
  .notice code {
    font-style: normal;
    background: var(--secondary-background-color);
    border-radius: 4px;
    padding: 0 4px;
  }
  .chip {
    display: inline-block;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 0.8em;
    background: var(--secondary-background-color);
    color: var(--secondary-text-color);
  }
  .chip.warn {
    background: var(--warning-color);
    color: var(--text-primary-color);
  }
  .chip.problem {
    background: var(--error-color);
    color: var(--text-primary-color);
  }
  .chip.ok {
    background: var(--success-color, var(--state-icon-active-color));
    color: var(--text-primary-color);
  }
  .canceled {
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* Le code couleur des matières, tel que l'établissement l'a choisi.
     Posé en variable par la ligne elle-même (voir RowOptions.accent), et
     seulement sur les listes qui portent une matière : les autres cartes ne
     réservent pas la gouttière et gardent leur alignement d'origine.

     Un ACCENT, jamais un fond ni une couleur de texte. Les couleurs PRONOTE
     sont choisies pour le fond blanc de l'interface officielle : en aplat
     derrière du texte, elles cassent le contraste dès qu'un thème sombre est
     actif, et le thème de l'utilisateur ne peut plus rien y faire. En bordure,
     le pire cas est un accent peu visible — on perd un rappel, jamais la
     lisibilité de la ligne.

     Le repli transparent fait le travail des lignes sans couleur : la
     gouttière est réservée, donc rien ne se décale.

     (Aucun guillemet oblique dans ce fichier, y compris en commentaire : tout
     est à l'intérieur d'un gabarit de patron, qu'un guillemet oblique
     fermerait au milieu de la feuille de styles. La compilation échoue alors
     sur une erreur de syntaxe JavaScript à des dizaines de lignes de là.) */
  .row.accented {
    border-left: 3px solid var(--pronote-subject-color, transparent);
    padding-left: 6px;
  }

  /* Le filet de matière en SEPARATEUR, entre l'intitulé et le contenu de la
     ligne. C'est le placement des devoirs : la couleur ne borde pas la ligne,
     elle coupe la matière de ce qu'il y a à faire.

     Deux propriétés portent tout le comportement. Le align-self surcharge le
     align-items: baseline de la ligne, sans quoi le filet se cale sur la
     ligne de base du texte et ne mesure que sa propre hauteur au lieu de
     celle de la ligne. Et le flex à zero-zero-auto l'empêche de se laisser
     comprimer par un enonce long, qui le réduirait à un cheveu.

     Pas de repli transparent ici, contrairement a la gouttière, et c'est
     voulu : la mise en page est un flux et non une grille a colonnes fixes,
     donc une ligne sans couleur ne décale rien. Un filet gris de repli
     affirmerait au contraire que la matière a une couleur, et qu'elle est
     grise. */
  .filet-matiere {
    align-self: stretch;
    flex: 0 0 auto;
    width: 4px;
    border-radius: 2px;
    background: var(--pronote-subject-color);
  }

  /* La photo de l'élève. La carte qui l'affiche la laisse désactivée par
     défaut : une photo d'enfant sur un tableau de bord se retrouve dans une
     capture d'écran ou un partage de vue. */
  .photo {
    width: 64px;
    height: 64px;
    flex: 0 0 auto;
    border-radius: 50%;
    object-fit: cover;
  }

  /* Le seul bouton du projet — celui qui demande un relèvement de priorité au
     limiteur. Sans ces règles il s'affichait avec le chrome natif du
     navigateur : gris clair sur un thème sombre, et aucun état de focus
     visible au clavier. */
  button {
    font: inherit;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background: var(--primary-color);
    color: var(--text-primary-color);
    cursor: pointer;
  }
  button:disabled {
    background: var(--disabled-text-color);
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid var(--accent-color, var(--primary-color));
    outline-offset: 2px;
  }

  /* ---- La vue journée -------------------------------------------------
     Une grille à trois colonnes : les horaires, le filet de couleur, le
     corps. La colonne d'horaires est de largeur fixe pour que tous les
     filets s'alignent verticalement, ce qui est ce qui fait lire la journée
     comme une journée et non comme une liste. */
  .jour {
    display: flex;
    flex-direction: column;
  }
  /* L'en-tete : la date a gauche, les bornes de la journee a droite. Les
     bornes sont en chiffres tabulaires pour qu'elles ne dansent pas quand
     l'heure change. */
  .jour-entete {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 8px;
    margin-bottom: 4px;
    border-bottom: 1px solid var(--divider-color);
  }
  /* Les fleches de navigation. Volontairement discretes : ce ne sont pas des
     actions, ce sont des deplacements du regard, et elles ne coutent aucune
     requete -- toute la semaine est deja dans un attribut. Le seul bouton
     plein du projet est celui du limiteur, qui touche lui au budget de
     collecte : la difference d'apparence porte cette difference de nature.

     Des boutons et non des liens : au bord de la fenetre collectee, une
     fleche n'a plus de destination, et seul un bouton sait le dire -- a la
     souris comme au lecteur d'ecran. */
  .jour-nav {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .jour-fleche {
    background: none;
    color: var(--secondary-text-color);
    padding: 0 6px;
    font-size: 1.4em;
    line-height: 1;
    border-radius: 4px;
  }
  .jour-fleche:hover:not(:disabled) {
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
  }
  /* Prime sur button:disabled, qui peint un fond gris : une fleche eteinte
     doit s'effacer, pas s'afficher en pave. */
  .jour-fleche:disabled {
    background: none;
    color: var(--disabled-text-color);
  }
  .jour-retour {
    background: none;
    color: var(--primary-color);
    padding: 2px 6px;
    font-size: 0.85em;
    border-radius: 4px;
  }
  .jour-retour:hover {
    background: var(--secondary-background-color);
  }
  .jour-date {
    font-weight: 500;
    color: var(--primary-text-color);
    text-transform: capitalize;
  }
  .jour-bornes {
    color: var(--secondary-text-color);
    font-variant-numeric: tabular-nums;
  }
  /* La matiere et ses pastilles sur une ligne, le detail dessous. Un nom de
     professeur fait facilement trente caracteres : sur la largeur d'une
     colonne de section, mis a la suite de la matiere, il repoussait les
     pastilles hors du champ visible. */
  .jour-tete {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
  }
  .jour-detail {
    color: var(--secondary-text-color);
    font-size: 0.9em;
    width: 100%;
  }
  .jour-ligne {
    display: grid;
    /* Deux chiffres, deux points, deux chiffres, plus le marqueur de fin
       déduite : 4,5em tient « ≈08:00 » sans que la police du thème puisse
       le tronquer. */
    grid-template-columns: 4.5em 4px 1fr;
    gap: 10px;
    align-items: stretch;
    padding: 8px 0;
    border-bottom: 1px solid var(--divider-color);
  }
  .jour-ligne:last-child {
    border-bottom: none;
  }
  .jour-heures {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: var(--secondary-text-color);
    font-size: 0.9em;
    font-variant-numeric: tabular-nums;
    line-height: 1.35;
  }
  /* Le filet. Sa couleur vient du serveur ou de la table de l'utilisateur,
     posée en style en ligne ; le repli neutre est une variable de thème,
     jamais une couleur écrite ici. Un ACCENT et non un aplat : il situe et
     décore, il ne porte aucune information à lui seul — les horaires,
     l'intitulé et les pastilles informent. */
  .jour-filet {
    border-radius: 2px;
    background: var(--divider-color);
  }
  .jour-filet-neutre {
    background: var(--divider-color);
  }
  .jour-corps {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 8px;
    min-width: 0;
  }
  .jour-matiere {
    font-weight: 500;
    color: var(--primary-text-color);
  }
  .jour-salle {
    color: var(--secondary-text-color);
    font-size: 0.9em;
  }
  .jour-pastilles {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-left: auto;
  }
  /* Le cours en cours. Un fond très léger dérivé de la couleur d'accent du
     thème, pas une couleur propre : la mise en avant doit survivre à un
     thème sombre comme à un thème clair. */
  .jour-courant {
    background: var(--secondary-background-color);
    border-radius: 6px;
  }
  /* La zone repas. Volontairement discrète et en italique : ce n'est pas un
     cours, et le libellé est une convention de l'utilisateur — pas une
     affirmation du module sur ce que fait l'élève à cette heure-là. */
  .jour-repas .jour-matiere {
    font-weight: 400;
    font-style: italic;
    color: var(--secondary-text-color);
  }
  .jour-repas .jour-filet {
    background: repeating-linear-gradient(
      to bottom,
      var(--divider-color) 0 4px,
      transparent 4px 8px
    );
  }

  /* Photo et lignes d'identité côte à côte. Un flux flex plutôt qu'un
     flottement, qui se comporte mal dès qu'une ligne est plus haute que la
     photo. */
  .ident {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .ident-body {
    flex: 1 1 auto;
    min-width: 0;
  }
`;
