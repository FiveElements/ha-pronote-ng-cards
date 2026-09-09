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
  const deltaMs = d.getTime() - now.getTime();
  // Un écart de 30 s arrondirait à 1 min : le seuil « sous la minute » doit
  // donc porter sur le delta brut en millisecondes, pas sur deltaMin arrondi.
  if (Math.abs(deltaMs) < 60000) return relativeNow();
  const deltaMin = Math.round(deltaMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'always', style: 'short' });
  if (Math.abs(deltaMin) < 60) return normalize(rtf.format(deltaMin, 'minute'));
  const deltaH = Math.round(deltaMin / 60);
  if (Math.abs(deltaH) < 24) return normalize(rtf.format(deltaH, 'hour'));
  return normalize(rtf.format(Math.round(deltaH / 24), 'day'));

  /**
   * « maintenant » localisé : seul le cas « sous la minute » n'a pas de forme
   * relative naturelle avec `numeric: 'always'` (qui rendrait « dans 0 min »).
   * On délègue à `numeric: 'auto'` sur un delta nul, qui rend le mot propre à
   * chaque langue (« maintenant », « ora », « ahora », « agora »).
   */
  function relativeNow(): string {
    return new Intl.RelativeTimeFormat(language, { numeric: 'auto' }).format(0, 'second');
  }
}

/**
 * Intl rend « dans 30 min. » selon la version d'ICU (point final variable) et
 * insère une espace insécable entre le nombre et l'unité (« dans 2 h ») ; on
 * uniformise vers une espace normale et on retire le point final pour une
 * sortie stable entre versions d'ICU.
 */
function normalize(s: string): string {
  return s
    .replace(/[  ]/g, ' ')
    .replace(/\.$/, '')
    .trim();
}

/**
 * `language` est optionnel, replié sur 'fr', pour ne pas casser les
 * appelants existants (les cartes ne le passent pas encore — voir le
 * rapport de correctifs pour la liste des sites à migrer).
 */
export function formatGrade(
  grade: number | string | undefined,
  outOf: number | string | undefined,
  language = 'fr'
): string {
  if (grade === undefined || grade === null || grade === '' || ABSENT.has(String(grade))) {
    return '—';
  }
  const g = formatGradeValue(grade, language);
  if (outOf === undefined || outOf === null || outOf === '') return g;
  return `${g}/${outOf}`;
}

/**
 * Une note reçue en `number` vient d'un appelant déjà typé ; une note reçue en
 * `string` vient toujours d'un état hass (`entity.state`), qui est toujours
 * une chaîne. Une chaîne numérique ("14.5") se formate donc comme un nombre ;
 * une chaîne non numérique (note textuelle PRONOTE : "Absent", "Non noté")
 * est rendue telle quelle.
 */
function formatGradeValue(grade: number | string, language: string): string {
  if (typeof grade === 'number') return grade.toLocaleString(language);
  const n = Number(grade);
  return grade.trim() !== '' && !Number.isNaN(n) ? n.toLocaleString(language) : grade;
}

/**
 * Les unités viennent d'`Intl.NumberFormat` (`style: 'unit'`, affichage
 * court : « 45 min », « 2 h »), jamais d'un catalogue — vérifié à
 * l'exécution pour fr/it/pt/es, qui rendent tous la même abréviation
 * d'heure et de minute en affichage court. `language` est optionnel,
 * replié sur 'fr', pour ne pas casser les appelants existants.
 *
 * `normalize` (déjà utilisé par `formatRelative`) uniformise l'espace
 * insécable qu'ICU insère entre le nombre et l'unité (U+202F, une espace
 * fine insécable, distincte d'une espace normale bien qu'indiscernable
 * à l'œil) : sans elle, le rendu varie selon la version d'ICU du moteur.
 */
export function formatDuration(minutes: number | undefined, language = 'fr'): string {
  // `NaN < 0` et `NaN < 60` sont tous deux faux : sans ce garde-fou, un NaN
  // traversait les deux tests et ressortait en « NaN h NaN » sur la carte.
  // C'est arrivé en production, sur une durée d'absence que PRONOTE écrit en
  // toutes lettres (« 2h00 ») et qu'un appelant multipliait par 60.
  if (minutes === undefined || !Number.isFinite(minutes) || minutes < 0) return '';
  if (minutes < 60) {
    return normalize(
      new Intl.NumberFormat(language, {
        style: 'unit',
        unit: 'minute',
        unitDisplay: 'short',
      }).format(minutes)
    );
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hourPart = normalize(
    new Intl.NumberFormat(language, { style: 'unit', unit: 'hour', unitDisplay: 'short' }).format(h)
  );
  return m === 0 ? hourPart : `${hourPart} ${String(m).padStart(2, '0')}`;
}
