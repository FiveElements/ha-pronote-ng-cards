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
