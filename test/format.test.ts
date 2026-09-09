import { describe, expect, it } from 'vitest';
import {
  formatDayLabel,
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

describe('formatDayLabel', () => {
  it('rend un libellé de jour dans le fuseau demandé', () => {
    // Chaîne relevée en exécutant le formateur (ICU Node) plutôt que devinée.
    expect(formatDayLabel('2026-09-08T08:30:00+02:00', 'fr', TZ)).toBe('mardi 8 septembre');
  });
  it('rend une chaîne vide pour une date absente', () => {
    expect(formatDayLabel(undefined, 'fr', TZ)).toBe('');
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
  it('dérive le mot « maintenant » de la langue plutôt que de le figer en français', () => {
    // Chaîne relevée en exécutant Intl.RelativeTimeFormat('it', ...) plutôt que devinée.
    expect(formatRelative('2026-09-08T08:00:30+02:00', 'it', now)).toBe('ora');
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
  it('formate une note reçue comme chaîne (état hass) comme un nombre', () => {
    expect(formatGrade('14.5', 20)).toBe('14,5/20');
  });
  it('rend un tiret pour l’état hass "unknown"', () => {
    expect(formatGrade('unknown', 20)).toBe('—');
  });
  it('rend un tiret pour l’état hass "unavailable"', () => {
    expect(formatGrade('unavailable', 20)).toBe('—');
  });
  it('laisse passer une note textuelle non numérique telle quelle', () => {
    expect(formatGrade('Absent', 20)).toBe('Absent/20');
  });

  describe('language', () => {
    it('respecte la langue demandée', () => {
      expect(formatGrade(14.5, 20, 'it')).toBe('14,5/20');
      expect(formatGrade(14.5, 20, 'pt')).toBe('14,5/20');
      expect(formatGrade(14.5, 20, 'es')).toBe('14,5/20');
    });
    it("retombe sur 'fr' quand la langue n'est pas fournie — ne casse pas les appelants existants", () => {
      expect(formatGrade(14.5, 20)).toBe(formatGrade(14.5, 20, 'fr'));
    });
  });
});

describe('formatDuration', () => {
  it('ne rend rien sur un NaN, plutôt que « NaN h NaN »', () => {
    // `NaN < 0` et `NaN < 60` sont tous deux faux : sans garde-fou explicite,
    // un NaN traversait les deux tests et ressortait affiché sur la carte.
    expect(formatDuration(Number.NaN)).toBe('');
    expect(formatDuration(Number('2h00') * 60)).toBe('');
  });

  it('rend les minutes sous l’heure', () => {
    expect(formatDuration(45)).toBe('45 min');
  });
  it('rend heures et minutes au-delà', () => {
    expect(formatDuration(135)).toBe('2 h 15');
  });
  it('rend les heures rondes sans minutes', () => {
    expect(formatDuration(120)).toBe('2 h');
  });

  describe('language', () => {
    // Chaînes relevées en exécutant Intl.NumberFormat(langue, { style: 'unit', unitDisplay: 'short' })
    // (voir node -e dans le rapport de correctifs) plutôt que devinées : fr,
    // it, pt et es rendent tous la même abréviation d'heure et de minute en
    // affichage court.
    it("respecte la langue demandée pour les minutes", () => {
      expect(formatDuration(45, 'it')).toBe('45 min');
      expect(formatDuration(45, 'pt')).toBe('45 min');
      expect(formatDuration(45, 'es')).toBe('45 min');
    });
    it('respecte la langue demandée pour heures et minutes combinées', () => {
      expect(formatDuration(135, 'it')).toBe('2 h 15');
      expect(formatDuration(135, 'pt')).toBe('2 h 15');
      expect(formatDuration(135, 'es')).toBe('2 h 15');
    });
    it("retombe sur 'fr' quand la langue n'est pas fournie — ne casse pas les appelants existants", () => {
      expect(formatDuration(45)).toBe(formatDuration(45, 'fr'));
      expect(formatDuration(135)).toBe(formatDuration(135, 'fr'));
    });
  });
});
