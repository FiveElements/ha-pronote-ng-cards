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

// Le contenu publié couvert par les gardes ci-dessous : code, tests, docs et
// gabarits GitHub. `superpowers/` est exclu — c'est le plan et la spécification
// eux-mêmes, qui nomment légitimement les interdits pour les interdire.
const published = () =>
  read([
    ...walk('src', ['.ts', '.json']),
    ...walk('docs', ['.md']),
    ...walk('.github', ['.yml', '.md']),
  ]).filter(([f]) => !f.includes('superpowers'));

describe("garde : aucun identifiant d'entité en dur", () => {
  // Un identifiant réel, pas la clé qualifiée 'sensor:next_lesson' (deux-points).
  const HARDCODED =
    /\b(sensor|binary_sensor|calendar|todo|button|event|image)\.[a-z0-9_]{2,}/;

  /**
   * Les deux appels de service autorisés ont la forme `domaine.service`, que la
   * règle ci-dessus ne sait pas distinguer d'un identifiant d'entité. Ce sont
   * pourtant deux choses opposées : un identifiant d'entité varie d'une
   * installation à l'autre — c'est tout l'objet de cette garde — alors qu'un nom
   * de service est fixe et fait partie du contrat de Home Assistant.
   *
   * On les retire donc du texte avant de chercher, plutôt que de contorsionner
   * le code appelant pour esquiver la règle : une garde qui force à écrire
   * `'todo.' + 'update_item'` ne protège plus rien, elle déplace le problème là
   * où plus personne ne le lit. La liste reste volontairement fermée et
   * identique à `AllowedCall` (src/core/types.ts) : tout autre couple
   * `domaine.service` continue d'être signalé.
   */
  const ALLOWED_CALLS = ['todo.update_item', 'pronote_ng.refresh'];
  const withoutAllowedCalls = (body: string): string =>
    ALLOWED_CALLS.reduce((acc, call) => acc.split(call).join(''), body);

  it('src/ ne contient aucun identifiant complet', () => {
    for (const [file, body] of read(walk('src', ['.ts', '.json']))) {
      const hit = withoutAllowedCalls(body).match(HARDCODED);
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

  it('.github/ n’en mentionne aucun (gabarits d’issues, workflows)', () => {
    for (const [file, body] of read(walk('.github', ['.yml', '.md']))) {
      for (const f of FORBIDDEN) {
        expect(body.includes(f), `${file} mentionne ${f}`).toBe(false);
      }
    }
  });
});

describe('garde : le journaliseur pronotepy n’est jamais recommandé', () => {
  it("aucun fichier publié ne propose d'activer pronotepy en debug", () => {
    for (const [file, body] of published()) {
      expect(/pronotepy\s*:\s*debug/i.test(body), file).toBe(false);
      expect(/logger.*pronotepy/i.test(body), file).toBe(false);
    }
  });
});

describe('garde : src/ ne dépend d’aucun module Node natif', () => {
  // import … from 'node:xxx', import 'node:xxx' (effet de bord),
  // require('node:xxx'). tsconfig.json élargit "types" à ["…", "node"]
  // pour que test/guards.test.ts (qui lit l'arborescence) type
  // node:fs/node:path — cet élargissement ne vaut que pour les tests :
  // il ne doit jamais rendre compilable une carte qui s'exécute dans un
  // navigateur, pas dans Node.
  const NODE_IMPORT = /(?:\bfrom\s+|\bimport\s+|\brequire\(\s*)['"]node:[a-z0-9/_-]+['"]/;

  it("aucun fichier de src/ n'importe un module node:", () => {
    for (const [file, body] of read(walk('src', ['.ts', '.json']))) {
      const hit = body.match(NODE_IMPORT);
      expect(
        hit,
        `${file} importe « ${hit?.[0]} » : src/ part dans un navigateur, ` +
          `pas dans Node. L'élargissement de "types" à "node" dans ` +
          `tsconfig.json n'est justifié que par les tests, jamais par le ` +
          `code de carte.`
      ).toBeNull();
    }
  });
});

describe('garde : aucune donnée réelle', () => {
  // Liste blanche délibérée : élargir ici, jamais en affaiblissant la garde.
  const ALLOWED_HOSTS = new Set([
    'github.com',
    'fiveelements.github.io',
    'www.home-assistant.io',
    'developers.home-assistant.io',
    'hacs.xyz',
  ]);

  it('toutes les URL citées pointent vers un hôte autorisé', () => {
    const files = read([
      ...walk('src', ['.ts', '.json']),
      ...walk('test', ['.ts']),
      ...walk('docs', ['.md']),
      ...walk('.github', ['.yml', '.md']),
    ]).filter(([f]) => !f.includes('superpowers'));
    for (const [file, body] of files) {
      // Une adresse d'instance réelle (nom d'établissement, sous-domaine
      // interne) n'a rien à faire ici : chaque hôte cité doit figurer dans
      // la liste blanche ci-dessus.
      for (const match of body.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
        const host = match[1] ?? '';
        expect(ALLOWED_HOSTS.has(host), `${file} cite l'hôte ${host}`).toBe(true);
      }
    }
  });
});
