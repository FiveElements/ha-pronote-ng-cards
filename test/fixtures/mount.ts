/**
 * Aide de montage partagée par tous les tests de carte et d'éditeur.
 *
 * Chaque fichier de test augmente `HTMLElementTagNameMap` avec son propre
 * nom de balise et l'interface de son élément personnalisé (setConfig,
 * hass, `updateComplete`, éventuellement `spec`…). Cela suffit à
 * `document.createElement` pour rendre le bon type sans aucune conversion
 * côté appelant : la seule conversion nécessaire (le pont générique entre
 * `HTMLElementTagNameMap[K]` et ce que `mountCard` doit pouvoir manipuler)
 * est ici, une fois, plutôt que dupliquée dans chaque fichier de test de
 * carte.
 */
export interface MountableElement {
  setConfig(config: unknown): void;
  hass: unknown;
  readonly updateComplete: Promise<unknown>;
}

export async function mountCard<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  config: Record<string, unknown>,
  hass: unknown,
  extra?: Record<string, unknown>
): Promise<HTMLElementTagNameMap[K] & MountableElement> {
  const created = document.createElement(tagName);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- chaque appelant augmente HTMLElementTagNameMap pour son propre tagName ; ce contrat (setConfig, hass, updateComplete) est garanti par construction pour toute carte ou éditeur du projet, mais TypeScript ne peut pas le vérifier génériquement à travers K.
  const el = created as HTMLElementTagNameMap[K] & MountableElement;
  if (extra) Object.assign(el, extra);
  el.setConfig({ type: `custom:${tagName}`, ...config });
  el.hass = hass;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

export const text = (el: HTMLElement): string => el.shadowRoot?.textContent ?? '';
