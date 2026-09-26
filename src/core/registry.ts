import { makeCardClass } from './base-card';
import { CarnetCardEditor } from './editor';
import type { CardSpec } from './types';

interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
  }
}

const DOCS = 'https://fiveelements.github.io/ha-carnet-scolaire-cards/';

export function defineCard(spec: CardSpec): void {
  if (!customElements.get('carnet-scolaire-card-editor')) {
    customElements.define('carnet-scolaire-card-editor', CarnetCardEditor);
  }
  if (!customElements.get(spec.type)) {
    customElements.define(spec.type, makeCardClass(spec));
  }
  window.customCards = window.customCards ?? [];
  if (!window.customCards.some((c) => c.type === spec.type)) {
    window.customCards.push({
      type: spec.type,
      name: spec.name,
      description: spec.description,
      preview: true,
      documentationURL: DOCS,
    });
  }
}
