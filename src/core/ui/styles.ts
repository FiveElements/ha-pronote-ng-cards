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
`;
