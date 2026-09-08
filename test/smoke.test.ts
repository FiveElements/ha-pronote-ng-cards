import { describe, expect, it } from 'vitest';
import { html, render } from 'lit';

describe('chaîne de construction', () => {
  it('rend un gabarit Lit dans happy-dom', () => {
    const host = document.createElement('div');
    render(html`<p>bonjour</p>`, host);
    expect(host.textContent).toBe('bonjour');
  });
});
