import { describe, expect, it } from 'vitest';
import { LitElement, html } from 'lit';
import { property } from 'lit/decorators.js';

/**
 * Ce test ne vérifie pas que la classe s'instancie : il vérifie que le
 * décorateur `@property` rend bien la propriété RÉACTIVE, c'est-à-dire que
 * modifier sa valeur après le montage déclenche un nouveau rendu.
 *
 * C'est précisément le comportement qui peut se perdre silencieusement si
 * `experimentalDecorators` cesse de fonctionner correctement (ou change de
 * sémantique) sous TypeScript 7 : la compilation resterait propre, mais les
 * cartes s'afficheraient figées après leur premier rendu.
 */
class DecoratorProbeElement extends LitElement {
  @property({ type: String })
  label = 'initial';

  override render() {
    return html`<span>${this.label}</span>`;
  }
}
customElements.define('decorator-probe-element', DecoratorProbeElement);

describe('réactivité des décorateurs Lit', () => {
  it('met à jour le rendu quand une propriété décorée change après le montage', async () => {
    const host = document.createElement('decorator-probe-element') as DecoratorProbeElement;
    document.body.appendChild(host);

    await host.updateComplete;
    expect(host.shadowRoot?.querySelector('span')?.textContent).toBe('initial');

    host.label = 'mise à jour';
    await host.updateComplete;

    expect(host.shadowRoot?.querySelector('span')?.textContent).toBe('mise à jour');

    host.remove();
  });
});
