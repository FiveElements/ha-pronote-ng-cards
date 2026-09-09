import { beforeAll, describe, expect, it } from 'vitest';
import { defineCard } from '../../src/core/registry';
import { SPEC as EDT } from '../../src/cards/emploi-du-temps';
import { SPEC as DEVOIRS } from '../../src/cards/devoirs';
import { SPEC as NOTES } from '../../src/cards/notes';
import { makeHass } from '../fixtures/hass';
import { mountCard } from '../fixtures/mount';

/**
 * Le code couleur des matières, sur les trois familles qui en portent un.
 *
 * Ce fichier est transverse plutôt que rangé par carte, parce que la propriété
 * testée est transverse : la même couleur de matière doit se lire de la même
 * façon sur l'emploi du temps, les devoirs et les moyennes. Trois tests
 * dispersés dans trois fichiers auraient laissé la divergence passer.
 *
 * **Les couleurs de ces fixtures sont inventées**, comme toutes les valeurs du
 * dépôt. Un établissement réel choisit les siennes.
 *
 * Ce que ces tests ne peuvent pas vérifier : que l'intégration publie
 * réellement `background_color`. Elle décode le champ sur les quatre chemins
 * de sa passerelle et ne l'expose sur aucune entité au moment où ces tests
 * sont écrits (voir `test/fixtures/NON-RENDU.md`, niveau 3). Les cartes lisent
 * donc un champ qui n'arrive pas encore — d'où le test « sans couleur », qui
 * est aujourd'hui le cas réel de toute installation.
 */

declare global {
  interface HTMLElementTagNameMap {
    'pronote-ng-emploi-du-temps': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
    'pronote-ng-devoirs': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
    'pronote-ng-notes': HTMLElement & {
      setConfig(c: unknown): void;
      hass: unknown;
      readonly updateComplete: Promise<unknown>;
    };
  }
}

beforeAll(() => {
  defineCard(EDT);
  defineCard(DEVOIRS);
  defineCard(NOTES);
});

/** Les gouttières colorées d'une carte, dans l'ordre du rendu. */
const accents = (el: HTMLElement): (string | null)[] =>
  [...(el.shadowRoot?.querySelectorAll('.row.accented') ?? [])].map((row) =>
    row instanceof HTMLElement
      ? (row.style.getPropertyValue('--pronote-subject-color').trim() || null)
      : null
  );

/** Le nombre de lignes qui ne réservent PAS de gouttière. */
const plainRows = (el: HTMLElement): number =>
  el.shadowRoot?.querySelectorAll('.row:not(.accented)').length ?? 0;

/** Un `hass` portant les seuls cours du jour. */
const withLessons = (lessons: unknown[]) =>
  makeHass([
    {
      key: 'sensor:lessons_today',
      entity_id: 'sensor.abc_cours_du_jour',
      device: 'dev_enfant',
      state: String(lessons.length),
      attributes: { lessons },
    },
  ]);

describe('code couleur des matières — emploi du temps', () => {
  it('reprend la couleur de chaque créneau', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', range: 'today' },
      withLessons([
        {
          subject: 'Maths',
          start: '2026-09-08T08:00:00+02:00',
          end: '2026-09-08T09:00:00+02:00',
          background_color: '#1e88e5',
        },
        {
          subject: 'Histoire',
          start: '2026-09-08T09:00:00+02:00',
          end: '2026-09-08T10:00:00+02:00',
          background_color: '#43a047',
        },
      ])
    );

    // Positif ET dans l'ordre : une assertion sur le seul nombre de
    // gouttières passerait même si les deux couleurs étaient échangées.
    expect(accents(el)).toEqual(['#1e88e5', '#43a047']);
  });

  it('réserve la gouttière sans la colorer quand le créneau n’a pas de couleur', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', range: 'today' },
      withLessons([
        {
          subject: 'Maths',
          start: '2026-09-08T08:00:00+02:00',
          end: '2026-09-08T09:00:00+02:00',
          background_color: '#1e88e5',
        },
        {
          subject: 'Permanence',
          start: '2026-09-08T09:00:00+02:00',
          end: '2026-09-08T10:00:00+02:00',
        },
      ])
    );

    // La propriété qui compte : les deux lignes portent la classe, donc le
    // même retrait. Une gouttière absente sur la seconde décalerait le texte
    // de trois pixels — ce qu'on lit comme un défaut d'affichage et non comme
    // une matière sans couleur.
    expect(accents(el)).toEqual(['#1e88e5', null]);
    expect(plainRows(el)).toBe(0);
  });

  it('ignore une couleur que le serveur n’a pas écrite en hexadécimal', async () => {
    const el = await mountCard(
      'pronote-ng-emploi-du-temps',
      { device_id: 'dev_enfant', range: 'today' },
      withLessons([
        {
          subject: 'Maths',
          start: '2026-09-08T08:00:00+02:00',
          end: '2026-09-08T09:00:00+02:00',
          // Une injection par point-virgule : la valeur est interpolée dans
          // un attribut `style`, et sans filtre elle ajouterait une propriété
          // CSS arbitraire à la règle de la ligne.
          background_color: '#fff; position: fixed; inset: 0',
        },
      ])
    );

    expect(accents(el)).toEqual([null]);
    // Et la ligne s'affiche quand même : refuser la couleur ne coûte rien
    // d'autre que la couleur.
    expect(el.shadowRoot?.textContent).toContain('Maths');
  });
});

describe('code couleur des matières — devoirs', () => {
  it('reprend la couleur de chaque devoir', async () => {
    const el = await mountCard(
      'pronote-ng-devoirs',
      { device_id: 'dev_enfant', filter: 'todo' },
      makeHass([
        {
          key: 'sensor:homework_todo',
          entity_id: 'sensor.abc_devoirs_a_faire',
          device: 'dev_enfant',
          state: '2',
          attributes: {
            items: [
              {
                subject: 'Maths',
                description_text: 'Exercices 3 à 7',
                due: '2026-09-10T00:00:00+02:00',
                background_color: '#1e88e5',
              },
              {
                subject: 'Histoire',
                description_text: 'Lire le chapitre 2',
                due: '2026-09-11T00:00:00+02:00',
              },
            ],
          },
        },
      ])
    );

    expect(accents(el)).toEqual(['#1e88e5', null]);
    expect(el.shadowRoot?.textContent).toContain('Exercices 3 à 7');
  });
});

describe('code couleur des matières — moyennes par matière', () => {
  it('colore les moyennes et laisse les autres lignes alignées', async () => {
    const el = await mountCard(
      'pronote-ng-notes',
      { device_id: 'dev_enfant', sections: ['average', 'subjects'] },
      makeHass([
        {
          key: 'sensor:overall_average',
          entity_id: 'sensor.abc_moyenne_generale',
          device: 'dev_enfant',
          state: '13.5',
          attributes: { out_of: 20 },
        },
        {
          key: 'sensor:averages',
          entity_id: 'sensor.abc_moyennes',
          device: 'dev_enfant',
          state: '2',
          attributes: {
            items: [
              { subject: 'Maths', student: 14.2, out_of: 20, background_color: '#1e88e5' },
              { subject: 'Histoire', student: 12, out_of: 20 },
            ],
          },
        },
      ])
    );

    // La ligne « Élève » d'abord — elle ne porte pas de matière et n'a donc
    // pas de couleur, mais elle réserve la gouttière : sans intertitre entre
    // les deux sections, un retrait différent se verrait immédiatement.
    expect(accents(el)).toEqual([null, '#1e88e5', null]);
    expect(plainRows(el)).toBe(0);
    expect(el.shadowRoot?.textContent).toContain('14,2');
  });
});
