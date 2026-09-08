import { makeCardClass } from './base-card';
import { PronoteCardEditor } from './editor';
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

const DOCS = 'https://fiveelements.github.io/ha-pronote-ng-cards/';

export function defineCard(spec: CardSpec): void {
  if (!customElements.get('pronote-ng-card-editor')) {
    customElements.define('pronote-ng-card-editor', PronoteCardEditor);
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
