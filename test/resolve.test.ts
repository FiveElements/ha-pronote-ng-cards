import { describe, expect, it } from 'vitest';
import { createResolveCache, isChildDevice, resolveDevice, resolveEntities } from '../src/core/resolve';
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

  it('ne sait pas distinguer deux entités qui partagent domaine et clé', () => {
    // L'intégration crée une entité par période close, toutes avec le même
    // translation_key sur le même appareil. La résolution en rend une, sans
    // moyen de choisir laquelle — c'est pourquoi aucune carte n'expose
    // d'option de période (spec §4.1).
    const hass = makeHass([
      enfant('sensor:grades_period', 'sensor.abc_notes_p1'),
      enfant('sensor:grades_period', 'sensor.abc_notes_p2'),
    ]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:grades_period']);
    expect(['sensor.abc_notes_p1', 'sensor.abc_notes_p2']).toContain(
      r.get('sensor:grades_period')
    );
  });

  it("ignore la surcharge quand son domaine ne correspond pas à celui de la clé — un identifiant d'un autre domaine n'est plus accepté sans un mot", () => {
    const hass = makeHass([]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'todo.mauvais_domaine',
    });
    expect(r.has('sensor:next_lesson')).toBe(false);
  });

  it('accepte la surcharge quand son domaine correspond bien à celui de la clé', () => {
    const hass = makeHass([]);
    const r = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], {
      'sensor:next_lesson': 'sensor.surcharge',
    });
    expect(r.get('sensor:next_lesson')).toBe('sensor.surcharge');
  });
});

describe('createResolveCache', () => {
  it('mémoïse le résultat tant que le registre, l’appareil, la surcharge et les clés ne changent pas', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const cache = createResolveCache();
    const r1 = cache.resolve(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], undefined);
    const r2 = cache.resolve(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], undefined);
    expect(r2).toBe(r1);
  });

  it('recalcule quand le registre change d’identité (hass.entities ou hass.devices)', () => {
    const hass1 = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const hass2 = makeHass([enfant('sensor:next_lesson', 'sensor.autre_id')]);
    const cache = createResolveCache();
    const r1 = cache.resolve(hass1, 'dev_enfant', 'child', ['sensor:next_lesson'], undefined);
    const r2 = cache.resolve(hass2, 'dev_enfant', 'child', ['sensor:next_lesson'], undefined);
    expect(r2).not.toBe(r1);
    expect(r2.get('sensor:next_lesson')).toBe('sensor.autre_id');
  });

  it('recalcule quand les clés demandées changent, même avec le même registre', () => {
    const hass = makeHass([enfant('sensor:next_lesson', 'sensor.abc_prochain_cours')]);
    const cache = createResolveCache();
    const r1 = cache.resolve(hass, 'dev_enfant', 'child', ['sensor:next_lesson'], undefined);
    const r2 = cache.resolve(hass, 'dev_enfant', 'child', [], undefined);
    expect(r2).not.toBe(r1);
    expect(r2.size).toBe(0);
  });
});

/**
 * La correspondance est une EGALITE STRICTE, et c'est une contrainte.
 *
 * L'integration publie un second jeu de capteurs pour chaque periode close,
 * sous des cles suffixees : `grades_period`, `report_card_period`,
 * `evaluations_period`... Une carte de la periode courante demande `grades`,
 * et ne doit jamais tomber sur `grades_period`.
 *
 * Ce n'etait pas garanti a priori. Une correspondance par prefixe -- ou un
 * `startsWith`, ou un `includes` poses pour faire passer autre chose --
 * suffirait a casser la propriete, et le SUFFIXE la casserait en silence : la
 * carte notes afficherait les notes du premier trimestre, sans erreur, sans
 * vide, sans le moindre signe. Des donnees plausibles et perimees, ce qui est
 * le pire mode de defaillance de ce depot.
 *
 * Les formes divergent en plus d'un onglet a l'autre : sur une periode close,
 * la moyenne generale perd son bareme, le bulletin perd trois cles et les
 * evaluations perdent `date` ET `acquisitions` -- donc tout leur contenu. Une
 * carte liee par accident a une periode close ne se contenterait pas d'etre
 * perimee, elle serait aussi partiellement vide.
 *
 * Aucune periode n'etait close sur l'instance de reference au moment d'ecrire
 * ceci -- l'annee venait de commencer -- donc ces entites n'existaient pas
 * encore. Ce test est la pour le jour ou elles apparaitront, quand plus
 * personne ne se souviendra que la question s'est posee.
 */
describe('garde : une carte ne se lie jamais a une periode close', () => {
  /**
   * Les huit cles de periode close, relevees dans `_HISTORY_EXTRACTORS`
   * (`sensor.py`), avec la cle de periode courante qu'elles ne doivent pas
   * capturer. Les cinq premieres partagent la forme de la periode courante ;
   * les trois dernieres ont une forme differente, ce qui rend la confusion
   * plus grave encore.
   */
  const PAIRES: readonly (readonly [string, string])[] = [
    ['grades', 'grades_period'],
    ['averages', 'averages_period'],
    ['absences', 'absences_period'],
    ['delays', 'delays_period'],
    ['punishments', 'punishments_period'],
    ['overall_average', 'overall_average_period'],
    ['report_card', 'report_card_period'],
    ['evaluations', 'evaluations_period'],
  ];

  it.each(PAIRES)(
    'sensor:%s ne capture pas %s, meme quand la periode close est inscrite en premier',
    (courante, close) => {
      // La periode close EN PREMIER dans le registre : `resolveEntities` rend
      // la premiere correspondance, donc une correspondance laxiste
      // attraperait celle-ci. Inscrire la courante d'abord ferait passer le
      // test sans rien prouver.
      const hass = makeHass([
        enfant(`sensor:${close}`, `sensor.abc_${close}_t1`),
        enfant(`sensor:${courante}`, `sensor.abc_${courante}`),
      ]);

      const out = resolveEntities(hass, 'dev_enfant', 'child', [`sensor:${courante}`]);

      // Assertion positive : la cle se resout bel et bien. Sans elle, le test
      // passerait aussi si la resolution etait entierement cassee.
      expect(out.get(`sensor:${courante}`)).toBe(`sensor.abc_${courante}`);
      expect(out.get(`sensor:${courante}`)).not.toBe(`sensor.abc_${close}_t1`);
    }
  );

  it('ne resout pas une cle de periode courante quand SEULE la periode close existe', () => {
    // Le cas qui distingue une egalite d'une correspondance laxiste : sans
    // entite de periode courante, une carte doit tomber en « entite absente »
    // et le dire, jamais se rabattre sur un trimestre ferme.
    const hass = makeHass([enfant('sensor:grades_period', 'sensor.abc_notes_t1')]);

    const out = resolveEntities(hass, 'dev_enfant', 'child', ['sensor:grades']);

    expect(out.has('sensor:grades')).toBe(false);
    // Et la preuve que l'entite etait bien la, donc que l'absence vient de la
    // comparaison et non d'un registre vide.
    expect(
      resolveEntities(hass, 'dev_enfant', 'child', ['sensor:grades_period']).get('sensor:grades_period')
    ).toBe('sensor.abc_notes_t1');
  });
});
