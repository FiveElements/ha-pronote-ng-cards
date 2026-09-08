# Cartes Lovelace Pronote NG — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer huit cartes Lovelace pour l'intégration `pronote_ng`, distribuées par HACS, qui remplacent les cartes `markdown` + Jinja aujourd'hui nécessaires — sans jamais coder d'identifiant d'entité en dur.

**Architecture:** Un socle partagé (`src/core/`) résout les entités depuis un `device_id` d'enfant par `translation_key` qualifié par domaine, et impose la discipline des trois états (absente / indisponible / vide). Chaque carte est un fichier déclarant un `CardSpec` : ses clés requises, son schéma d'éditeur, son `render()`. Un seul *bundle* ES, huit `customElements.define`, un éditeur générique unique.

**Tech Stack:** TypeScript 5, Lit 3, Vite (mode bibliothèque), Vitest + happy-dom, ESLint + Prettier, Node 22+, GitHub Actions, MkDocs Material.

**Spec:** `docs/superpowers/specs/2026-09-08-cartes-pronote-ng-design.md` — à lire avant la tâche 1 et à relire avant chaque tâche de carte.

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches. Elles ne sont pas répétées dans chacune.

- **Aucun identifiant d'entité en dur** dans `src/`. Aucune chaîne de la forme `sensor.<quelque chose>`, `binary_sensor.<…>`, `calendar.<…>`, `todo.<…>`, `button.<…>`, `event.<…>`, `image.<…>`. La tâche 7 rend cette règle exécutable.
- **Aucune carte n'appelle** `pronote_ng.get_ical_url`, `pronote_ng.get_identity`, `pronote_ng.generate_timetable_pdf` ni `pronote_ng.get_rate_limit_status`. Ces noms ne doivent apparaître ni dans `src/` ni dans `docs/`. Seul `pronote_ng.refresh` est appelable, et seulement sur action explicite de l'utilisateur.
- **Aucune collecte au montage ou au rendu.** Une carte lit `hass.states`, rien d'autre.
- **La documentation ne mentionne jamais** l'activation du journaliseur `pronotepy`. Le seul journaliseur recommandable est `custom_components.pronote_ng`.
- **Aucune donnée réelle** — nom d'élève, nom d'établissement, identifiant, URL d'instance — dans le code, les tests, les fixtures, la documentation, les captures d'écran ou les messages de commit. Valeurs synthétiques imposées : `demo.example.invalid`, `<enfant>`, `sensor.<enfant>_prochain_cours`.
- **Toute la rédaction visible est en français** : libellés de cartes, messages d'erreur, README, documentation, descriptions d'options. Le code, les noms de symboles et les `translation_key` restent en anglais.
- **Clés d'entités toujours qualifiées** par leur domaine : `sensor:next_lesson`, `todo:homework`, `image:photo`. Un `translation_key` n'est unique qu'à l'intérieur d'un domaine.
- `homeassistant` minimal : **2026.8.0**. Node **22+**.
- **`npm audit` ne doit rapporter aucune vulnérabilité `critical` ni `high`.** Les versions de dépendances données ici sont celles publiées en septembre 2026 ; ne pas les rétrograder.
- **Zéro dépendance externe dans le *bundle*** hors Lit, qui est empaqueté : `rolldownOptions.external` reste vide. Home Assistant ne garantit pas d'*import map*.
- Messages de commit en français, préfixés `feat:` / `fix:` / `docs:` / `test:` / `chore:`, et terminés par la ligne `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## Structure des fichiers

| Fichier | Responsabilité |
| --- | --- |
| `src/core/ha-types.ts` | Types minimaux du frontend HA que nous consommons. Aucune dépendance npm sur `custom-card-helpers`. |
| `src/core/types.ts` | `EntityKey`, `PronoteCardConfig`, `CardSpec`, `RenderCtx`, `EntityStatus`. |
| `src/core/resolve.ts` | `device_id` → `entity_id`, par `translation_key` qualifié. Le cœur. |
| `src/core/format.ts` | Heure, relatif, note, durée, barème. Aucun accès à `hass`. |
| `src/core/base-card.ts` | `PronoteCardBase` : plomberie Lit, trois états, construction du `RenderCtx`. |
| `src/core/editor.ts` | Éditeur générique `ha-form` + diagnostic de résolution. |
| `src/core/registry.ts` | `defineCard(spec)` : `customElements.define` + `window.customCards`. |
| `src/core/ui/*.ts` | Primitives de rendu partagées, sans logique métier. |
| `src/localize/fr.json` | Toutes les chaînes visibles. |
| `src/cards/<nom>.ts` | Un `CardSpec` par fichier. |
| `src/index.ts` | Importe les huit cartes, appelle `defineCard` sur chacune. |
| `test/fixtures/hass.ts` | Constructeur de `hass` synthétique. Utilisé par tous les tests. |

---

### Task 1: Amorçage du dépôt

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `LICENSE`, `.nvmrc`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: les scripts npm `build`, `test`, `lint`, `typecheck`. Toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Créer `.gitignore`, `.nvmrc` et `LICENSE`**

`.gitignore` :

```gitignore
node_modules/
dist/
site/
coverage/
*.log
.DS_Store

# Atelier de l'exécution du plan (journal, briefs, rapports, paquets de revue).
.superpowers/
```

Ce fichier **existe déjà** dans le dépôt : il a été créé avant la tâche 1 parce que `git add -A` à l'étape 9 aurait sinon committé `.superpowers/`. Le vérifier, pas le réécrire.

`.nvmrc` :

```
22
```

`LICENSE` : la licence MIT, copiée depuis `../ha-pronote/LICENSE`, avec le même titulaire de droits. Ne pas réécrire le texte à la main.

- [ ] **Step 2: Créer `package.json`**

```json
{
  "name": "ha-pronote-ng-cards",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Cartes Lovelace pour l'intégration Home Assistant Pronote NG",
  "license": "MIT",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src test",
    "format": "prettier --write src test"
  },
  "dependencies": {
    "lit": "^3.3.3"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.10.0",
    "happy-dom": "^20.14.0",
    "prettier": "^3.9.6",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.70.0",
    "vite": "^8.2.2",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 3: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": false,
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "test"]
}
```

`useDefineForClassFields: false` et `experimentalDecorators: true` sont requis par les décorateurs de Lit 3 en TypeScript. Sans eux, `@property` ne réagit pas.

- [ ] **Step 4: Créer `vite.config.ts`**

**TypeScript est plafonné à la majeure 6 volontairement.** `typescript-eslint` 8.70.0 est sa dernière version stable et refuse explicitement TypeScript 7 (« typescript-eslint does not support TS 7.0 ») : `npm run lint` échoue. Ne pas monter TypeScript tant que `typescript-eslint` n'a pas de majeure compatible.

Importer `defineConfig` depuis **`vitest/config`** et non `vite` : c'est ce qui type la clé `test` pour l'éditeur et pour toute vérification qui couvrirait ce fichier. Noter que `vite.config.ts` n'est **pas** dans le `include` de `tsconfig.json`, donc `npm run typecheck` ne le couvre pas aujourd'hui — l'import reste néanmoins le bon, et le rendre correct maintenant évite un piège si le périmètre du typecheck s'élargit.

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'pronote-ng-cards.js',
    },
    rolldownOptions: { external: [] },
    target: 'es2021',
    minify: 'oxc',
    emptyOutDir: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
```

`external: []` est délibéré : Lit doit être empaqueté (contrainte globale). Vite 8 s'appuie sur Rolldown : la clé est `rolldownOptions`, `rollupOptions` est déprécié, et `minify: 'esbuild'` n'est plus disponible par défaut — `'oxc'` le remplace.

- [ ] **Step 5: Créer `eslint.config.js` et `.prettierrc`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/', 'site/', 'node_modules/'] }
);
```

```json
{ "singleQuote": true, "printWidth": 100, "trailingComma": "es5" }
```

- [ ] **Step 6: Écrire le test de fumée**

`test/smoke.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { html, render } from 'lit';

describe('chaîne de construction', () => {
  it('rend un gabarit Lit dans happy-dom', () => {
    const host = document.createElement('div');
    render(html`<p>bonjour</p>`, host);
    expect(host.textContent).toBe('bonjour');
  });
});
```

- [ ] **Step 7: Installer et vérifier**

Run: `npm install && npm run lint && npm run typecheck && npm test`
Expected: les trois passent, `1 passed` pour les tests.

- [ ] **Step 8: Vérifier que le *bundle* se construit**

Créer `src/index.ts` provisoire avec `export {};`, puis Run: `npm run build`
Expected: `dist/pronote-ng-cards.js` existe.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: amorçage — TypeScript, Lit, Vite, Vitest, ESLint

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Types du socle

**Files:**
- Create: `src/core/ha-types.ts`, `src/core/types.ts`
- Test: aucun (déclarations de types ; la tâche 3 les exerce)

**Interfaces:**
- Consumes: rien.
- Produces: `EntityKey`, `EntityStatus`, `HomeAssistant`, `HassEntity`, `EntityRegistryDisplayEntry`, `DeviceRegistryEntry`, `PronoteCardConfig`, `CardScope`, `CardSpec`, `RenderCtx`, `HaFormSchema`. Toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Écrire `src/core/ha-types.ts`**

Ces types reproduisent la partie du frontend Home Assistant que nous consommons. Ils sont vérifiés contre `home-assistant/frontend@dev` (`src/data/entity/entity_registry.ts`, `src/data/device/device_registry.ts`, `src/types.ts`). On les déclare plutôt que d'ajouter une dépendance sur `custom-card-helpers`, qui traîne derrière le frontend.

```ts
export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string;
  icon?: string;
  device_id?: string;
  area_id?: string;
  labels: string[];
  hidden?: boolean;
  entity_category?: 'config' | 'diagnostic';
  translation_key?: string;
  platform?: string;
  display_precision?: number;
  has_entity_name?: boolean;
}

export interface DeviceRegistryEntry {
  id: string;
  name: string | null;
  name_by_user: string | null;
  manufacturer: string | null;
  model: string | null;
  via_device_id: string | null;
  area_id: string | null;
  config_entries: string[];
  identifiers: [string, string][];
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  language: string;
  locale: { language: string; time_zone: string };
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: Record<string, unknown>
  ): Promise<unknown>;
}

export type HaFormSchema = {
  name: string;
  required?: boolean;
  selector: Record<string, unknown>;
};
```

- [ ] **Step 2: Écrire `src/core/types.ts`**

```ts
import type { TemplateResult } from 'lit';
import type { HaFormSchema, HassEntity, HomeAssistant } from './ha-types';

/** Clé d'entité qualifiée par son domaine : 'sensor:next_lesson', 'todo:homework'. */
export type EntityKey = `${string}:${string}`;

/** Les trois états que toute carte doit distinguer (spec §4.3). */
export type EntityStatus = 'missing' | 'unavailable' | 'ok';

export type CardScope = 'child' | 'account';

export interface PronoteCardConfig {
  type: string;
  device_id?: string;
  title?: string;
  /** Surcharge de résolution, clé qualifiée → entity_id. Jamais nécessaire au cas nominal. */
  entities?: Record<string, string>;
  [option: string]: unknown;
}

export interface RenderCtx<C extends PronoteCardConfig = PronoteCardConfig> {
  hass: HomeAssistant;
  config: C;
  /** Nom affiché de l'appareil résolu. Jamais un nom codé en dur. */
  deviceName: string;
  entityId(key: EntityKey): string | undefined;
  entity(key: EntityKey): HassEntity | undefined;
  status(key: EntityKey): EntityStatus;
  attr<T = unknown>(key: EntityKey, name: string): T | undefined;
  /** Chaîne localisée depuis src/localize. */
  t(path: string, vars?: Record<string, string | number>): string;
  /** Seul service appelable. Ne place aucun appel réseau PRONOTE : relève une priorité. */
  refresh(tier?: string): Promise<void>;
  /** Vrai pendant l'intervalle de garde suivant un refresh (spec §4.5). */
  refreshCoolingDown: boolean;
}

export interface CardSpec<C extends PronoteCardConfig = PronoteCardConfig> {
  /** Nom de l'élément personnalisé, sans le préfixe 'custom:'. */
  type: string;
  name: string;
  description: string;
  scope: CardScope;
  /** Toutes obligatoires. Fonction de la config : `range` et `period` changent les clés. */
  requires(config: C): EntityKey[];
  /** Au moins une doit être résolue. Vide si sans objet. */
  requiresAny?(config: C): EntityKey[];
  optional(config: C): EntityKey[];
  schema(config: C): HaFormSchema[];
  /** Config par défaut proposée par l'éditeur de tableau de bord. */
  stub?: Partial<C>;
  size?: number;
  render(ctx: RenderCtx<C>): TemplateResult;
}
```

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint`
Expected: aucun message.

- [ ] **Step 4: Commit**

```bash
git add src/core/ha-types.ts src/core/types.ts
git commit -m "feat: types du socle et surface HA consommée

Les types du frontend sont déclarés localement plutôt qu'importés
de custom-card-helpers, qui traîne derrière le frontend.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Résolution des entités — le cœur

**Files:**
- Create: `src/core/resolve.ts`, `test/fixtures/hass.ts`
- Test: `test/resolve.test.ts`

**Interfaces:**
- Consumes: `EntityKey`, `CardScope`, `HomeAssistant` (tâche 2).
- Produces:
  - `resolveDevice(hass, deviceId, scope): string | undefined`
  - `resolveEntities(hass, deviceId, scope, keys, overrides?): Map<EntityKey, string>`
  - `isChildDevice(hass, deviceId): boolean`
  - `PLATFORM = 'pronote_ng'`
  - `test/fixtures/hass.ts` : `makeHass(spec): HomeAssistant`, utilisé par **tous** les tests suivants.

- [ ] **Step 1: Écrire la fixture `test/fixtures/hass.ts`**

Elle n'emploie que des valeurs synthétiques : appareil enfant `dev_enfant`, appareil de compte `dev_compte`, `demo.example.invalid`.

```ts
import type {
  DeviceRegistryEntry,
  EntityRegistryDisplayEntry,
  HassEntity,
  HomeAssistant,
} from '../../src/core/ha-types';

export interface EntitySpec {
  /** Clé qualifiée, ex. 'sensor:next_lesson'. */
  key: string;
  /** Identifiant complet. Synthétique — jamais un identifiant réel. */
  entity_id: string;
  device: 'dev_enfant' | 'dev_compte';
  state?: string;
  attributes?: Record<string, unknown>;
  platform?: string;
  /** Si vrai, l'entité est au registre mais absente de hass.states. */
  unloaded?: boolean;
}

export function makeHass(entities: EntitySpec[] = []): HomeAssistant {
  const devices: Record<string, DeviceRegistryEntry> = {
    dev_compte: {
      id: 'dev_compte',
      name: 'Compte Pronote',
      name_by_user: null,
      manufacturer: 'Pronote NG',
      model: 'Compte',
      via_device_id: null,
      area_id: null,
      config_entries: ['entry_1'],
      identifiers: [['pronote_ng', 'compte']],
    },
    dev_enfant: {
      id: 'dev_enfant',
      name: 'Enfant',
      name_by_user: null,
      manufacturer: 'Pronote NG',
      model: 'Élève',
      via_device_id: 'dev_compte',
      area_id: null,
      config_entries: ['entry_1'],
      identifiers: [['pronote_ng', 'enfant']],
    },
  };

  const registry: Record<string, EntityRegistryDisplayEntry> = {};
  const states: Record<string, HassEntity> = {};

  for (const e of entities) {
    const [, tk] = e.key.split(':');
    registry[e.entity_id] = {
      entity_id: e.entity_id,
      device_id: e.device,
      labels: [],
      platform: e.platform ?? 'pronote_ng',
      translation_key: tk,
      has_entity_name: true,
    };
    if (!e.unloaded) {
      states[e.entity_id] = {
        entity_id: e.entity_id,
        state: e.state ?? 'unknown',
        attributes: e.attributes ?? {},
        last_changed: '2026-09-08T07:00:00+00:00',
        last_updated: '2026-09-08T07:00:00+00:00',
      };
    }
  }

  return {
    states,
    entities: registry,
    devices,
    language: 'fr',
    locale: { language: 'fr', time_zone: 'Europe/Paris' },
    callService: async () => undefined,
  };
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

`test/resolve.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { isChildDevice, resolveDevice, resolveEntities } from '../src/core/resolve';
import { makeHass } from './fixtures/hass';

const enfant = (key: string, entity_id: string, extra = {}) =>
  ({ key, entity_id, device: 'dev_enfant' as const, ...extra });

describe('resolveDevice', () => {
  it("rend l'appareil lui-même pour une carte d'enfant", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_enfant', 'child')).toBe('dev_enfant');
  });

  it("suit via_device_id pour une carte de compte", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_enfant', 'account')).toBe('dev_compte');
  });

  it("rend l'appareil lui-même si une carte de compte reçoit déjà le compte", () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_compte', 'account')).toBe('dev_compte');
  });

  it('rend undefined pour un appareil inconnu', () => {
    const hass = makeHass([]);
    expect(resolveDevice(hass, 'dev_absent', 'child')).toBeUndefined();
  });
});

describe('isChildDevice', () => {
  it("distingue l'enfant du compte par via_device_id", () => {
    const hass = makeHass([]);
    expect(isChildDevice(hass, 'dev_enfant')).toBe(true);
    expect(isChildDevice(hass, 'dev_compte')).toBe(false);
  });
});

describe('resolveEntities', () => {
  it('résout une clé par translation_key sur le bon appareil', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.get('sensor:next_lesson')).toBe('sensor.abc_prochain_cours');
  });

  it('distingue deux domaines partageant le même translation_key', () => {
    const hass = makeHass([
      enfant('sensor:homework', 'sensor.abc_devoirs'),
      enfant('calendar:homework', 'calendar.abc_devoirs'),
      enfant('todo:homework', 'todo.abc_devoirs'),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', [
      'sensor:homework',
      'calendar:homework',
      'todo:homework',
    ]);
    expect(r.get('sensor:homework')).toBe('sensor.abc_devoirs');
    expect(r.get('calendar:homework')).toBe('calendar.abc_devoirs');
    expect(r.get('todo:homework')).toBe('todo.abc_devoirs');
  });

  it('ignore une entité d’une autre intégration sur le même appareil', () => {
    const hass = makeHass([
      enfant('sensor:next_lesson', 'sensor.autre_prochain_cours', { platform: 'autre' }),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.has('sensor:next_lesson')).toBe(false);
  });

  it("n'invente rien quand la clé est absente", () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:menu_today']);
    expect(r.has('sensor:menu_today')).toBe(false);
  });

  it('résout les entités de compte depuis un device_id d’enfant', () => {
    const hass = makeHass([
      { key: 'sensor:limiter_state', entity_id: 'sensor.cpt_etat', device: 'dev_compte' },
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'account', ['sensor:limiter_state']);
    expect(r.get('sensor:limiter_state')).toBe('sensor.cpt_etat');
  });

  it('la surcharge explicite prime sur la résolution', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'sensor.surcharge',
    });
    expect(r.get('sensor:next_lesson')).toBe('sensor.surcharge');
  });

  it('la surcharge fonctionne sans device_id', () => {
    const hass = makeHass([]);
    const r = resolveEntities(hass, undefined, 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'sensor.surcharge',
    });
    expect(r.get('sensor:next_lesson')).toBe('sensor.surcharge');
  });

  it('résout une entité au registre mais non chargée dans la machine à états', () => {
    const hass = makeHass([
      enfant('sensor:next_lesson', 'sensor.abc_prochain_cours', { unloaded: true }),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson']);
    expect(r.get('sensor:next_lesson')).toBe('sensor.abc_prochain_cours');
  });

  it('résout les clés de période close', () => {
    const hass = makeHass([enfant('sensor:grades_period', 'sensor.abc_notes_p1')]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:grades_period']);
    expect(r.get('sensor:grades_period')).toBe('sensor.abc_notes_p1');
  });
});
```

Le dernier test mérite un mot : une entité inscrite au registre mais absente de `hass.states` **doit** se résoudre. C'est exactement la panne observée en production (« Error adding entity … for domain … with platform pronote_ng ») ; la carte doit pouvoir afficher « indisponible » plutôt que « entité absente », parce que les deux appellent des actions différentes de l'utilisateur.

- [ ] **Step 2b: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/resolve.test.ts`
Expected: FAIL — `Failed to resolve import "../src/core/resolve"`.

- [ ] **Step 3: Écrire `src/core/resolve.ts`**

```ts
import type { CardScope, EntityKey } from './types';
import type { HomeAssistant } from './ha-types';

export const PLATFORM = 'pronote_ng';

/** Un appareil d'enfant est rattaché à un appareil de compte par via_device_id. */
export function isChildDevice(hass: HomeAssistant, deviceId: string): boolean {
  return Boolean(hass.devices[deviceId]?.via_device_id);
}

/**
 * L'appareil réellement porteur des entités de la carte.
 * Une carte de compte suit via_device_id ; l'utilisateur ne configure jamais
 * que le device_id de l'enfant.
 */
export function resolveDevice(
  hass: HomeAssistant,
  deviceId: string | undefined,
  scope: CardScope
): string | undefined {
  if (!deviceId) return undefined;
  const device = hass.devices[deviceId];
  if (!device) return undefined;
  if (scope === 'account') return device.via_device_id ?? device.id;
  return device.id;
}

export function resolveEntities(
  hass: HomeAssistant,
  deviceId: string | undefined,
  scope: CardScope,
  keys: readonly EntityKey[],
  overrides?: Record<string, string>
): Map<EntityKey, string> {
  const out = new Map<EntityKey, string>();
  const target = resolveDevice(hass, deviceId, scope);

  // Un index par appareil évite de reparcourir tout le registre par clé.
  const onDevice = target
    ? Object.values(hass.entities).filter(
        (e) => e.device_id === target && e.platform === PLATFORM
      )
    : [];

  for (const key of keys) {
    const override = overrides?.[key];
    if (override) {
      out.set(key, override);
      continue;
    }
    const sep = key.indexOf(':');
    if (sep < 0) continue;
    const domain = key.slice(0, sep);
    const translationKey = key.slice(sep + 1);
    const match = onDevice.find(
      (e) =>
        e.translation_key === translationKey && e.entity_id.startsWith(`${domain}.`)
    );
    if (match) out.set(key, match.entity_id);
  }

  return out;
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run test/resolve.test.ts && npm run typecheck && npm run lint`
Expected: `14 passed`, aucun message de typecheck ni de lint.

- [ ] **Step 5: Commit**

```bash
git add src/core/resolve.ts test/fixtures/hass.ts test/resolve.test.ts
git commit -m "feat: résolution des entités par translation_key qualifié

Une entité au registre mais absente de la machine à états se résout
quand même : la carte doit pouvoir dire « indisponible » plutôt que
« entité absente », les deux appellent des actions différentes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Formateurs

**Files:**
- Create: `src/core/format.ts`
- Test: `test/format.test.ts`

**Interfaces:**
- Consumes: rien (fonctions pures, aucun accès à `hass`).
- Produces: `formatTime`, `formatRelative`, `formatDayLabel`, `formatGrade`, `formatDuration`, `parseTimestamp`.

- [ ] **Step 1: Écrire les tests qui échouent**

`test/format.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatGrade,
  formatRelative,
  formatTime,
  parseTimestamp,
} from '../src/core/format';

const TZ = 'Europe/Paris';

describe('parseTimestamp', () => {
  it('accepte un ISO 8601 avec décalage', () => {
    expect(parseTimestamp('2026-09-08T08:30:00+02:00')?.getTime()).toBe(
      Date.parse('2026-09-08T06:30:00Z')
    );
  });
  it('rend undefined pour unknown, unavailable et vide', () => {
    expect(parseTimestamp('unknown')).toBeUndefined();
    expect(parseTimestamp('unavailable')).toBeUndefined();
    expect(parseTimestamp('')).toBeUndefined();
    expect(parseTimestamp(undefined)).toBeUndefined();
  });
});

describe('formatTime', () => {
  it('rend une heure locale sur 24 h dans le fuseau demandé', () => {
    expect(formatTime('2026-09-08T08:30:00+02:00', 'fr', TZ)).toBe('08:30');
  });
  it('rend une chaîne vide pour une date absente', () => {
    expect(formatTime(undefined, 'fr', TZ)).toBe('');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-09-08T08:00:00+02:00');
  it('rend « dans 30 min » pour une échéance proche', () => {
    expect(formatRelative('2026-09-08T08:30:00+02:00', 'fr', now)).toBe('dans 30 min');
  });
  it('rend « dans 2 h » au-delà de l’heure', () => {
    expect(formatRelative('2026-09-08T10:00:00+02:00', 'fr', now)).toBe('dans 2 h');
  });
  it('rend « il y a 15 min » pour le passé', () => {
    expect(formatRelative('2026-09-08T07:45:00+02:00', 'fr', now)).toBe('il y a 15 min');
  });
  it('rend « maintenant » sous la minute', () => {
    expect(formatRelative('2026-09-08T08:00:30+02:00', 'fr', now)).toBe('maintenant');
  });
});

describe('formatGrade', () => {
  it('rend note et barème', () => {
    expect(formatGrade(14.5, 20)).toBe('14,5/20');
  });
  it('rend la note seule sans barème', () => {
    expect(formatGrade(14.5, undefined)).toBe('14,5');
  });
  it('rend un tiret pour une note absente', () => {
    expect(formatGrade(undefined, 20)).toBe('—');
  });
});

describe('formatDuration', () => {
  it('rend les minutes sous l’heure', () => {
    expect(formatDuration(45)).toBe('45 min');
  });
  it('rend heures et minutes au-delà', () => {
    expect(formatDuration(135)).toBe('2 h 15');
  });
  it('rend les heures rondes sans minutes', () => {
    expect(formatDuration(120)).toBe('2 h');
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/format.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Écrire `src/core/format.ts`**

```ts
const ABSENT = new Set(['unknown', 'unavailable', 'none', '']);

export function parseTimestamp(value: string | undefined): Date | undefined {
  if (!value || ABSENT.has(value)) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function formatTime(
  value: string | undefined,
  language: string,
  timeZone: string
): string {
  const d = parseTimestamp(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(d);
}

export function formatDayLabel(
  value: string | undefined,
  language: string,
  timeZone: string
): string {
  const d = parseTimestamp(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(d);
}

export function formatRelative(
  value: string | undefined,
  language: string,
  now: Date = new Date()
): string {
  const d = parseTimestamp(value);
  if (!d) return '';
  const deltaMin = Math.round((d.getTime() - now.getTime()) / 60000);
  if (Math.abs(deltaMin) < 1) return 'maintenant';
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'always', style: 'short' });
  if (Math.abs(deltaMin) < 60) return normalize(rtf.format(deltaMin, 'minute'));
  const deltaH = Math.round(deltaMin / 60);
  if (Math.abs(deltaH) < 24) return normalize(rtf.format(deltaH, 'hour'));
  return normalize(rtf.format(Math.round(deltaH / 24), 'day'));
}

/** Intl rend « dans 30 min. » selon la version d'ICU ; on retire le point final. */
function normalize(s: string): string {
  return s.replace(/\.$/, '').trim();
}

export function formatGrade(
  grade: number | string | undefined,
  outOf: number | string | undefined
): string {
  if (grade === undefined || grade === null || grade === '') return '—';
  const g = typeof grade === 'number' ? grade.toLocaleString('fr-FR') : String(grade);
  if (outOf === undefined || outOf === null || outOf === '') return g;
  return `${g}/${outOf}`;
}

export function formatDuration(minutes: number | undefined): string {
  if (minutes === undefined || minutes < 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run test/format.test.ts`
Expected: tous passent. Si `formatRelative` échoue sur la forme exacte (`dans 30 min` contre `dans 30 min.`), corriger `normalize`, **pas** le test — la sortie visible doit être stable entre versions d'ICU.

- [ ] **Step 5: Commit**

```bash
git add src/core/format.ts test/format.test.ts
git commit -m "feat: formateurs heure, relatif, note et durée

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Localisation et primitives d'affichage

**Files:**
- Create: `src/localize/fr.json`, `src/localize/index.ts`, `src/core/ui/styles.ts`, `src/core/ui/parts.ts`
- Test: `test/localize.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `localize(path, vars?)`, `sharedStyles` (`CSSResult`), et les fonctions de rendu `emptyState(message)`, `missingState(keys, t)`, `unavailableState(t)`, `listRow(opts)`, `chip(label, tone)`.

- [ ] **Step 1: Écrire `src/localize/fr.json`**

Toutes les chaînes visibles du projet vivent ici. Les huit tâches de cartes y ajoutent leurs entrées.

```json
{
  "common": {
    "missing_body": "Entité introuvable sur cet appareil :",
    "missing_hint": "Vérifiez que le palier correspondant est activé dans les options de l'intégration.",
    "unavailable": "Donnée pas encore collectée.",
    "no_device": "Choisissez un enfant dans les options de la carte.",
    "unknown_device": "Cet appareil n'existe plus.",
    "refresh": "Rafraîchir",
    "refresh_pending": "Demande envoyée",
    "of": "sur"
  }
}
```

- [ ] **Step 2: Écrire `src/localize/index.ts`**

```ts
import fr from './fr.json';

type Dict = { [k: string]: string | Dict };

const CATALOGS: Record<string, Dict> = { fr: fr as Dict };
const FALLBACK = 'fr';

/**
 * Résout un chemin pointé dans le catalogue de la langue, puis dans le
 * catalogue de repli. Rend le chemin lui-même si rien n'est trouvé — une
 * chaîne manquante doit être visible, pas silencieuse.
 */
export function localize(
  path: string,
  vars?: Record<string, string | number>,
  language = FALLBACK
): string {
  const found = lookup(CATALOGS[language] ?? CATALOGS[FALLBACK], path) ?? lookup(CATALOGS[FALLBACK], path);
  if (typeof found !== 'string') return path;
  if (!vars) return found;
  return found.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function lookup(dict: Dict | undefined, path: string): string | Dict | undefined {
  if (!dict) return undefined;
  return path.split('.').reduce<string | Dict | undefined>((acc, part) => {
    if (acc === undefined || typeof acc === 'string') return undefined;
    return acc[part];
  }, dict);
}
```

- [ ] **Step 3: Écrire le test**

`test/localize.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { localize } from '../src/localize';

describe('localize', () => {
  it('résout un chemin pointé', () => {
    expect(localize('common.unavailable')).toBe('Donnée pas encore collectée.');
  });
  it('substitue les variables', () => {
    expect(localize('common.missing_body', { keys: 'sensor:menu_today' })).toContain(
      'sensor:menu_today'
    );
  });
  it('rend le chemin lui-même quand la chaîne manque', () => {
    expect(localize('common.inexistante')).toBe('common.inexistante');
  });
  it('retombe sur le français pour une langue inconnue', () => {
    expect(localize('common.unavailable', undefined, 'de')).toBe(
      'Donnée pas encore collectée.'
    );
  });
});
```

- [ ] **Step 4: Écrire `src/core/ui/styles.ts`**

Aucune couleur en dur : uniquement les variables CSS de Home Assistant, pour que les cartes suivent le thème de l'utilisateur.

```ts
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
```

- [ ] **Step 5: Écrire `src/core/ui/parts.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import { localize } from '../../localize';

export type Tone = 'neutral' | 'ok' | 'warn' | 'problem';

export const chip = (label: string, tone: Tone = 'neutral'): TemplateResult =>
  html`<span class="chip ${tone === 'neutral' ? '' : tone}">${label}</span>`;

/** État « vide » : l'information EST le vide. Message fourni par la carte. */
export const emptyState = (message: string): TemplateResult =>
  html`<div class="notice">${message}</div>`;

/** État « indisponible » : transitoire, pas une erreur. */
export const unavailableState = (): TemplateResult =>
  html`<div class="notice">${localize('common.unavailable')}</div>`;

/** État « entité absente » : demande une action de l'utilisateur. */
export const missingState = (keys: readonly string[]): TemplateResult => html`
  <div class="notice problem">
    ${localize('common.missing_body')}
    ${keys.map((k) => html`<code>${k}</code> `)}
  </div>
  <div class="notice">${localize('common.missing_hint')}</div>
`;

export interface RowOptions {
  primary: string | TemplateResult;
  secondary?: string | TemplateResult;
  trailing?: string | TemplateResult;
  canceled?: boolean;
}

export const listRow = (o: RowOptions): TemplateResult => html`
  <div class="row ${o.canceled ? 'canceled' : ''}">
    <span class="primary">${o.primary}</span>
    ${o.secondary ? html`<span class="secondary">${o.secondary}</span>` : ''}
    ${o.trailing ? html`<span class="trailing">${o.trailing}</span>` : ''}
  </div>
`;
```

- [ ] **Step 6: Vérifier**

Run: `npx vitest run test/localize.test.ts && npm run typecheck && npm run lint`
Expected: `4 passed`, aucun message.

- [ ] **Step 7: Commit**

```bash
git add src/localize src/core/ui test/localize.test.ts
git commit -m "feat: catalogue français et primitives d'affichage

Aucune couleur en dur : uniquement les variables CSS de Home
Assistant, pour que les cartes suivent le thème de l'utilisateur.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Carte de base et registre

**Files:**
- Create: `src/core/base-card.ts`, `src/core/registry.ts`
- Modify: `src/index.ts`
- Test: `test/base-card.test.ts`

**Interfaces:**
- Consumes: `CardSpec`, `RenderCtx`, `resolveEntities`, `resolveDevice`, `sharedStyles`, primitives d'affichage, `localize`.
- Produces:
  - `class PronoteCardBase extends LitElement` — propriété `hass`, méthodes `setConfig(config)`, `getCardSize()`, `getConfigElement()`, `getStubConfig()`.
  - `defineCard(spec: CardSpec): void`
  - `REFRESH_COOLDOWN_MS = 15 * 60 * 1000`

- [ ] **Step 1: Écrire les tests qui échouent**

`test/base-card.test.ts` :

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { defineCard } from '../src/core/registry';
import type { CardSpec } from '../src/core/types';
import { makeHass } from './fixtures/hass';

const SPEC: CardSpec = {
  type: 'pronote-ng-test',
  name: 'Test',
  description: 'Carte de test',
  scope: 'child',
  requires: () => ['sensor:next_lesson'],
  optional: () => [],
  schema: () => [],
  render: (ctx) => html`<p class="ok">${ctx.entity('sensor:next_lesson')?.state}</p>`,
};

const mount = async (config: Record<string, unknown>, hass: unknown) => {
  const el = document.createElement('pronote-ng-test') as HTMLElement & {
    setConfig: (c: unknown) => void;
    hass: unknown;
  };
  el.setConfig({ type: 'custom:pronote-ng-test', ...config });
  el.hass = hass;
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
};

const text = (el: HTMLElement) => el.shadowRoot?.textContent ?? '';

beforeAll(() => defineCard(SPEC));

describe('PronoteCardBase — les trois états', () => {
  it('rend la carte quand la donnée est là', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: '2026-09-08T08:30:00+02:00',
      },
    ]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(el.shadowRoot?.querySelector('.ok')).not.toBeNull();
  });

  it('dit « entité absente » et nomme la clé attendue', async () => {
    const hass = makeHass([]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('sensor:next_lesson');
    expect(el.shadowRoot?.querySelector('.ok')).toBeNull();
  });

  it('dit « indisponible » quand l’entité existe mais n’a pas d’état', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
  });

  it('distingue « au registre mais non chargée » de « absente »', async () => {
    const hass = makeHass([
      {
        key: 'sensor:next_lesson',
        entity_id: 'sensor.abc_prochain_cours',
        device: 'dev_enfant',
        unloaded: true,
      },
    ]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('pas encore collectée');
    expect(text(el)).not.toContain('introuvable');
  });

  it('demande de choisir un enfant sans device_id', async () => {
    const el = await mount({}, makeHass([]));
    expect(text(el)).toContain('Choisissez un enfant');
  });

  it('rejette une config sans type', () => {
    const el = document.createElement('pronote-ng-test') as HTMLElement & {
      setConfig: (c: unknown) => void;
    };
    expect(() => el.setConfig(null as unknown as object)).toThrow();
  });
});

describe('defineCard', () => {
  it('enregistre la carte dans window.customCards', () => {
    const cards = (window as unknown as { customCards: { type: string }[] }).customCards;
    expect(cards.some((c) => c.type === 'pronote-ng-test')).toBe(true);
  });
  it('enregistre aussi l’éditeur', () => {
    expect(customElements.get('pronote-ng-card-editor')).toBeDefined();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/base-card.test.ts`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Écrire `src/core/base-card.ts`**

```ts
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HassEntity, HomeAssistant } from './ha-types';
import { resolveDevice, resolveEntities } from './resolve';
import type { CardSpec, EntityKey, EntityStatus, PronoteCardConfig, RenderCtx } from './types';
import { sharedStyles } from './ui/styles';
import { missingState, unavailableState } from './ui/parts';
import { localize } from '../localize';

/** Un boost est plafonné à un par palier et par intervalle côté intégration. */
export const REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

const ABSENT_STATES = new Set(['unknown', 'unavailable']);

export function makeCardClass(spec: CardSpec): CustomElementConstructor {
  class PronoteCardBase extends LitElement {
    static styles = sharedStyles;

    @property({ attribute: false }) hass?: HomeAssistant;
    @state() private _config?: PronoteCardConfig;
    @state() private _refreshedAt = 0;

    private _resolved = new Map<EntityKey, string>();

    setConfig(config: PronoteCardConfig): void {
      if (!config || typeof config !== 'object') {
        throw new Error(localize('common.no_device'));
      }
      this._config = config;
    }

    getCardSize(): number {
      return spec.size ?? 3;
    }

    static getConfigElement(): HTMLElement {
      const el = document.createElement('pronote-ng-card-editor') as HTMLElement & {
        spec?: CardSpec;
      };
      el.spec = spec;
      return el;
    }

    static getStubConfig(): Partial<PronoteCardConfig> {
      return { type: `custom:${spec.type}`, ...(spec.stub ?? {}) };
    }

    private get _keys(): { required: EntityKey[]; any: EntityKey[]; all: EntityKey[] } {
      const c = this._config as PronoteCardConfig;
      const required = spec.requires(c);
      const any = spec.requiresAny?.(c) ?? [];
      return { required, any, all: [...required, ...any, ...spec.optional(c)] };
    }

    protected render(): TemplateResult | typeof nothing {
      const hass = this.hass;
      const config = this._config;
      if (!hass || !config) return nothing;

      if (!config.device_id && !config.entities) {
        return this._frame(html`<div class="notice">${localize('common.no_device')}</div>`);
      }
      if (config.device_id && !hass.devices[config.device_id]) {
        return this._frame(
          html`<div class="notice problem">${localize('common.unknown_device')}</div>`
        );
      }

      const { required, any, all } = this._keys;
      this._resolved = resolveEntities(
        hass,
        config.device_id,
        spec.scope,
        all,
        config.entities
      );

      // État 1 — entité absente du registre pour cet appareil.
      const missingRequired = required.filter((k) => !this._resolved.has(k));
      const anyUnsatisfied = any.length > 0 && !any.some((k) => this._resolved.has(k));
      if (missingRequired.length > 0 || anyUnsatisfied) {
        const keys = missingRequired.length > 0 ? missingRequired : any;
        return this._frame(missingState(keys));
      }

      // État 2 — entité présente, état non collecté. Transitoire, pas une erreur.
      const anchors = any.length > 0 ? any.filter((k) => this._resolved.has(k)) : required;
      const hasUsable = anchors.some((k) => {
        const e = this._entity(k);
        return e !== undefined && !ABSENT_STATES.has(e.state);
      });
      if (anchors.length > 0 && !hasUsable) {
        return this._frame(unavailableState());
      }

      // État 3 — la carte décide, le vide lui appartient.
      return this._frame(spec.render(this._ctx(hass, config)));
    }

    private _frame(body: TemplateResult): TemplateResult {
      const title = this._config?.title;
      return html`
        <ha-card>
          ${title ? html`<div class="title">${title}</div>` : ''}
          <div class="body">${body}</div>
        </ha-card>
      `;
    }

    private _entity(key: EntityKey): HassEntity | undefined {
      const id = this._resolved.get(key);
      return id ? this.hass?.states[id] : undefined;
    }

    private _ctx(hass: HomeAssistant, config: PronoteCardConfig): RenderCtx {
      const deviceId = resolveDevice(hass, config.device_id, spec.scope);
      const device = deviceId ? hass.devices[deviceId] : undefined;
      return {
        hass,
        config,
        deviceName: device?.name_by_user ?? device?.name ?? '',
        entityId: (k) => this._resolved.get(k),
        entity: (k) => this._entity(k),
        status: (k): EntityStatus => {
          if (!this._resolved.has(k)) return 'missing';
          const e = this._entity(k);
          if (!e || ABSENT_STATES.has(e.state)) return 'unavailable';
          return 'ok';
        },
        attr: <T,>(k: EntityKey, name: string) =>
          this._entity(k)?.attributes[name] as T | undefined,
        t: (path, vars) => localize(path, vars, hass.language),
        refresh: async (tier?: string) => {
          // Ne place aucun appel PRONOTE : relève une priorité auprès de
          // l'ordonnanceur, qui reste soumis au limiteur.
          await hass.callService(
            'pronote_ng',
            'refresh',
            tier ? { tier } : {},
            config.device_id ? { device_id: config.device_id } : undefined
          );
          this._refreshedAt = Date.now();
        },
        refreshCoolingDown: Date.now() - this._refreshedAt < REFRESH_COOLDOWN_MS,
      };
    }
  }

  return PronoteCardBase as unknown as CustomElementConstructor;
}
```

- [ ] **Step 4: Écrire `src/core/registry.ts`**

```ts
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

const DOCS = 'https://fiveelements.github.io/ha-pronote-ng-cards/';

export function defineCard(spec: CardSpec): void {
  if (!customElements.get('pronote-ng-card-editor')) {
    customElements.define('pronote-ng-card-editor', PronoteCardEditor);
  }
  if (!customElements.get(spec.type)) {
    customElements.define(spec.type, makeCardClass(spec));
  }
  const w = window as unknown as { customCards?: CustomCardEntry[] };
  w.customCards = w.customCards ?? [];
  if (!w.customCards.some((c) => c.type === spec.type)) {
    w.customCards.push({
      type: spec.type,
      name: spec.name,
      description: spec.description,
      preview: true,
      documentationURL: DOCS,
    });
  }
}
```

- [ ] **Step 5: Écrire `src/index.ts` provisoire**

```ts
export { defineCard } from './core/registry';
export type { CardSpec, RenderCtx, PronoteCardConfig, EntityKey } from './core/types';
```

Les huit `import`/`defineCard` de cartes s'ajoutent aux tâches 8 à 15.

- [ ] **Step 6: Lancer les tests**

Run: `npx vitest run test/base-card.test.ts`
Expected: tous passent. La tâche 7 fournit `src/core/editor.ts` — si `registry.ts` ne compile pas encore faute de cet import, **faire la tâche 7 avant de relancer**, puis revenir ici.

> Note d'ordonnancement : `registry.ts` importe l'éditeur de la tâche 7. Les deux tâches se relisent ensemble ; enchaînez-les avant de valider l'une ou l'autre.

- [ ] **Step 7: Commit**

```bash
git add src/core/base-card.ts src/core/registry.ts src/index.ts test/base-card.test.ts
git commit -m "feat: carte de base, trois états, registre des cartes

La distinction entité absente / indisponible / vide est portée par
le socle : une entité au registre mais sans état affiche
« pas encore collectée », pas « introuvable ».

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Éditeur générique et diagnostic de résolution

**Files:**
- Create: `src/core/editor.ts`
- Modify: `src/localize/fr.json`
- Test: `test/editor.test.ts`

**Interfaces:**
- Consumes: `CardSpec`, `resolveEntities`, `isChildDevice`, `localize`.
- Produces: `class PronoteCardEditor extends LitElement` avec les propriétés `hass`, `spec`, la méthode `setConfig(config)`, et l'émission de `config-changed`.

- [ ] **Step 1: Ajouter les chaînes à `src/localize/fr.json`**

Ajouter sous la racine :

```json
"editor": {
  "device": "Enfant",
  "device_helper": "Toutes les cartes se configurent avec l'appareil de l'enfant, y compris celles qui affichent des données de compte.",
  "title": "Titre",
  "overrides": "Surcharges d'entités",
  "overrides_helper": "Inutile dans le cas nominal. À n'employer que si la résolution automatique échoue.",
  "diagnosis": "Résolution",
  "found": "trouvée",
  "not_found": "introuvable",
  "account_device_picked": "Cet appareil est un compte, pas un enfant. Choisissez l'appareil de l'enfant : les cartes de diagnostic remontent au compte toutes seules."
}
```

- [ ] **Step 2: Écrire les tests qui échouent**

`test/editor.test.ts` :

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { html } from 'lit';
import { PronoteCardEditor } from '../src/core/editor';
import type { CardSpec } from '../src/core/types';
import { makeHass } from './fixtures/hass';

const SPEC: CardSpec = {
  type: 'pronote-ng-test-editor',
  name: 'Test',
  description: 'Carte de test',
  scope: 'child',
  requires: () => ['sensor:next_lesson'],
  optional: () => ['sensor:menu_today'],
  schema: () => [],
  render: () => html``,
};

beforeAll(() => {
  if (!customElements.get('pronote-ng-card-editor-test')) {
    customElements.define('pronote-ng-card-editor-test', class extends PronoteCardEditor {});
  }
});

const mount = async (config: Record<string, unknown>, hass: unknown) => {
  const el = document.createElement('pronote-ng-card-editor-test') as HTMLElement & {
    setConfig: (c: unknown) => void;
    hass: unknown;
    spec: CardSpec;
  };
  el.spec = SPEC;
  el.setConfig({ type: 'custom:pronote-ng-test-editor', ...config });
  el.hass = hass;
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
};

const text = (el: HTMLElement) => el.shadowRoot?.textContent ?? '';

describe('PronoteCardEditor — diagnostic de résolution', () => {
  it('signale les clés trouvées et les clés introuvables', async () => {
    const hass = makeHass([
      { key: 'sensor:next_lesson', entity_id: 'sensor.abc_pc', device: 'dev_enfant' },
    ]);
    const el = await mount({ device_id: 'dev_enfant' }, hass);
    expect(text(el)).toContain('sensor:next_lesson');
    expect(text(el)).toContain('sensor:menu_today');
    expect(text(el)).toContain('introuvable');
  });

  it("avertit quand l'utilisateur choisit l'appareil de compte", async () => {
    const el = await mount({ device_id: 'dev_compte' }, makeHass([]));
    expect(text(el)).toContain('est un compte, pas un enfant');
  });

  it("n'affiche pas de diagnostic sans appareil choisi", async () => {
    const el = await mount({}, makeHass([]));
    expect(text(el)).not.toContain('introuvable');
  });

  it('émet config-changed quand ha-form remonte une valeur', async () => {
    const el = await mount({ device_id: 'dev_enfant' }, makeHass([]));
    let received: unknown;
    el.addEventListener('config-changed', (e) => {
      received = (e as CustomEvent).detail.config;
    });
    el.shadowRoot
      ?.querySelector('ha-form')
      ?.dispatchEvent(
        new CustomEvent('value-changed', {
          detail: { value: { device_id: 'dev_enfant', title: 'École' } },
        })
      );
    expect(received).toMatchObject({ title: 'École' });
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/editor.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/core/editor.ts`**

`ha-form` n'existe pas dans happy-dom : les tests exercent le diagnostic et l'émission d'évènement, pas le rendu du formulaire lui-même. C'est délibéré — le formulaire est du ressort de Home Assistant.

```ts
import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { HaFormSchema, HomeAssistant } from './ha-types';
import { isChildDevice, resolveEntities } from './resolve';
import type { CardSpec, EntityKey, PronoteCardConfig } from './types';
import { sharedStyles } from './ui/styles';
import { localize } from '../localize';

export class PronoteCardEditor extends LitElement {
  static styles = sharedStyles;

  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) spec?: CardSpec;
  @state() private _config?: PronoteCardConfig;

  setConfig(config: PronoteCardConfig): void {
    this._config = config;
  }

  private get _schema(): HaFormSchema[] {
    const c = this._config as PronoteCardConfig;
    return [
      {
        name: 'device_id',
        required: true,
        selector: { device: { integration: 'pronote_ng' } },
      },
      { name: 'title', selector: { text: {} } },
      ...(this.spec?.schema(c) ?? []),
    ];
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config || !this.spec) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${this._schema}
        .computeLabel=${(s: HaFormSchema) => localize(`editor.${s.name}`)}
        @value-changed=${this._valueChanged}
      ></ha-form>
      ${this._diagnosis()}
    `;
  }

  private _valueChanged(ev: Event): void {
    const value = (ev as CustomEvent).detail?.value;
    if (!value) return;
    this._config = { ...this._config, ...value } as PronoteCardConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * Dit à l'utilisateur, dans l'éditeur, quelles entités sa carte trouvera —
   * plutôt que de le laisser découvrir une carte vide.
   */
  private _diagnosis(): TemplateResult | typeof nothing {
    const hass = this.hass;
    const spec = this.spec;
    const config = this._config;
    if (!hass || !spec || !config?.device_id) return nothing;

    if (!isChildDevice(hass, config.device_id)) {
      return html`<div class="notice problem">
        ${localize('editor.account_device_picked')}
      </div>`;
    }

    const keys: EntityKey[] = [
      ...spec.requires(config),
      ...(spec.requiresAny?.(config) ?? []),
      ...spec.optional(config),
    ];
    const resolved = resolveEntities(hass, config.device_id, spec.scope, keys, config.entities);

    return html`
      <div class="title">${localize('editor.diagnosis')}</div>
      ${keys.map(
        (k) => html`
          <div class="row">
            <span class="primary"><code>${k}</code></span>
            <span class="trailing">
              ${resolved.has(k) ? localize('editor.found') : localize('editor.not_found')}
            </span>
          </div>
        `
      )}
    `;
  }
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run test/editor.test.ts test/base-card.test.ts && npm run typecheck && npm run lint && npm run build`
Expected: tous passent, `dist/pronote-ng-cards.js` construit.

- [ ] **Step 6: Commit**

```bash
git add src/core/editor.ts src/localize/fr.json test/editor.test.ts
git commit -m "feat: éditeur générique et diagnostic de résolution

L'éditeur dit quelles clés il trouve pour l'appareil choisi, plutôt
que de laisser l'utilisateur découvrir une carte vide, et l'avertit
s'il a choisi l'appareil de compte au lieu de l'enfant.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Tests de garde — rendre les interdits exécutables

**Files:**
- Test: `test/guards.test.ts`

**Interfaces:**
- Consumes: rien (lit l'arborescence).
- Produces: rien. Ces tests protègent toutes les tâches suivantes.

Cette tâche vient **avant** les cartes délibérément : la garde doit exister avant le code qu'elle surveille, sinon elle est écrite pour tolérer ce qui a déjà été écrit.

- [ ] **Step 1: Écrire les tests**

`test/guards.test.ts` :

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string, exts: string[]): string[] => {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
};

const read = (files: string[]) => files.map((f) => [f, readFileSync(f, 'utf8')] as const);

describe("garde : aucun identifiant d'entité en dur", () => {
  // Un identifiant réel, pas la clé qualifiée 'sensor:next_lesson' (deux-points).
  const HARDCODED =
    /\b(sensor|binary_sensor|calendar|todo|button|event|image)\.[a-z0-9_]{2,}/;

  it('src/ ne contient aucun identifiant complet', () => {
    for (const [file, body] of read(walk('src', ['.ts', '.json']))) {
      const hit = body.match(HARDCODED);
      expect(hit, `${file} contient « ${hit?.[0]} »`).toBeNull();
    }
  });
});

describe('garde : les services à réponse restent hors du projet', () => {
  const FORBIDDEN = [
    'get_ical_url',
    'get_identity',
    'generate_timetable_pdf',
    'get_rate_limit_status',
    'export_credentials',
    'ine_number',
  ];

  it('src/ n’en mentionne aucun', () => {
    for (const [file, body] of read(walk('src', ['.ts', '.json']))) {
      for (const f of FORBIDDEN) {
        expect(body.includes(f), `${file} mentionne ${f}`).toBe(false);
      }
    }
  });

  it('docs/ n’en mentionne aucun, sauf le document de conception qui les interdit', () => {
    const files = read(walk('docs', ['.md'])).filter(
      ([f]) => !f.includes('superpowers')
    );
    for (const [file, body] of files) {
      for (const f of FORBIDDEN) {
        expect(body.includes(f), `${file} mentionne ${f}`).toBe(false);
      }
    }
  });
});

describe('garde : le journaliseur pronotepy n’est jamais recommandé', () => {
  it("aucun fichier ne propose d'activer pronotepy en debug", () => {
    const files = read([...walk('src', ['.ts', '.json']), ...walk('docs', ['.md'])]).filter(
      ([f]) => !f.includes('superpowers')
    );
    for (const [file, body] of files) {
      expect(/pronotepy\s*:\s*debug/i.test(body), `${file}`).toBe(false);
      expect(/logger.*pronotepy/i.test(body), `${file}`).toBe(false);
    }
  });
});

describe('garde : aucune donnée réelle', () => {
  it('les seules valeurs de démonstration sont synthétiques', () => {
    const files = read([
      ...walk('src', ['.ts', '.json']),
      ...walk('test', ['.ts']),
      ...walk('docs', ['.md']),
    ]).filter(([f]) => !f.includes('superpowers'));
    for (const [file, body] of files) {
      // Une adresse d'instance réelle n'a rien à faire ici.
      expect(/https?:\/\/[a-z0-9.-]*\.(fr|com|net|org)\b/i.test(body), `${file}`).toBe(
        /fiveelements\.github\.io|github\.com|home-assistant\.io|hacs\.xyz/.test(body)
      );
    }
  });
});
```

- [ ] **Step 2: Lancer les tests**

Run: `npx vitest run test/guards.test.ts`
Expected: tous passent sur le code actuel. Si l'un échoue, **corriger le code, pas la garde**.

> Le dernier test est volontairement grossier ; s'il devient bruyant, resserrer la liste blanche des domaines autorisés plutôt que de le supprimer.

- [ ] **Step 3: Commit**

```bash
git add test/guards.test.ts
git commit -m "test: gardes exécutables sur les interdits du projet

Aucun identifiant en dur, aucun service à réponse, aucune
recommandation du journaliseur pronotepy, aucune donnée réelle.
Écrites avant les cartes : une garde écrite après tolère ce qui
existe déjà.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Cartes — patron commun aux tâches 9 à 16

Chaque tâche de carte suit exactement la même forme. Elle est décrite ici une fois ; les tâches donnent le contenu propre à chaque carte.

1. Ajouter les chaînes de la carte dans `src/localize/fr.json`, sous une clé égale au nom court de la carte.
2. Écrire `test/cards/<nom>.test.ts` avec **au minimum** quatre cas : données présentes, liste vide, entité indisponible, entité absente de l'appareil. Utiliser `makeHass` et le montage de `test/base-card.test.ts` (extraire l'utilitaire `mountCard` dans `test/fixtures/mount.ts` à la première carte, puis le réutiliser).
3. Lancer les tests, vérifier qu'ils échouent.
4. Écrire `src/cards/<nom>.ts` exportant un `CardSpec`.
5. Ajouter dans `src/index.ts` : `import { SPEC as X } from './cards/<nom>'; defineCard(X);`
6. Lancer `npx vitest run && npm run typecheck && npm run lint && npm run build`.
7. Commit.

**Rappel valable pour les huit :** les trois états sont gérés par le socle, sauf le **vide**, qui appartient à la carte — c'est elle qui sait qu'une liste de zéro devoir se dit « rien à rendre demain » et non « donnée indisponible ».

- [ ] **Step 0 (tâche 9 uniquement) : extraire `test/fixtures/mount.ts`**

```ts
import { defineCard } from '../../src/core/registry';
import type { CardSpec } from '../../src/core/types';
import type { HomeAssistant } from '../../src/core/ha-types';

export async function mountCard(
  spec: CardSpec,
  config: Record<string, unknown>,
  hass: HomeAssistant
): Promise<HTMLElement> {
  defineCard(spec);
  const el = document.createElement(spec.type) as HTMLElement & {
    setConfig: (c: unknown) => void;
    hass: unknown;
  };
  el.setConfig({ type: `custom:${spec.type}`, device_id: 'dev_enfant', ...config });
  el.hass = hass;
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el;
}

export const cardText = (el: HTMLElement): string => el.shadowRoot?.textContent ?? '';
```

---

### Task 9: Carte `pronote-ng-prochain-cours`

**Files:**
- Create: `src/cards/prochain-cours.ts`, `test/cards/prochain-cours.test.ts`, `test/fixtures/mount.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: `CardSpec`, `RenderCtx`, `formatTime`, `formatRelative`, `chip`, `emptyState`, `listRow`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/prochain-cours.ts`. Les sept cartes suivantes copient cette forme.

**Attributs consommés** (annexe A §1) : `sensor:next_lesson` — état = horodatage de début ; attributs `subject`, `teachers`, `classroom`, `end`, `canceled`.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"prochain_cours": {
  "name": "Prochain cours",
  "empty": "Aucun cours à venir.",
  "canceled": "annulé",
  "room": "Salle {room}",
  "wake_up": "Réveil à {time}",
  "end_of_day": "Fin des cours à {time}",
  "show_wake_up": "Afficher l'heure de réveil",
  "show_end_of_day": "Afficher la fin des cours"
}
```

- [ ] **Step 2: Écrire `test/cards/prochain-cours.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/prochain-cours';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const lesson = (state: string, attributes: Record<string, unknown> = {}) =>
  makeHass([
    {
      key: 'sensor:next_lesson',
      entity_id: 'sensor.abc_prochain_cours',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte prochain-cours', () => {
  it('affiche matière, heure, salle et professeur', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', {
      subject: 'Mathématiques',
      classroom: 'B204',
      teachers: ['M. Dupont'],
      canceled: false,
    });
    const el = await mountCard(SPEC, {}, hass);
    const t = cardText(el);
    expect(t).toContain('Mathématiques');
    expect(t).toContain('08:30');
    expect(t).toContain('B204');
    expect(t).toContain('M. Dupont');
  });

  it('accepte teachers en chaîne comme en tableau', async () => {
    const el = await mountCard(
      SPEC,
      {},
      lesson('2026-09-08T08:30:00+02:00', { subject: 'Histoire', teachers: 'Mme Martin' })
    );
    expect(cardText(el)).toContain('Mme Martin');
  });

  it('signale un cours annulé sans le masquer', async () => {
    const el = await mountCard(
      SPEC,
      {},
      lesson('2026-09-08T08:30:00+02:00', { subject: 'Anglais', canceled: true })
    );
    const t = cardText(el);
    expect(t).toContain('Anglais');
    expect(t).toContain('annulé');
  });

  it('dit « aucun cours à venir » quand l’état est vide et non indisponible', async () => {
    const hass = lesson('2026-09-08T08:30:00+02:00', { subject: 'Maths' });
    // état horodaté présent mais sans matière ni fin : la carte rend quand même.
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).not.toContain('Aucun cours');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(SPEC, {}, lesson('unavailable'));
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » et nomme la clé quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    const t = cardText(el);
    expect(t).toContain('sensor:next_lesson');
    expect(t).toContain('introuvable');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/prochain-cours.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/prochain-cours.ts`**

```ts
import { html } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatRelative, formatTime } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_wake_up?: boolean;
  show_end_of_day?: boolean;
}

const NEXT: EntityKey = 'sensor:next_lesson';
const WAKE: EntityKey = 'sensor:next_wake_up';
const END: EntityKey = 'sensor:end_of_lessons';

const teachersOf = (value: unknown): string => {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return typeof value === 'string' ? value : '';
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-prochain-cours',
  name: 'Pronote NG — Prochain cours',
  description: 'Le prochain cours : matière, heure, salle, professeur.',
  scope: 'child',
  size: 2,
  requires: () => [NEXT],
  optional: (c) => [
    ...(c.show_wake_up ? [WAKE] : []),
    ...(c.show_end_of_day ? [END] : []),
  ],
  schema: () => [
    { name: 'show_wake_up', selector: { boolean: {} } },
    { name: 'show_end_of_day', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const e = ctx.entity(NEXT);
    if (!e) return emptyState(ctx.t('prochain_cours.empty'));

    const tz = ctx.hass.locale.time_zone;
    const lang = ctx.hass.language;
    const subject = (ctx.attr<string>(NEXT, 'subject') ?? '').trim();
    const room = ctx.attr<string>(NEXT, 'classroom');
    const teachers = teachersOf(ctx.attr(NEXT, 'teachers'));
    const canceled = ctx.attr<boolean>(NEXT, 'canceled') === true;

    return html`
      ${listRow({
        primary: subject || ctx.t('prochain_cours.name'),
        secondary: html`${formatTime(e.state, lang, tz)} ·
        ${formatRelative(e.state, lang)}`,
        trailing: canceled ? chip(ctx.t('prochain_cours.canceled'), 'problem') : undefined,
        canceled,
      })}
      ${room ? listRow({ primary: ctx.t('prochain_cours.room', { room }) }) : ''}
      ${teachers ? listRow({ primary: teachers }) : ''}
      ${ctx.config.show_wake_up && ctx.status(WAKE) === 'ok'
        ? listRow({
            primary: ctx.t('prochain_cours.wake_up', {
              time: formatTime(ctx.entity(WAKE)?.state, lang, tz),
            }),
          })
        : ''}
      ${ctx.config.show_end_of_day && ctx.status(END) === 'ok'
        ? listRow({
            primary: ctx.t('prochain_cours.end_of_day', {
              time: formatTime(ctx.entity(END)?.state, lang, tz),
            }),
          })
        : ''}
    `;
  },
};
```

- [ ] **Step 5: Enregistrer la carte dans `src/index.ts`**

```ts
import { defineCard } from './core/registry';
import { SPEC as PROCHAIN_COURS } from './cards/prochain-cours';

defineCard(PROCHAIN_COURS);

export { defineCard };
export type { CardSpec, RenderCtx, PronoteCardConfig, EntityKey } from './core/types';
```

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe, y compris les gardes de la tâche 8.

- [ ] **Step 7: Commit**

```bash
git add src/cards/prochain-cours.ts src/index.ts src/localize/fr.json test/cards test/fixtures/mount.ts
git commit -m "feat(carte): prochain cours

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Carte `pronote-ng-menu`

**Files:**
- Create: `src/cards/menu.ts`, `test/cards/menu.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/menu.ts`.

**Attributs consommés** (annexe A §2) : `sensor:menu_today` et `sensor:menu_tomorrow` — état = nombre de plats ; attributs `first_meal`, `main_meal`, `side_meal`, `other_meal`, `cheese`, `dessert`, `is_lunch`. Chaque champ vaut une chaîne, un tableau de chaînes, ou un tableau d'objets portant `name` — les trois formes se rencontrent selon l'établissement.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"menu": {
  "name": "Cantine",
  "empty": "Pas de menu publié pour ce jour.",
  "today": "Aujourd'hui",
  "tomorrow": "Demain",
  "day": "Jour affiché",
  "first_meal": "Entrée",
  "main_meal": "Plat",
  "side_meal": "Accompagnement",
  "cheese": "Fromage",
  "dessert": "Dessert",
  "other_meal": "Autre"
}
```

- [ ] **Step 2: Écrire `test/cards/menu.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/menu';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const menu = (state: string, attributes: Record<string, unknown> = {}) =>
  makeHass([
    {
      key: 'sensor:menu_today',
      entity_id: 'sensor.abc_menu_du_jour',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte menu', () => {
  it('rend les plats groupés par section', async () => {
    const el = await mountCard(
      SPEC,
      {},
      menu('4', {
        first_meal: ['Carottes râpées'],
        main_meal: ['Poulet rôti'],
        dessert: ['Yaourt'],
        is_lunch: true,
      })
    );
    const t = cardText(el);
    expect(t).toContain('Entrée');
    expect(t).toContain('Carottes râpées');
    expect(t).toContain('Plat');
    expect(t).toContain('Poulet rôti');
    expect(t).toContain('Dessert');
  });

  it('accepte une chaîne simple comme un tableau d’objets', async () => {
    const el = await mountCard(
      SPEC,
      {},
      menu('2', { main_meal: 'Gratin', dessert: [{ name: 'Compote' }] })
    );
    const t = cardText(el);
    expect(t).toContain('Gratin');
    expect(t).toContain('Compote');
  });

  it('dit « pas de menu publié » sur une liste vide, pas « indisponible »', async () => {
    const el = await mountCard(SPEC, {}, menu('0', {}));
    const t = cardText(el);
    expect(t).toContain('Pas de menu publié');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(SPEC, {}, menu('unavailable'));
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('sensor:menu_today');
  });

  it('bascule sur demain quand day vaut tomorrow', async () => {
    const hass = makeHass([
      {
        key: 'sensor:menu_tomorrow',
        entity_id: 'sensor.abc_menu_demain',
        device: 'dev_enfant',
        state: '1',
        attributes: { main_meal: 'Poisson' },
      },
    ]);
    const el = await mountCard(SPEC, { day: 'tomorrow' }, hass);
    expect(cardText(el)).toContain('Poisson');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/menu.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/menu.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  day?: 'today' | 'tomorrow';
}

const TODAY: EntityKey = 'sensor:menu_today';
const TOMORROW: EntityKey = 'sensor:menu_tomorrow';

const SECTIONS = [
  'first_meal',
  'main_meal',
  'side_meal',
  'cheese',
  'dessert',
  'other_meal',
] as const;

/** Les trois formes rencontrées : chaîne, tableau de chaînes, tableau d'objets. */
const dishes = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => {
      if (typeof v === 'string') return v;
      if (v && typeof v === 'object' && 'name' in v) return String((v as { name: unknown }).name);
      return '';
    })
    .filter(Boolean);
};

const keyFor = (c: Config): EntityKey => (c.day === 'tomorrow' ? TOMORROW : TODAY);

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-menu',
  name: 'Pronote NG — Cantine',
  description: 'Le menu du jour ou du lendemain, plat par plat.',
  scope: 'child',
  size: 4,
  stub: { day: 'today' },
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: () => [
    {
      name: 'day',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'today', label: "Aujourd'hui" },
            { value: 'tomorrow', label: 'Demain' },
          ],
        },
      },
    },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const rows: TemplateResult[] = [];

    for (const section of SECTIONS) {
      const items = dishes(ctx.attr(key, section));
      if (items.length === 0) continue;
      rows.push(
        listRow({
          primary: ctx.t(`menu.${section}`),
          trailing: items.join(' · '),
        })
      );
    }

    // Le vide appartient à la carte : la cantine ne publie pas tous les jours,
    // ce n'est pas une panne.
    if (rows.length === 0) return emptyState(ctx.t('menu.empty'));
    return html`${rows}`;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as MENU } from './cards/menu';` et `defineCard(MENU);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/menu.ts src/index.ts src/localize/fr.json test/cards/menu.test.ts
git commit -m "feat(carte): cantine

« Pas de menu publié » n'est pas « donnée indisponible » : la
cantine ne publie pas tous les jours.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Carte `pronote-ng-devoirs`

**Files:**
- Create: `src/cards/devoirs.ts`, `test/cards/devoirs.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9, plus `ctx.hass.callService` pour `todo.update_item`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/devoirs.ts`.

**Attributs consommés** : `sensor:homework_todo` (état = nombre non faits, attributs `items`, `next_due`), `sensor:homework_tomorrow` (`items`), `sensor:homework` (`items`), `binary_sensor:homework_overdue`, `todo:homework` pour la coche. Chaque élément d'`items` porte `subject`, `description`, `due`, `id`, `done`.

**Écriture** : la case n'est rendue que si l'entité `todo:homework` annonce `UPDATE_ITEM` (bit `1 << 1`, valeur 2) dans `supported_features`. L'intégration ne l'annonce que si `write_operations_enabled` — la carte **lit** cette capacité, elle ne la suppose pas.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"devoirs": {
  "name": "Devoirs",
  "empty_todo": "Rien à faire.",
  "empty_tomorrow": "Rien à rendre demain.",
  "empty_all": "Aucun devoir sur l'horizon.",
  "overdue": "en retard",
  "due": "pour le {date}",
  "filter": "Devoirs affichés",
  "filter_todo": "À faire",
  "filter_tomorrow": "Pour demain",
  "filter_all": "Tous",
  "group_by": "Grouper par",
  "group_date": "Échéance",
  "group_subject": "Matière",
  "limit": "Nombre maximum"
}
```

- [ ] **Step 2: Écrire `test/cards/devoirs.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { SPEC } from '../../src/cards/devoirs';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const items = [
  { id: 'h1', subject: 'Maths', description: 'Exercices 4 à 7', due: '2026-09-09', done: false },
  { id: 'h2', subject: 'Anglais', description: 'Lire le chapitre 3', due: '2026-09-10', done: false },
];

const hw = (attributes: Record<string, unknown>, state = '2', extra: unknown[] = []) =>
  makeHass([
    {
      key: 'sensor:homework_todo',
      entity_id: 'sensor.abc_devoirs_a_faire',
      device: 'dev_enfant',
      state,
      attributes,
    },
    ...(extra as never[]),
  ]);

describe('carte devoirs', () => {
  it('liste les devoirs avec matière et énoncé', async () => {
    const el = await mountCard(SPEC, {}, hw({ items }));
    const t = cardText(el);
    expect(t).toContain('Maths');
    expect(t).toContain('Exercices 4 à 7');
    expect(t).toContain('Anglais');
  });

  it('respecte limit', async () => {
    const el = await mountCard(SPEC, { limit: 1 }, hw({ items }));
    const t = cardText(el);
    expect(t).toContain('Maths');
    expect(t).not.toContain('Anglais');
  });

  it('dit « rien à faire » sur une liste vide', async () => {
    const el = await mountCard(SPEC, {}, hw({ items: [] }, '0'));
    const t = cardText(el);
    expect(t).toContain('Rien à faire');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(SPEC, {}, hw({}, 'unavailable'));
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('sensor:homework_todo');
  });

  it("ne rend aucune case à cocher si l'écriture n'est pas activée", async () => {
    const hass = hw({ items }, '2', [
      {
        key: 'todo:homework',
        entity_id: 'todo.abc_devoirs',
        device: 'dev_enfant',
        state: '2',
        attributes: { supported_features: 0 },
      },
    ]);
    const el = await mountCard(SPEC, {}, hass);
    expect(el.shadowRoot?.querySelector('input[type=checkbox]')).toBeNull();
  });

  it("rend les cases et appelle todo.update_item quand l'écriture est activée", async () => {
    const hass = hw({ items }, '2', [
      {
        key: 'todo:homework',
        entity_id: 'todo.abc_devoirs',
        device: 'dev_enfant',
        state: '2',
        attributes: { supported_features: 2 },
      },
    ]);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard(SPEC, {}, hass);
    const box = el.shadowRoot?.querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(box).not.toBeNull();
    box.click();
    expect(spy).toHaveBeenCalledWith(
      'todo',
      'update_item',
      expect.objectContaining({ status: 'completed' }),
      expect.objectContaining({ entity_id: 'todo.abc_devoirs' })
    );
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/devoirs.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/devoirs.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  filter?: 'todo' | 'tomorrow' | 'all';
  group_by?: 'date' | 'subject';
  limit?: number;
}

interface Homework {
  id?: string;
  subject?: string;
  description?: string;
  due?: string;
  done?: boolean;
}

const TODO: EntityKey = 'sensor:homework_todo';
const TOMORROW: EntityKey = 'sensor:homework_tomorrow';
const ALL: EntityKey = 'sensor:homework';
const OVERDUE: EntityKey = 'binary_sensor:homework_overdue';
const TODO_LIST: EntityKey = 'todo:homework';

/**
 * Bit UPDATE_TODO_ITEM de TodoListEntityFeature, côté Home Assistant.
 * Écrit sans point après le nom du domaine : la garde « aucun identifiant en
 * dur » de la tâche 8 déclenche sur `todo.` suivi de minuscules.
 */
const UPDATE_ITEM = 2;

const keyFor = (c: Config): EntityKey =>
  c.filter === 'tomorrow' ? TOMORROW : c.filter === 'all' ? ALL : TODO;

const emptyFor = (c: Config): string =>
  c.filter === 'tomorrow'
    ? 'devoirs.empty_tomorrow'
    : c.filter === 'all'
      ? 'devoirs.empty_all'
      : 'devoirs.empty_todo';

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-devoirs',
  name: 'Pronote NG — Devoirs',
  description: 'Les devoirs à faire, avec échéance et matière.',
  scope: 'child',
  size: 5,
  stub: { filter: 'todo', group_by: 'date' },
  requires: (c) => [keyFor(c)],
  optional: () => [OVERDUE, TODO_LIST],
  schema: () => [
    {
      name: 'filter',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'todo', label: 'À faire' },
            { value: 'tomorrow', label: 'Pour demain' },
            { value: 'all', label: 'Tous' },
          ],
        },
      },
    },
    {
      name: 'group_by',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'date', label: 'Échéance' },
            { value: 'subject', label: 'Matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const key = keyFor(ctx.config);
    const items = (ctx.attr<Homework[]>(key, 'items') ?? []).slice();

    if (items.length === 0) return emptyState(ctx.t(emptyFor(ctx.config)));

    const by = ctx.config.group_by ?? 'date';
    items.sort((a, b) =>
      by === 'subject'
        ? (a.subject ?? '').localeCompare(b.subject ?? '')
        : (a.due ?? '').localeCompare(b.due ?? '')
    );

    const limited = ctx.config.limit ? items.slice(0, ctx.config.limit) : items;

    // La coche n'existe que si l'intégration annonce l'écriture. On lit la
    // capacité, on ne la suppose pas.
    const todoId = ctx.entityId(TODO_LIST);
    const features = ctx.attr<number>(TODO_LIST, 'supported_features') ?? 0;
    const writable = Boolean(todoId) && (features & UPDATE_ITEM) !== 0;

    const complete = async (item: Homework) => {
      if (!todoId || !item.description) return;
      await ctx.hass.callService(
        'todo',
        'update_item',
        { item: item.description, status: 'completed' },
        { entity_id: todoId }
      );
    };

    const rows: TemplateResult[] = limited.map((h) =>
      listRow({
        primary: html`
          ${writable
            ? html`<input
                type="checkbox"
                .checked=${h.done === true}
                @click=${() => complete(h)}
              />`
            : ''}
          ${h.subject ?? ctx.t('devoirs.name')}
        `,
        secondary: h.description ?? '',
        trailing: h.due ? ctx.t('devoirs.due', { date: h.due }) : undefined,
      })
    );

    return html`${rows}`;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as DEVOIRS } from './cards/devoirs';` et `defineCard(DEVOIRS);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/devoirs.ts src/index.ts src/localize/fr.json test/cards/devoirs.test.ts
git commit -m "feat(carte): devoirs, avec coche conditionnée à l'écriture

La case à cocher n'est rendue que si l'entité todo annonce
UPDATE_ITEM : l'intégration ne l'annonce que si l'écriture est
activée, la carte lit cette capacité au lieu de la supposer.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Carte `pronote-ng-notes`

**Files:**
- Create: `src/cards/notes.ts`, `test/cards/notes.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9, plus `formatGrade`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/notes.ts`. Première carte à utiliser `requiresAny` et les clés `*_period`.

**Attributs consommés** : `sensor:overall_average` (état = moyenne, attributs `out_of`, `period`), `sensor:class_average`, `sensor:grades` (attribut `items` : `subject`, `grade`, `out_of`, `coefficient`, `date`, `class_average`, `status`), `sensor:averages` (attribut `items` : `subject`, `average` ou `student`, `class_average`), `sensor:latest_grade` (état numérique **ou** `unknown` avec attribut `status` portant le motif d'une sentinelle `|1` à `|8`).

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"notes": {
  "name": "Notes",
  "empty": "Aucune note pour cette période.",
  "empty_averages": "Aucune moyenne publiée.",
  "student": "Élève",
  "class": "Classe",
  "coefficient": "coef. {value}",
  "sections": "Blocs affichés",
  "section_average": "Moyenne générale",
  "section_latest": "Dernières notes",
  "section_subjects": "Par matière",
  "period": "Période close (index)",
  "limit": "Nombre maximum de notes"
}
```

- [ ] **Step 2: Écrire `test/cards/notes.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/notes';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const grades = [
  { subject: 'Maths', grade: 14.5, out_of: 20, coefficient: 2, date: '2026-09-05' },
  { subject: 'Anglais', grade: 12, out_of: 20, coefficient: 1, date: '2026-09-06' },
];

const base = (over: Record<string, unknown> = {}) =>
  makeHass([
    {
      key: 'sensor:overall_average',
      entity_id: 'sensor.abc_moyenne_generale',
      device: 'dev_enfant',
      state: '13,5',
      attributes: { out_of: 20 },
      ...over,
    },
    {
      key: 'sensor:grades',
      entity_id: 'sensor.abc_notes',
      device: 'dev_enfant',
      state: '2',
      attributes: { items: grades },
    },
    {
      key: 'sensor:averages',
      entity_id: 'sensor.abc_moyennes',
      device: 'dev_enfant',
      state: '2',
      attributes: {
        items: [{ subject: 'Maths', average: 14.2, class_average: 12.1 }],
      },
    },
  ]);

describe('carte notes', () => {
  it('affiche la moyenne générale, les dernières notes et les moyennes par matière', async () => {
    const el = await mountCard(
      SPEC,
      { sections: ['average', 'latest', 'subjects'] },
      base()
    );
    const t = cardText(el);
    expect(t).toContain('13,5');
    expect(t).toContain('Maths');
    expect(t).toContain('14,5/20');
    expect(t).toContain('12,1');
  });

  it('affiche le motif quand la dernière note est une sentinelle', async () => {
    const hass = makeHass([
      {
        key: 'sensor:latest_grade',
        entity_id: 'sensor.abc_derniere_note',
        device: 'dev_enfant',
        state: 'unknown',
        attributes: { subject: 'Maths', status: 'Absent' },
      },
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(SPEC, { sections: ['latest'] }, hass);
    expect(cardText(el)).toContain('Absent');
  });

  it('dit « aucune note » sur une liste vide', async () => {
    const hass = makeHass([
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(SPEC, { sections: ['latest'] }, hass);
    const t = cardText(el);
    expect(t).toContain('Aucune note');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand tout est indisponible', async () => {
    const hass = makeHass([
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard(SPEC, { sections: ['latest'] }, hass);
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand aucune des clés requiresAny n'existe", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('introuvable');
  });

  it('cible les entités de période close quand period est renseigné', async () => {
    const hass = makeHass([
      {
        key: 'sensor:overall_average_period',
        entity_id: 'sensor.abc_moyenne_generale_p1',
        device: 'dev_enfant',
        state: '11,8',
        attributes: { out_of: 20 },
      },
    ]);
    const el = await mountCard(SPEC, { period: 1, sections: ['average'] }, hass);
    expect(cardText(el)).toContain('11,8');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/notes.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/notes.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatGrade } from '../core/format';
import { emptyState, listRow } from '../core/ui/parts';

type Section = 'average' | 'latest' | 'subjects';

interface Config extends PronoteCardConfig {
  sections?: Section[];
  limit?: number;
  /** Index d'une période close. Absent = période en cours. */
  period?: number;
}

interface Grade {
  subject?: string;
  grade?: number | string;
  out_of?: number | string;
  coefficient?: number;
  date?: string;
  class_average?: number | string;
  status?: string;
}

interface Average {
  subject?: string;
  average?: number | string;
  student?: number | string;
  class_average?: number | string;
}

/** Les entités de période close portent les clés suffixées `_period`. */
const k = (c: Config, base: string): EntityKey =>
  (c.period === undefined ? `sensor:${base}` : `sensor:${base}_period`) as EntityKey;

const OVERALL = (c: Config) => k(c, 'overall_average');
const GRADES = (c: Config) => k(c, 'grades');
const AVERAGES = (c: Config) => k(c, 'averages');
const LATEST: EntityKey = 'sensor:latest_grade';
/**
 * L'intégration ne crée pas de `class_average_period` : la moyenne de classe
 * n'existe que pour la période en cours. On ne la cherche donc pas quand une
 * période close est ciblée, plutôt que de chercher une clé inexistante.
 */
const CLASS = (c: Config): EntityKey | undefined =>
  c.period === undefined ? 'sensor:class_average' : undefined;

const sectionsOf = (c: Config): Section[] =>
  c.sections && c.sections.length > 0 ? c.sections : ['average', 'latest', 'subjects'];

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-notes',
  name: 'Pronote NG — Notes',
  description: 'Moyennes, dernières notes et moyennes par matière.',
  scope: 'child',
  size: 6,
  stub: { sections: ['average', 'latest', 'subjects'] },
  requires: () => [],
  requiresAny: (c) => [OVERALL(c), GRADES(c), AVERAGES(c)],
  optional: (c) => [...(CLASS(c) ? [CLASS(c) as EntityKey] : []), LATEST],
  schema: () => [
    {
      name: 'sections',
      selector: {
        select: {
          multiple: true,
          options: [
            { value: 'average', label: 'Moyenne générale' },
            { value: 'latest', label: 'Dernières notes' },
            { value: 'subjects', label: 'Par matière' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
    { name: 'period', selector: { number: { min: 1, max: 6, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const blocks: TemplateResult[] = [];

    if (wanted.includes('average') && ctx.status(OVERALL(c)) === 'ok') {
      const e = ctx.entity(OVERALL(c));
      blocks.push(
        listRow({
          primary: ctx.t('notes.student'),
          trailing: formatGrade(e?.state, ctx.attr<number>(OVERALL(c), 'out_of')),
        })
      );
      const classKey = CLASS(c);
      if (classKey && ctx.status(classKey) === 'ok') {
        blocks.push(
          listRow({
            primary: ctx.t('notes.class'),
            trailing: formatGrade(
              ctx.entity(classKey)?.state,
              ctx.attr<number>(classKey, 'out_of')
            ),
          })
        );
      }
    }

    if (wanted.includes('latest')) {
      // Une sentinelle (|1 à |8) rend l'état non numérique : le motif est dans
      // `status`, et c'est lui qu'il faut montrer — jamais un vide.
      const status = ctx.attr<string>(LATEST, 'status');
      if (ctx.status(LATEST) === 'unavailable' && status) {
        blocks.push(
          listRow({
            primary: ctx.attr<string>(LATEST, 'subject') ?? ctx.t('notes.name'),
            trailing: status,
          })
        );
      }
      const items = ctx.attr<Grade[]>(GRADES(c), 'items') ?? [];
      const limited = [...items].reverse().slice(0, c.limit ?? 8);
      for (const g of limited) {
        blocks.push(
          listRow({
            primary: g.subject ?? '—',
            secondary: g.coefficient
              ? ctx.t('notes.coefficient', { value: g.coefficient })
              : undefined,
            trailing: g.status ?? formatGrade(g.grade, g.out_of),
          })
        );
      }
      if (items.length === 0 && ctx.status(GRADES(c)) === 'ok' && blocks.length === 0) {
        return emptyState(ctx.t('notes.empty'));
      }
    }

    if (wanted.includes('subjects')) {
      const items = ctx.attr<Average[]>(AVERAGES(c), 'items') ?? [];
      for (const a of items) {
        blocks.push(
          listRow({
            primary: a.subject ?? '—',
            secondary:
              a.class_average !== undefined
                ? `${ctx.t('notes.class')} ${a.class_average}`
                : undefined,
            trailing: formatGrade(a.average ?? a.student, undefined),
          })
        );
      }
    }

    if (blocks.length === 0) return emptyState(ctx.t('notes.empty'));
    return html`${blocks}`;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as NOTES } from './cards/notes';` et `defineCard(NOTES);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/notes.ts src/index.ts src/localize/fr.json test/cards/notes.test.ts
git commit -m "feat(carte): notes, moyennes et moyennes par matière

Une note sentinelle (|1 à |8) rend l'état non numérique : la carte
affiche le motif porté par l'attribut status, jamais un vide.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Carte `pronote-ng-emploi-du-temps`

**Files:**
- Create: `src/cards/emploi-du-temps.ts`, `test/cards/emploi-du-temps.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9, plus `formatDayLabel`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/emploi-du-temps.ts`.

**Attributs consommés** : `sensor:lessons_today`, `sensor:timetable_tomorrow`, `sensor:timetable_week` — attribut `lessons`, chaque élément portant `subject`, `start`, `end`, `classroom`, `teachers`, `canceled`, `status`, `test`, `outing`.

**Règle de rendu, non négociable** : un cours annulé est **barré, jamais retiré**. Le supprimer donnerait l'illusion qu'il n'a jamais existé.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"emploi_du_temps": {
  "name": "Emploi du temps",
  "empty": "Aucun cours sur cette période.",
  "range": "Période affichée",
  "range_today": "Aujourd'hui",
  "range_tomorrow": "Demain",
  "range_week": "Semaine",
  "canceled": "annulé",
  "test": "contrôle",
  "outing": "sortie",
  "current": "en cours",
  "show_rooms": "Afficher les salles",
  "show_teachers": "Afficher les professeurs"
}
```

- [ ] **Step 2: Écrire `test/cards/emploi-du-temps.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/emploi-du-temps';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const lessons = [
  {
    subject: 'Maths',
    start: '2026-09-08T08:00:00+02:00',
    end: '2026-09-08T09:00:00+02:00',
    classroom: 'B204',
    teachers: ['M. Dupont'],
    canceled: false,
  },
  {
    subject: 'Anglais',
    start: '2026-09-08T09:00:00+02:00',
    end: '2026-09-08T10:00:00+02:00',
    classroom: 'A101',
    canceled: true,
  },
  {
    subject: 'Histoire',
    start: '2026-09-08T10:00:00+02:00',
    end: '2026-09-08T11:00:00+02:00',
    test: true,
  },
];

const day = (attributes: Record<string, unknown>, state = '3') =>
  makeHass([
    {
      key: 'sensor:lessons_today',
      entity_id: 'sensor.abc_cours_du_jour',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte emploi-du-temps', () => {
  it('liste les cours par ordre chronologique avec heure et salle', async () => {
    const el = await mountCard(SPEC, { show_rooms: true }, day({ lessons }));
    const t = cardText(el);
    expect(t).toContain('08:00');
    expect(t).toContain('Maths');
    expect(t).toContain('B204');
    expect(t.indexOf('Maths')).toBeLessThan(t.indexOf('Anglais'));
  });

  it('barre un cours annulé sans le retirer', async () => {
    const el = await mountCard(SPEC, {}, day({ lessons }));
    expect(cardText(el)).toContain('Anglais');
    expect(el.shadowRoot?.querySelector('.canceled')).not.toBeNull();
  });

  it('signale les contrôles', async () => {
    const el = await mountCard(SPEC, {}, day({ lessons }));
    expect(cardText(el)).toContain('contrôle');
  });

  it('dit « aucun cours » sur une liste vide', async () => {
    const el = await mountCard(SPEC, {}, day({ lessons: [] }, '0'));
    const t = cardText(el);
    expect(t).toContain('Aucun cours');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(SPEC, {}, day({}, 'unavailable'));
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('sensor:lessons_today');
  });

  it('marque « en cours » le créneau qui contient l’instant donné', async () => {
    const el = await mountCard(
      SPEC,
      { now: '2026-09-08T08:30:00+02:00' },
      day({ lessons })
    );
    expect(cardText(el)).toContain('en cours');
  });

  it('ne marque aucun créneau hors des heures de cours', async () => {
    const el = await mountCard(
      SPEC,
      { now: '2026-09-08T18:00:00+02:00' },
      day({ lessons })
    );
    expect(cardText(el)).not.toContain('en cours');
  });

  it('change de clé selon range', async () => {
    const hass = makeHass([
      {
        key: 'sensor:timetable_week',
        entity_id: 'sensor.abc_edt_semaine',
        device: 'dev_enfant',
        state: '1',
        attributes: { lessons: [lessons[0]] },
      },
    ]);
    const el = await mountCard(SPEC, { range: 'week' }, hass);
    expect(cardText(el)).toContain('Maths');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/emploi-du-temps.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/emploi-du-temps.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatDayLabel, formatTime, parseTimestamp } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  range?: 'today' | 'tomorrow' | 'week';
  show_rooms?: boolean;
  show_teachers?: boolean;
  /**
   * Instant de référence pour le surlignage du créneau courant. Absent du
   * schéma de l'éditeur : c'est une couture d'injection pour les tests, pas
   * une option destinée à l'utilisateur.
   */
  now?: string;
}

interface Lesson {
  subject?: string;
  start?: string;
  end?: string;
  classroom?: string;
  teachers?: string[] | string;
  canceled?: boolean;
  status?: string;
  test?: boolean;
  outing?: boolean;
}

const KEYS: Record<NonNullable<Config['range']>, EntityKey> = {
  today: 'sensor:lessons_today',
  tomorrow: 'sensor:timetable_tomorrow',
  week: 'sensor:timetable_week',
};

const keyFor = (c: Config): EntityKey => KEYS[c.range ?? 'today'];

const teachersOf = (value: unknown): string =>
  Array.isArray(value) ? value.filter(Boolean).join(', ') : typeof value === 'string' ? value : '';

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-emploi-du-temps',
  name: 'Pronote NG — Emploi du temps',
  description: 'Les cours du jour, du lendemain ou de la semaine.',
  scope: 'child',
  size: 8,
  stub: { range: 'today', show_rooms: true },
  requires: (c) => [keyFor(c)],
  optional: () => [],
  schema: () => [
    {
      name: 'range',
      selector: {
        select: {
          mode: 'dropdown',
          options: [
            { value: 'today', label: "Aujourd'hui" },
            { value: 'tomorrow', label: 'Demain' },
            { value: 'week', label: 'Semaine' },
          ],
        },
      },
    },
    { name: 'show_rooms', selector: { boolean: {} } },
    { name: 'show_teachers', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const key = keyFor(c);
    const lessons = [...(ctx.attr<Lesson[]>(key, 'lessons') ?? [])];

    if (lessons.length === 0) return emptyState(ctx.t('emploi_du_temps.empty'));

    lessons.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const out: TemplateResult[] = [];
    let currentDay = '';
    const now = (parseTimestamp(c.now) ?? new Date()).getTime();

    for (const l of lessons) {
      // En mode semaine, un intertitre par jour.
      if (c.range === 'week') {
        const label = formatDayLabel(l.start, lang, tz);
        if (label && label !== currentDay) {
          currentDay = label;
          out.push(html`<div class="title">${label}</div>`);
        }
      }

      // Un créneau annulé n'est jamais « en cours ».
      const start = parseTimestamp(l.start)?.getTime();
      const end = parseTimestamp(l.end)?.getTime();
      const current =
        !l.canceled && start !== undefined && end !== undefined && now >= start && now < end;

      const badges: TemplateResult[] = [];
      if (current) badges.push(chip(ctx.t('emploi_du_temps.current'), 'ok'));
      if (l.canceled) badges.push(chip(ctx.t('emploi_du_temps.canceled'), 'problem'));
      if (l.test) badges.push(chip(ctx.t('emploi_du_temps.test'), 'warn'));
      if (l.outing) badges.push(chip(ctx.t('emploi_du_temps.outing')));

      const details = [
        c.show_rooms ? l.classroom : undefined,
        c.show_teachers ? teachersOf(l.teachers) : undefined,
      ]
        .filter(Boolean)
        .join(' · ');

      out.push(
        listRow({
          primary: html`${formatTime(l.start, lang, tz)} ${l.subject ?? '—'}`,
          secondary: details || undefined,
          trailing: badges.length > 0 ? html`${badges}` : undefined,
          // Un cours annulé reste visible, barré. Le retirer donnerait
          // l'illusion qu'il n'a jamais existé.
          canceled: l.canceled === true,
        })
      );
    }

    return html`${out}`;
  },
};
```

Le surlignage repose sur `binary_sensor:in_class` uniquement pour l'entité globale ; ici le créneau exact se déduit de `start`/`end`, parce que le capteur binaire dit *qu'un* cours est en cours, pas *lequel*.

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as EDT } from './cards/emploi-du-temps';` et `defineCard(EDT);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/emploi-du-temps.ts src/index.ts src/localize/fr.json test/cards/emploi-du-temps.test.ts
git commit -m "feat(carte): emploi du temps

Un cours annulé est barré, jamais retiré : le supprimer donnerait
l'illusion qu'il n'a jamais existé.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Carte `pronote-ng-vie-scolaire`

**Files:**
- Create: `src/cards/vie-scolaire.ts`, `test/cards/vie-scolaire.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9, plus `formatDuration`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/vie-scolaire.ts`.

**Attributs consommés** : `sensor:absences` (`items` : `from_date`, `to_date`, `justified`, `reasons`, `hours`, `days`), `sensor:delays` (`items` : `date`, `justified`, `justification`, `reasons`, `minutes`), `sensor:punishments` (`items` : `nature`, `reasons`, `giver`, `schedule`, `exclusion`, `duration`), `sensor:unjustified_absences`, `binary_sensor:absence_in_progress`, `binary_sensor:punishment_upcoming`.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"vie_scolaire": {
  "name": "Vie scolaire",
  "empty": "Rien à signaler.",
  "absences": "Absences",
  "delays": "Retards",
  "punishments": "Punitions",
  "justified": "justifiée",
  "unjustified": "non justifiée",
  "in_progress": "Absence en cours",
  "upcoming": "Punition à venir",
  "sections": "Blocs affichés",
  "limit": "Nombre maximum par bloc"
}
```

- [ ] **Step 2: Écrire `test/cards/vie-scolaire.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/vie-scolaire';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const full = () =>
  makeHass([
    {
      key: 'sensor:absences',
      entity_id: 'sensor.abc_absences',
      device: 'dev_enfant',
      state: '1',
      attributes: {
        items: [
          { from_date: '2026-09-01', to_date: '2026-09-01', hours: 2, justified: false },
        ],
      },
    },
    {
      key: 'sensor:delays',
      entity_id: 'sensor.abc_retards',
      device: 'dev_enfant',
      state: '1',
      attributes: { items: [{ date: '2026-09-02', minutes: 10, justified: true }] },
    },
    {
      key: 'sensor:punishments',
      entity_id: 'sensor.abc_punitions',
      device: 'dev_enfant',
      state: '1',
      attributes: { items: [{ nature: 'Retenue', giver: 'M. Dupont', duration: 60 }] },
    },
  ]);

describe('carte vie-scolaire', () => {
  it('affiche absences, retards et punitions', async () => {
    const el = await mountCard(SPEC, {}, full());
    const t = cardText(el);
    expect(t).toContain('Absences');
    expect(t).toContain('non justifiée');
    expect(t).toContain('Retards');
    expect(t).toContain('Punitions');
    expect(t).toContain('Retenue');
  });

  it('signale une absence en cours', async () => {
    const hass = full();
    hass.entities['binary_sensor.abc_absence_en_cours'] = {
      entity_id: 'binary_sensor.abc_absence_en_cours',
      device_id: 'dev_enfant',
      labels: [],
      platform: 'pronote_ng',
      translation_key: 'absence_in_progress',
    };
    hass.states['binary_sensor.abc_absence_en_cours'] = {
      entity_id: 'binary_sensor.abc_absence_en_cours',
      state: 'on',
      attributes: {},
      last_changed: '2026-09-08T07:00:00+00:00',
      last_updated: '2026-09-08T07:00:00+00:00',
    };
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).toContain('Absence en cours');
  });

  it('dit « rien à signaler » quand toutes les listes sont vides', async () => {
    const hass = makeHass([
      {
        key: 'sensor:absences',
        entity_id: 'sensor.abc_absences',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(SPEC, {}, hass);
    const t = cardText(el);
    expect(t).toContain('Rien à signaler');
    expect(t).not.toContain('pas encore collectée');
  });

  it('dit « pas encore collectée » quand tout est indisponible', async () => {
    const hass = makeHass([
      {
        key: 'sensor:absences',
        entity_id: 'sensor.abc_absences',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand aucune clé n'existe", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('introuvable');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/vie-scolaire.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/vie-scolaire.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatDuration } from '../core/format';
import { chip, emptyState, listRow } from '../core/ui/parts';

type Section = 'absences' | 'delays' | 'punishments';

interface Config extends PronoteCardConfig {
  sections?: Section[];
  limit?: number;
  period?: number;
}

interface Absence {
  from_date?: string;
  to_date?: string;
  hours?: number;
  justified?: boolean;
}
interface Delay {
  date?: string;
  minutes?: number;
  justified?: boolean;
  reasons?: string[] | string;
}
interface Punishment {
  nature?: string;
  giver?: string;
  duration?: number;
  exclusion?: boolean;
}

const k = (c: Config, base: string): EntityKey =>
  (c.period === undefined ? `sensor:${base}` : `sensor:${base}_period`) as EntityKey;

const IN_PROGRESS: EntityKey = 'binary_sensor:absence_in_progress';
const UPCOMING: EntityKey = 'binary_sensor:punishment_upcoming';

const sectionsOf = (c: Config): Section[] =>
  c.sections && c.sections.length > 0 ? c.sections : ['absences', 'delays', 'punishments'];

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-vie-scolaire',
  name: 'Pronote NG — Vie scolaire',
  description: 'Absences, retards et punitions, avec leur détail.',
  scope: 'child',
  size: 6,
  stub: { sections: ['absences', 'delays', 'punishments'] },
  requires: () => [],
  requiresAny: (c) => [k(c, 'absences'), k(c, 'delays'), k(c, 'punishments')],
  optional: () => [IN_PROGRESS, UPCOMING],
  schema: () => [
    {
      name: 'sections',
      selector: {
        select: {
          multiple: true,
          options: [
            { value: 'absences', label: 'Absences' },
            { value: 'delays', label: 'Retards' },
            { value: 'punishments', label: 'Punitions' },
          ],
        },
      },
    },
    { name: 'limit', selector: { number: { min: 1, max: 50, mode: 'box' } } },
    { name: 'period', selector: { number: { min: 1, max: 6, mode: 'box' } } },
  ],
  render(ctx: RenderCtx<Config>) {
    const c = ctx.config;
    const wanted = sectionsOf(c);
    const limit = c.limit ?? 8;
    const out: TemplateResult[] = [];

    if (ctx.entity(IN_PROGRESS)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.in_progress')}</div>`);
    }
    if (ctx.entity(UPCOMING)?.state === 'on') {
      out.push(html`<div class="notice problem">${ctx.t('vie_scolaire.upcoming')}</div>`);
    }

    let rows = 0;

    if (wanted.includes('absences')) {
      const items = (ctx.attr<Absence[]>(k(c, 'absences'), 'items') ?? []).slice(-limit).reverse();
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.absences')}</div>`);
        for (const a of items) {
          rows++;
          out.push(
            listRow({
              primary: `${a.from_date ?? '—'} → ${a.to_date ?? '—'}`,
              secondary: a.hours !== undefined ? formatDuration(a.hours * 60) : undefined,
              trailing: chip(
                a.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                a.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('delays')) {
      const items = (ctx.attr<Delay[]>(k(c, 'delays'), 'items') ?? []).slice(-limit).reverse();
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.delays')}</div>`);
        for (const d of items) {
          rows++;
          out.push(
            listRow({
              primary: d.date ?? '—',
              secondary: d.minutes !== undefined ? formatDuration(d.minutes) : undefined,
              trailing: chip(
                d.justified ? ctx.t('vie_scolaire.justified') : ctx.t('vie_scolaire.unjustified'),
                d.justified ? 'neutral' : 'warn'
              ),
            })
          );
        }
      }
    }

    if (wanted.includes('punishments')) {
      const items = (ctx.attr<Punishment[]>(k(c, 'punishments'), 'items') ?? [])
        .slice(-limit)
        .reverse();
      if (items.length > 0) {
        out.push(html`<div class="title">${ctx.t('vie_scolaire.punishments')}</div>`);
        for (const p of items) {
          rows++;
          out.push(
            listRow({
              primary: p.nature ?? '—',
              secondary: p.giver ?? undefined,
              trailing: p.duration !== undefined ? formatDuration(p.duration) : undefined,
            })
          );
        }
      }
    }

    if (rows === 0) return emptyState(ctx.t('vie_scolaire.empty'));
    return html`${out}`;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as VIE_SCOLAIRE } from './cards/vie-scolaire';` et `defineCard(VIE_SCOLAIRE);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/vie-scolaire.ts src/index.ts src/localize/fr.json test/cards/vie-scolaire.test.ts
git commit -m "feat(carte): vie scolaire

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Carte `pronote-ng-eleve`

**Files:**
- Create: `src/cards/eleve.ts`, `test/cards/eleve.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/eleve.ts`. Première carte à consommer `ctx.deviceName` et une entité `image`.

**Attributs consommés** : `sensor:class_name` (état = nom de classe, attributs `grade`, `establishment`), `image:photo` (attribut `entity_picture`), `binary_sensor:school_day`, `binary_sensor:in_class`, `binary_sensor:holidays`, `sensor:next_lesson`, `sensor:current_period`.

**Règle** : le nom affiché vient de `ctx.deviceName`, jamais d'une chaîne du code. Le nom de l'établissement n'est affiché que si l'utilisateur active explicitement `show_establishment`, qui vaut `false` par défaut — une carte est une surface partageable.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"eleve": {
  "name": "Élève",
  "in_class": "En cours",
  "school_day": "Jour de classe",
  "holidays": "Vacances",
  "no_class": "Pas de cours aujourd'hui",
  "period": "Période : {period}",
  "next": "Prochain cours : {subject} à {time}",
  "show_photo": "Afficher la photo",
  "show_establishment": "Afficher l'établissement"
}
```

- [ ] **Step 2: Écrire `test/cards/eleve.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SPEC } from '../../src/cards/eleve';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const base = (attributes: Record<string, unknown> = {}, state = '4e B') =>
  makeHass([
    {
      key: 'sensor:class_name',
      entity_id: 'sensor.abc_classe',
      device: 'dev_enfant',
      state,
      attributes,
    },
  ]);

describe('carte eleve', () => {
  it("affiche le nom de l'appareil et la classe", async () => {
    const el = await mountCard(SPEC, {}, base());
    const t = cardText(el);
    expect(t).toContain('Enfant'); // nom de l'appareil dans la fixture
    expect(t).toContain('4e B');
  });

  it("n'affiche pas l'établissement par défaut", async () => {
    const el = await mountCard(SPEC, {}, base({ establishment: 'Établissement' }));
    expect(cardText(el)).not.toContain('Établissement');
  });

  it("affiche l'établissement uniquement si l'option est activée", async () => {
    const el = await mountCard(
      SPEC,
      { show_establishment: true },
      base({ establishment: 'Établissement' })
    );
    expect(cardText(el)).toContain('Établissement');
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const el = await mountCard(SPEC, {}, base({}, 'unavailable'));
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('sensor:class_name');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/eleve.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/eleve.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatTime } from '../core/format';
import { chip, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_photo?: boolean;
  /** Faux par défaut : une carte est une surface partageable. */
  show_establishment?: boolean;
}

const CLASS: EntityKey = 'sensor:class_name';
const PHOTO: EntityKey = 'image:photo';
const IN_CLASS: EntityKey = 'binary_sensor:in_class';
const SCHOOL_DAY: EntityKey = 'binary_sensor:school_day';
const HOLIDAYS: EntityKey = 'binary_sensor:holidays';
const NEXT: EntityKey = 'sensor:next_lesson';
const PERIOD: EntityKey = 'sensor:current_period';

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-eleve',
  name: 'Pronote NG — Élève',
  description: "En-tête de synthèse : classe, état du jour, prochain cours.",
  scope: 'child',
  size: 3,
  stub: { show_photo: true },
  requires: () => [CLASS],
  optional: (c) => [
    ...(c.show_photo ? [PHOTO] : []),
    IN_CLASS,
    SCHOOL_DAY,
    HOLIDAYS,
    NEXT,
    PERIOD,
  ],
  schema: () => [
    { name: 'show_photo', selector: { boolean: {} } },
    { name: 'show_establishment', selector: { boolean: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const rows: TemplateResult[] = [];

    // Le nom vient du registre d'appareils, jamais d'une chaîne du code.
    const secondary = ctx.config.show_establishment
      ? ctx.attr<string>(CLASS, 'establishment')
      : undefined;

    let tone: 'ok' | 'neutral' = 'neutral';
    let stateLabel = ctx.t('eleve.no_class');
    if (ctx.entity(HOLIDAYS)?.state === 'on') stateLabel = ctx.t('eleve.holidays');
    else if (ctx.entity(IN_CLASS)?.state === 'on') {
      stateLabel = ctx.t('eleve.in_class');
      tone = 'ok';
    } else if (ctx.entity(SCHOOL_DAY)?.state === 'on') stateLabel = ctx.t('eleve.school_day');

    rows.push(
      listRow({
        primary: ctx.deviceName,
        secondary: [ctx.entity(CLASS)?.state, secondary].filter(Boolean).join(' · '),
        trailing: chip(stateLabel, tone),
      })
    );

    if (ctx.status(NEXT) === 'ok') {
      rows.push(
        listRow({
          primary: ctx.t('eleve.next', {
            subject: ctx.attr<string>(NEXT, 'subject') ?? '—',
            time: formatTime(ctx.entity(NEXT)?.state, lang, tz),
          }),
        })
      );
    }

    if (ctx.status(PERIOD) === 'ok') {
      rows.push(
        listRow({
          primary: ctx.t('eleve.period', { period: ctx.entity(PERIOD)?.state ?? '—' }),
        })
      );
    }

    const picture =
      ctx.config.show_photo && ctx.status(PHOTO) === 'ok'
        ? ctx.attr<string>(PHOTO, 'entity_picture')
        : undefined;

    return html`
      ${picture
        ? html`<img
            src=${picture}
            alt=""
            style="width:64px;height:64px;border-radius:32px;object-fit:cover;float:left;margin-right:12px"
          />`
        : ''}
      ${rows}
    `;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as ELEVE } from './cards/eleve';` et `defineCard(ELEVE);`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/cards/eleve.ts src/index.ts src/localize/fr.json test/cards/eleve.test.ts
git commit -m "feat(carte): en-tête élève

Le nom vient du registre d'appareils. L'établissement n'est affiché
que sur demande explicite : une carte est une surface partageable.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: Carte `pronote-ng-limiteur`

**Files:**
- Create: `src/cards/limiteur.ts`, `test/cards/limiteur.test.ts`
- Modify: `src/index.ts`, `src/localize/fr.json`

**Interfaces:**
- Consumes: identiques à la tâche 9, plus `ctx.refresh` et `ctx.refreshCoolingDown`.
- Produces: `export const SPEC: CardSpec` depuis `src/cards/limiteur.ts`. **Seule carte `scope: 'account'`**, et seule carte appelant un service.

**Attributs consommés** : `sensor:limiter_state` (états `nominal`, `throttled`, `backoff`, `quiet_hours`, `credentials_hold`, `bootstrap_failed` ; attributs `until`, `reason`, `consecutive_failures`), `sensor:remaining_budget` (`daily_cap`, `hourly_remaining`, `tokens`), `sensor:calls_today` (`by_tier`, `logins`, `failed_logins`), `sensor:next_collection` (`tiers_due`), `sensor:last_collection` (`tier`, `duration_ms`, `calls`).

**Règle** : `session_id_hash` n'est **jamais** affiché. Un diagnostic lisible n'en a pas besoin, et une carte est une surface partageable.

- [ ] **Step 1: Chaînes dans `src/localize/fr.json`**

```json
"limiteur": {
  "name": "Limiteur",
  "state": "État",
  "state_nominal": "Nominal",
  "state_throttled": "Bridé",
  "state_backoff": "En retrait",
  "state_quiet_hours": "Heures calmes",
  "state_credentials_hold": "Identifiants en attente",
  "state_bootstrap_failed": "Démarrage en échec",
  "budget": "Budget restant",
  "budget_of": "sur {cap}",
  "calls_today": "Appels depuis minuit",
  "by_tier": "Par palier",
  "tiers_due": "Paliers en attente",
  "none": "aucun",
  "last_collection": "Dernière collecte",
  "next_collection": "Prochaine collecte",
  "until": "jusqu'à {time}",
  "show_refresh": "Afficher le bouton de rafraîchissement",
  "refresh_tier": "Palier à prioriser",
  "refresh_note": "Ne déclenche aucun appel : relève une priorité, dans la limite du budget."
}
```

- [ ] **Step 2: Écrire `test/cards/limiteur.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { SPEC } from '../../src/cards/limiteur';
import { makeHass } from '../fixtures/hass';
import { cardText, mountCard } from '../fixtures/mount';

const compte = (key: string, entity_id: string, state: string, attributes = {}) =>
  ({ key, entity_id, device: 'dev_compte' as const, state, attributes });

describe('carte limiteur', () => {
  it("résout les entités de compte depuis le device_id de l'enfant", async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal')]);
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).toContain('Nominal');
  });

  it('affiche budget, appels par palier et paliers en attente', async () => {
    const hass = makeHass([
      compte('sensor:limiter_state', 'sensor.cpt_etat', 'throttled', { reason: 'quota' }),
      compte('sensor:remaining_budget', 'sensor.cpt_budget', '120', { daily_cap: 400 }),
      compte('sensor:calls_today', 'sensor.cpt_appels', '280', {
        by_tier: { timetable: 100, marks: 80 },
      }),
      compte('sensor:next_collection', 'sensor.cpt_prochaine', '2026-09-08T09:00:00+02:00', {
        tiers_due: ['marks'],
      }),
    ]);
    const el = await mountCard(SPEC, {}, hass);
    const t = cardText(el);
    expect(t).toContain('Bridé');
    expect(t).toContain('120');
    expect(t).toContain('400');
    expect(t).toContain('timetable');
    expect(t).toContain('marks');
  });

  it("n'affiche jamais l'empreinte de session", async () => {
    const hass = makeHass([
      compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal'),
      compte('sensor:session_age', 'sensor.cpt_age', '3600', {
        session_id_hash: 'abc123',
        opened_at: '2026-09-08T06:00:00+02:00',
      }),
    ]);
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).not.toContain('abc123');
  });

  it('appelle pronote_ng.refresh sur clic et non au montage', async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'nominal')]);
    const spy = vi.fn().mockResolvedValue(undefined);
    hass.callService = spy;
    const el = await mountCard(SPEC, { show_refresh: true }, hass);
    expect(spy).not.toHaveBeenCalled();
    (el.shadowRoot?.querySelector('button') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalledWith('pronote_ng', 'refresh', {}, { device_id: 'dev_enfant' });
  });

  it('dit « pas encore collectée » quand l’entité est indisponible', async () => {
    const hass = makeHass([compte('sensor:limiter_state', 'sensor.cpt_etat', 'unavailable')]);
    const el = await mountCard(SPEC, {}, hass);
    expect(cardText(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand l'entité manque", async () => {
    const el = await mountCard(SPEC, {}, makeHass([]));
    expect(cardText(el)).toContain('sensor:limiter_state');
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run test/cards/limiteur.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 4: Écrire `src/cards/limiteur.ts`**

```ts
import { html, type TemplateResult } from 'lit';
import type { CardSpec, EntityKey, PronoteCardConfig, RenderCtx } from '../core/types';
import { formatRelative, formatTime } from '../core/format';
import { chip, listRow } from '../core/ui/parts';

interface Config extends PronoteCardConfig {
  show_refresh?: boolean;
  refresh_tier?: string;
}

const STATE: EntityKey = 'sensor:limiter_state';
const BUDGET: EntityKey = 'sensor:remaining_budget';
const CALLS: EntityKey = 'sensor:calls_today';
const NEXT: EntityKey = 'sensor:next_collection';
const LAST: EntityKey = 'sensor:last_collection';

const TONES: Record<string, 'ok' | 'warn' | 'problem'> = {
  nominal: 'ok',
  throttled: 'warn',
  quiet_hours: 'warn',
  backoff: 'problem',
  credentials_hold: 'problem',
  bootstrap_failed: 'problem',
};

export const SPEC: CardSpec<Config> = {
  type: 'pronote-ng-limiteur',
  name: 'Pronote NG — Limiteur',
  description: "Budget d'appels, état du limiteur et prochaine collecte.",
  // Les entités de diagnostic sont sur l'appareil de compte. Le socle suit
  // via_device_id : l'utilisateur configure quand même l'appareil de l'enfant.
  scope: 'account',
  size: 5,
  requires: () => [STATE],
  optional: () => [BUDGET, CALLS, NEXT, LAST],
  schema: () => [
    { name: 'show_refresh', selector: { boolean: {} } },
    { name: 'refresh_tier', selector: { text: {} } },
  ],
  render(ctx: RenderCtx<Config>) {
    const lang = ctx.hass.language;
    const tz = ctx.hass.locale.time_zone;
    const out: TemplateResult[] = [];

    const state = ctx.entity(STATE)?.state ?? 'nominal';
    const until = ctx.attr<string>(STATE, 'until');
    out.push(
      listRow({
        primary: ctx.t('limiteur.state'),
        secondary: until ? ctx.t('limiteur.until', { time: formatTime(until, lang, tz) }) : undefined,
        trailing: chip(ctx.t(`limiteur.state_${state}`), TONES[state] ?? 'neutral'),
      })
    );

    if (ctx.status(BUDGET) === 'ok') {
      const cap = ctx.attr<number>(BUDGET, 'daily_cap');
      out.push(
        listRow({
          primary: ctx.t('limiteur.budget'),
          secondary: cap !== undefined ? ctx.t('limiteur.budget_of', { cap }) : undefined,
          trailing: ctx.entity(BUDGET)?.state,
        })
      );
    }

    if (ctx.status(CALLS) === 'ok') {
      out.push(
        listRow({ primary: ctx.t('limiteur.calls_today'), trailing: ctx.entity(CALLS)?.state })
      );
      const byTier = ctx.attr<Record<string, number>>(CALLS, 'by_tier') ?? {};
      const tiers = Object.entries(byTier);
      if (tiers.length > 0) {
        out.push(html`<div class="title">${ctx.t('limiteur.by_tier')}</div>`);
        for (const [tier, n] of tiers) {
          out.push(listRow({ primary: tier, trailing: String(n) }));
        }
      }
    }

    if (ctx.status(LAST) === 'ok') {
      out.push(
        listRow({
          primary: ctx.t('limiteur.last_collection'),
          secondary: ctx.attr<string>(LAST, 'tier'),
          trailing: formatRelative(ctx.entity(LAST)?.state, lang),
        })
      );
    }

    if (ctx.status(NEXT) === 'ok') {
      const due = ctx.attr<string[]>(NEXT, 'tiers_due') ?? [];
      out.push(
        listRow({
          primary: ctx.t('limiteur.next_collection'),
          secondary: due.length > 0 ? due.join(', ') : ctx.t('limiteur.none'),
          trailing: formatRelative(ctx.entity(NEXT)?.state, lang),
        })
      );
    }

    if (ctx.config.show_refresh) {
      // Un boost est plafonné à un par palier et par intervalle : le bouton se
      // grise après appel, parce qu'une interface qui laisse cliquer sans
      // effet est une interface qui ment.
      out.push(html`
        <div class="row">
          <button
            ?disabled=${ctx.refreshCoolingDown}
            @click=${() => ctx.refresh(ctx.config.refresh_tier)}
          >
            ${ctx.refreshCoolingDown ? ctx.t('common.refresh_pending') : ctx.t('common.refresh')}
          </button>
        </div>
        <div class="notice">${ctx.t('limiteur.refresh_note')}</div>
      `);
    }

    return html`${out}`;
  },
};
```

- [ ] **Step 5: Enregistrer dans `src/index.ts`**

Ajouter `import { SPEC as LIMITEUR } from './cards/limiteur';` et `defineCard(LIMITEUR);`. `src/index.ts` compte alors huit `defineCard`.

- [ ] **Step 6: Lancer la suite complète**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: tout passe, huit cartes enregistrées.

- [ ] **Step 7: Commit**

```bash
git add src/cards/limiteur.ts src/index.ts src/localize/fr.json test/cards/limiteur.test.ts
git commit -m "feat(carte): limiteur, sur l'appareil de compte

Le socle suit via_device_id : l'utilisateur configure l'appareil de
l'enfant comme pour les sept autres cartes. L'empreinte de session
n'est jamais affichée, et le bouton de rafraîchissement se grise
pour la durée de l'intervalle.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: HACS et intégration continue

**Files:**
- Create: `hacs.json`, `.github/workflows/validate.yml`, `.github/workflows/hacs.yml`, `.github/workflows/release.yml`, `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/feature_request.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `CONTRIBUTING.md`
- Modify: aucun

**Interfaces:**
- Consumes: les scripts npm de la tâche 1.
- Produces: un artefact `pronote-ng-cards.js` attaché à chaque *release*, qui est ce que HACS installe.

- [ ] **Step 1: Écrire `hacs.json`**

```json
{
  "name": "Pronote NG — Cartes",
  "render_readme": true,
  "homeassistant": "2026.8.0",
  "filename": "pronote-ng-cards.js"
}
```

`filename` doit correspondre exactement au nom produit par `vite.config.ts` et attaché à la *release*.

- [ ] **Step 2: Écrire `.github/workflows/validate.yml`**

```yaml
name: Validation

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: pronote-ng-cards
          path: dist/pronote-ng-cards.js
```

- [ ] **Step 3: Écrire `.github/workflows/hacs.yml`**

```yaml
name: HACS

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 4 * * 1'

jobs:
  hacs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hacs/action@main
        with:
          category: plugin
```

Pas de `hassfest` : c'est un greffon, pas une intégration.

- [ ] **Step 4: Écrire `.github/workflows/release.yml`**

```yaml
name: Publication

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/pronote-ng-cards.js
          generate_release_notes: true
```

- [ ] **Step 5: Écrire les modèles GitHub**

Reprendre `../ha-pronote/.github/ISSUE_TEMPLATE/bug_report.yml`, `feature_request.yml`, `config.yml` et `PULL_REQUEST_TEMPLATE.md`, ainsi que `CONTRIBUTING.md`, et les adapter : le sujet est une carte, pas une entité. **Retirer** de `bug_report.yml` tout champ demandant des journaux susceptibles de contenir des identifiants, et ajouter dans le modèle la phrase :

> Ne collez jamais l'URL iCal, le bloc d'identité, ni de journaux du module `pronotepy` : ils contiennent des identifiants.

- [ ] **Step 6: Vérifier la syntaxe YAML**

Run: `npx --yes yaml-lint .github/workflows/*.yml hacs.json 2>/dev/null || node -e "const y=require('fs').readdirSync('.github/workflows');console.log(y.join(' '))"`
Expected: les cinq fichiers listés, sans erreur de syntaxe. Si `yaml-lint` n'est pas disponible, ouvrir chaque fichier et vérifier l'indentation à la main.

- [ ] **Step 7: Commit**

```bash
git add hacs.json .github CONTRIBUTING.md
git commit -m "chore: HACS, intégration continue et modèles GitHub

Le bundle est attaché aux releases plutôt que committé. Le modèle
de rapport de bogue interdit explicitement de coller l'URL iCal,
l'identité ou des journaux pronotepy.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: Documentation

**Files:**
- Create: `README.md`, `mkdocs.yml`, `docs/index.md`, `docs/installation.md`, `docs/cartes/*.md` (huit fichiers), `docs/limites.md`, `requirements_docs.txt`, `.github/workflows/docs.yml`
- Modify: aucun

**Interfaces:**
- Consumes: les huit `CardSpec` (pour la liste d'options de chaque page).
- Produces: le site publié sur `fiveelements.github.io/ha-pronote-ng-cards/`.

- [ ] **Step 1: Écrire `mkdocs.yml`**

```yaml
site_name: Pronote NG — Cartes
site_url: https://fiveelements.github.io/ha-pronote-ng-cards/
repo_url: https://github.com/FiveElements/ha-pronote-ng-cards
theme:
  name: material
  language: fr
  palette:
    - scheme: default
      toggle: { icon: material/brightness-7, name: Mode sombre }
    - scheme: slate
      toggle: { icon: material/brightness-4, name: Mode clair }
exclude_docs: |
  superpowers/
nav:
  - Accueil: index.md
  - Installation: installation.md
  - Cartes:
      - Élève: cartes/eleve.md
      - Prochain cours: cartes/prochain-cours.md
      - Emploi du temps: cartes/emploi-du-temps.md
      - Devoirs: cartes/devoirs.md
      - Notes: cartes/notes.md
      - Cantine: cartes/menu.md
      - Vie scolaire: cartes/vie-scolaire.md
      - Limiteur: cartes/limiteur.md
  - Ce que ces cartes ne feront jamais: limites.md
```

`exclude_docs` retire `docs/superpowers/` du site : la conception et le plan restent dans le dépôt, hors de la documentation publiée.

- [ ] **Step 2: Écrire `requirements_docs.txt`**

```
mkdocs-material>=9.5
```

- [ ] **Step 3: Écrire `docs/limites.md`**

Cette page existe pour que la contrainte survive à ses auteurs. Contenu obligatoire :

```markdown
# Ce que ces cartes ne feront jamais

## L'URL iCal, l'identité et le PDF d'emploi du temps

L'intégration expose ces trois données par des services à réponse, et
non par des entités. Ce n'est pas un oubli : c'est la raison d'être de
ce choix.

L'URL iCal donne accès à l'emploi du temps complet d'un élève **sans
aucun identifiant**. Quiconque l'obtient l'a pour de bon. Elle se traite
comme un mot de passe.

Une carte est une surface partageable par construction : une capture
d'écran, un partage d'écran en visioconférence, un tableau de bord
ouvert sur une tablette de cuisine, une photo envoyée pour demander de
l'aide. Aucune de ces trois données n'y a sa place.

Le socle de cette bibliothèque ne donne aux cartes aucun moyen
d'appeler ces services : ils sont absents du type qui décrit ce qu'une
carte peut faire, et deux tests automatiques échouent si leur nom
réapparaît dans le code ou la documentation.

**Cette page est la réponse aux demandes de carte « emploi du temps
PDF » ou « fiche élève complète ». La réponse est non, et elle ne
dépend pas de qui demande.**

## Le journaliseur pronotepy

Ne l'activez jamais. Au niveau `DEBUG`, il écrit l'hexadécimal de chaque
requête, identifiants compris. Pour déboguer, activez uniquement :

```yaml
logger:
  logs:
    custom_components.pronote_ng: debug
```

## Le déclenchement de collectes

Aucune carte ne provoque de collecte en s'affichant. Le serveur PRONOTE
sanctionne l'adresse IP, et tout le budget de requêtes est géré par un
limiteur côté intégration.

La carte « limiteur » propose un bouton qui appelle `pronote_ng.refresh`.
Ce service ne place aucun appel : il relève une priorité auprès de
l'ordonnanceur. Un boost est plafonné à un par palier et par intervalle,
et le bouton se grise en conséquence — cliquer plus n'obtient pas plus.
```

- [ ] **Step 4: Écrire `docs/installation.md`**

Installation par HACS en dépôt personnalisé : HACS → menu → Dépôts personnalisés → URL `https://github.com/FiveElements/ha-pronote-ng-cards`, catégorie **Lovelace/greffon** → installer → recharger. Puis : ajouter une carte, chercher « Pronote NG », choisir l'enfant dans le sélecteur d'appareil.

Préciser explicitement : **toutes les cartes se configurent avec l'appareil de l'enfant**, y compris la carte « limiteur », qui remonte seule à l'appareil de compte.

- [ ] **Step 5: Écrire les huit pages de `docs/cartes/`**

Une page par carte, même structure :

1. À quoi elle sert, en deux phrases.
2. Le YAML minimal :

```yaml
type: custom:pronote-ng-prochain-cours
device_id: <identifiant de l'appareil de l'enfant>
```

3. Un tableau des options, repris du `schema` de la carte.
4. Les entités qu'elle consomme, en clés qualifiées (`sensor:next_lesson`), avec la mention du palier de collecte correspondant — c'est ce qui permet à l'utilisateur de comprendre pourquoi une carte reste vide.
5. La section « si la carte est vide » : rappeler que l'éditeur affiche le diagnostic de résolution.

**Aucune capture d'écran contenant une donnée réelle.** Si des captures sont ajoutées, elles doivent provenir d'une instance de démonstration aux valeurs synthétiques.

- [ ] **Step 6: Écrire `README.md`**

En français. Titre, une phrase de description, la liste des huit cartes, l'installation HACS en trois lignes, un lien vers la documentation, un lien vers `docs/limites.md`, et la licence. `render_readme: true` dans `hacs.json` fait que c'est ce fichier que HACS affiche.

**Attention à l'encodage.** Le `README.md` d'amorçage du dépôt (commit `9f182d2`) est en **UTF-16LE avec BOM et fins de ligne CRLF** — l'écriture par défaut d'une redirection PowerShell. HACS et GitHub le rendraient en charabia. Écrire le nouveau fichier en **UTF-8 sans BOM**, puis vérifier :

```bash
file README.md   # doit dire « UTF-8 Unicode text », jamais « UTF-16 »
```

Sous PowerShell, ne pas employer `>` ni `Out-File` sans `-Encoding utf8NoBOM` ; l'outil d'écriture de fichiers de l'agent produit de l'UTF-8 et convient.

- [ ] **Step 7: Écrire `.github/workflows/docs.yml`**

```yaml
name: Documentation

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements_docs.txt
      - run: mkdocs build --strict
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 8: Vérifier**

Run: `npx vitest run test/guards.test.ts`
Expected: les gardes passent sur la documentation nouvellement écrite. `docs/limites.md` mentionne `pronotepy` — la garde n'interdit que la **recommandation** (`pronotepy: debug`, `logger … pronotepy`), pas la mention. Si la garde échoue sur cette page, c'est la garde qu'il faut préciser, en documentant pourquoi dans le message de commit.

- [ ] **Step 9: Commit**

```bash
git add README.md mkdocs.yml docs requirements_docs.txt .github/workflows/docs.yml
git commit -m "docs: site MkDocs, une page par carte, page des limites

La page « ce que ces cartes ne feront jamais » existe pour que la
contrainte survive à ses auteurs : la prochaine personne qui
proposera une carte « emploi du temps PDF » doit trouver la réponse
avant d'écrire le code.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Après la tâche 18

- Faire relire l'ensemble avec `superpowers:requesting-code-review`.
- **Le premier `git push` et la première *release* sont des actions sortantes** : les faire valider par le propriétaire, séparément. Le dépôt distant `FiveElements/ha-pronote-ng-cards` existe déjà, public et vide.
- Vérifier sur une instance réelle avant de poser un tag : installer le `dist/` construit comme ressource de tableau de bord, ajouter les huit cartes, confirmer que la résolution par `translation_key` fonctionne sur des identifiants d'entités réels — c'est la seule hypothèse du projet qui n'a pas encore été éprouvée hors des tests.
