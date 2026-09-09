import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC } from '../../src/cards/notes';
import { makeHass } from '../fixtures/hass';
import { mountCard, text, type MountableElement } from '../fixtures/mount';

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-notes': HTMLElement & MountableElement;
  }
}

beforeAll(() => {
  defineCard(SPEC);
});

const grades = [
  // `value`, `student` : les noms que l'integration publie reellement
  // (`_grade_dict`, `_average_dict`). Les anciennes fixtures ecrivaient
  // `grade` et `average`, qui n'existent pas — et la carte, qui les lisait,
  // affichait donc « — » a la place de chaque note sur une vraie instance.
  { subject: 'Maths', value: 14.5, out_of: 20, coefficient: 2, date: '2026-09-05' },
  { subject: 'Anglais', value: 12, out_of: 20, coefficient: 1, date: '2026-09-06' },
];

const base = () =>
  makeHass([
    {
      key: 'sensor:overall_average',
      entity_id: 'sensor.abc_moyenne_generale',
      device: 'dev_enfant',
      // Home Assistant publie `str(13.5)` côté Python : un point, jamais une
      // virgule. Une fixture en virgule ferait passer `Number(...)` par NaN
      // et laisserait `formatGrade` rendre la chaîne telle quelle — le test
      // serait vert sans jamais exercer la conversion vers le séparateur
      // localisé.
      state: '13.5',
      attributes: { out_of: 20 },
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
        items: [{ subject: 'Maths', student: 14.2, class_average: 12.1, out_of: 20 }],
      },
    },
  ]);

describe('carte notes', () => {
  it('affiche la moyenne générale, les dernières notes et les moyennes par matière', async () => {
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['average', 'latest', 'subjects'] },
      base()
    );
    const t = text(el);
    expect(t).toContain('13,5');
    expect(t).toContain('Maths');
    expect(t).toContain('14,5/20');
    expect(t).toContain('12,1');
  });

  it('affiche les moyennes par matière même si la liste des dernières notes est vide', async () => {
    // Régression : un retour anticipé dans le bloc « dernières notes »
    // sortait de `render` avant le bloc « par matière » et jetait les
    // moyennes déjà résolues (sensor:averages) au profit du message vide.
    const hass = makeHass([
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
      {
        key: 'sensor:averages',
        entity_id: 'sensor.abc_moyennes',
        device: 'dev_enfant',
        state: '1',
        attributes: {
          items: [{ subject: 'Maths', student: 14.2, class_average: 12.1, out_of: 20 }],
        },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest', 'subjects'] },
      hass
    );
    const t = text(el);
    expect(t).toContain('Maths');
    expect(t).toContain('14,2');
    expect(t).not.toContain('Aucune note');
  });

  it("dit « aucune moyenne » sur une carte limitée à la section « par matière »", async () => {
    const hass = makeHass([
      {
        key: 'sensor:averages',
        entity_id: 'sensor.abc_moyennes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['subjects'] },
      hass
    );
    expect(text(el)).toContain('Aucune moyenne');
  });

  it.each([
    ['un objet', {}],
    ['une chaîne', 'x'],
    ['un tableau à trous', [null]],
  ])(
    'ignore un attribut `items` qui est %s plutôt qu’un tableau, sans faire disparaître la carte',
    async (_label, malformed) => {
      const hass = makeHass([
        {
          key: 'sensor:grades',
          entity_id: 'sensor.abc_notes',
          device: 'dev_enfant',
          state: '1',
          attributes: { items: malformed },
        },
      ]);
      const el = await mountCard(
        'pronote-ng-notes',
        { device_id: 'dev_enfant', sections: ['latest'] },
        hass
      );
      // Ni exception (qui effacerait la carte), ni écran vide muet : le
      // message « aucune note » reste affiché.
      expect(text(el)).toContain('Aucune note');
    }
  );

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
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    expect(text(el)).toContain('Absent');
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
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    const t = text(el);
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
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    expect(text(el)).toContain('pas encore collectée');
  });

  it("dit « introuvable » quand aucune des clés requiresAny n'existe", async () => {
    const el = await mountCard('pronote-ng-notes', { device_id: 'dev_enfant' }, makeHass([]));
    expect(text(el)).toContain('introuvable');
  });

  it("n'expose aucune option de période", () => {
    // La résolution ne sait pas distinguer deux périodes closes (spec §4.1).
    // Ce test échoue si quelqu'un réintroduit l'option sans traiter le fond.
    expect(SPEC.schema({ type: 'x' }).map((f) => f.name)).not.toContain('period');
  });

  it('affiche la période en cours quand elle est résolue', async () => {
    const hass = makeHass([
      {
        key: 'sensor:overall_average',
        entity_id: 'sensor.abc_moyenne_generale',
        device: 'dev_enfant',
        state: '13.5',
        attributes: { out_of: 20 },
      },
      {
        key: 'sensor:current_period',
        entity_id: 'sensor.abc_periode',
        device: 'dev_enfant',
        state: 'Trimestre 1',
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['average'] },
      hass
    );
    const t = text(el);
    expect(t).toContain('Trimestre 1');
    expect(t).toContain('13,5');
  });

  it("ne montre rien pour la période quand `sensor:current_period` est indisponible", async () => {
    // La spec (§5.1) est explicite : la période devient *indisponible*
    // plutôt que fausse quand l'intégration ne peut pas la déterminer —
    // aucun repli ne doit se glisser à sa place.
    const hass = makeHass([
      {
        key: 'sensor:overall_average',
        entity_id: 'sensor.abc_moyenne_generale',
        device: 'dev_enfant',
        state: '13.5',
        attributes: { out_of: 20 },
      },
      {
        key: 'sensor:current_period',
        entity_id: 'sensor.abc_periode',
        device: 'dev_enfant',
        state: 'unavailable',
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['average'] },
      hass
    );
    const t = text(el);
    expect(t).not.toContain('Période');
    // Assertion positive : le reste de la carte s'affiche normalement.
    expect(t).toContain('13,5');
  });

  it('affiche le bulletin quand la section est explicitement choisie', async () => {
    const hass = makeHass([
      // `sensor:report_card` est optionnelle : au moins une des clés
      // `requiresAny` doit être résolue pour que la carte rende quoi que ce
      // soit, bulletin compris.
      {
        key: 'sensor:overall_average',
        entity_id: 'sensor.abc_moyenne_generale',
        device: 'dev_enfant',
        state: '13.5',
        attributes: { out_of: 20 },
      },
      {
        key: 'sensor:report_card',
        entity_id: 'sensor.abc_bulletin',
        device: 'dev_enfant',
        // L'état vaut le nombre de matières du bulletin.
        state: '2',
        // Forme confirmée sur `_report_attributes` : c'est `subjects[]` qui
        // porte les moyennes, et `comments` l'appréciation générale.
        attributes: {
          period: 'Trimestre 1',
          comments: ['Trimestre satisfaisant.'],
          subjects: [
            {
              name: 'Mathématiques',
              student_average: 14.5,
              class_average: 12.1,
              coefficient: 2,
              comments: ['Des progrès à confirmer.'],
            },
            { name: 'Anglais', student_average: 16 },
          ],
        },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['report_card'] },
      hass
    );
    const t = text(el);
    expect(t).toContain('Bulletin');
    // Les matières et leurs moyennes, et non le seul état du capteur — la
    // carte se contentait de ce dernier faute de connaître la forme.
    expect(t).toContain('Mathématiques');
    expect(t).toContain('14,5');
    expect(t).toContain('Anglais');
    expect(t).toContain('16');
    // L'appréciation générale et celle du professeur, telles qu'écrites.
    expect(t).toContain('Trimestre satisfaisant.');
    expect(t).toContain('Des progrès à confirmer.');
  });

  it('ne montre pas le bulletin dans les sections par défaut', async () => {
    const hass = makeHass([
      {
        key: 'sensor:overall_average',
        entity_id: 'sensor.abc_moyenne_generale',
        device: 'dev_enfant',
        state: '13.5',
        attributes: { out_of: 20 },
      },
      {
        key: 'sensor:report_card',
        entity_id: 'sensor.abc_bulletin',
        device: 'dev_enfant',
        state: 'Publié',
      },
    ]);
    // Aucune section précisée : `sectionsOf` retombe sur les trois valeurs
    // par défaut, qui n'incluent pas le bulletin.
    const el = await mountCard('pronote-ng-notes', { device_id: 'dev_enfant' }, hass);
    const t = text(el);
    expect(t).not.toContain('Bulletin');
    // Assertion positive : les sections par défaut restent bien rendues.
    expect(t).toContain('13,5');
  });

  it('nomme la ligne du motif « Dernière note » quand la matière est absente', async () => {
    // Régression : cette ligne retombait sur `notes.name` (« Notes »), le nom
    // de la carte — un libellé trompeur plutôt qu'un motif de note.
    const hass = makeHass([
      {
        key: 'sensor:latest_grade',
        entity_id: 'sensor.abc_derniere_note',
        device: 'dev_enfant',
        state: 'unknown',
        attributes: { status: 'Non rendu' },
      },
      {
        key: 'sensor:grades',
        entity_id: 'sensor.abc_notes',
        device: 'dev_enfant',
        state: '0',
        attributes: { items: [] },
      },
    ]);
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['latest'] },
      hass
    );
    const t = text(el);
    expect(t).toContain('Dernière note');
    expect(t).toContain('Non rendu');
  });
});
