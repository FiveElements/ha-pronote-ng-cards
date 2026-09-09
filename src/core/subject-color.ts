/**
 * La couleur qu'un établissement associe à une matière.
 *
 * PRONOTE publie une couleur par matière — `CouleurFond` sur les créneaux et
 * les devoirs, `couleur` sur les moyennes par matière. C'est un code visuel que
 * l'élève connaît déjà de l'interface officielle, et le reprendre coûte moins
 * cher en attention que n'importe quelle légende.
 *
 * ## Pourquoi cette fonction existe
 *
 * C'est la **seule** valeur de ce dépôt qui vienne du serveur PRONOTE et
 * atteigne un attribut `style`. Tout le reste de ce que le serveur écrit
 * (matière, salle, motif d'annulation, énoncé de devoir) est du texte, et Lit
 * échappe le texte : il ne peut pas s'échapper de son nœud. Une couleur, non —
 * elle devient de la CSS, et la CSS interpolée est un vecteur : un
 * point-virgule dans la valeur ajoute une propriété arbitraire à la règle.
 * `#fff; position: fixed; inset: 0` recouvrirait la page depuis une donnée de
 * serveur.
 *
 * D'où le contrat : **hexadécimal strict, ou rien.** Pas de noms CSS, pas de
 * `rgb()`, pas de `color-mix()`. Ces formes sont légitimes en CSS et refusées
 * quand même, parce qu'accepter une famille de syntaxes revient à accepter
 * l'analyseur CSS entier comme frontière de confiance. Une expression
 * régulière qui n'admet que `#` suivi de trois ou six chiffres hexadécimaux
 * est une frontière qu'on peut lire en entier.
 *
 * Refuser n'a aucun coût d'affichage : sans couleur exploitable, la carte rend
 * exactement ce qu'elle rendait avant. C'est la propriété qui permet d'être
 * aussi strict — le pire cas est une ligne sans accent de couleur.
 *
 * ## Ce que la fonction ne fait pas
 *
 * Elle ne normalise pas la casse et ne développe pas la forme courte : ce
 * serait en faire un formateur alors qu'elle n'est qu'un filtre, et une valeur
 * rendue telle quelle se retrouve à l'identique dans le DOM inspecté, ce qui
 * facilite le diagnostic.
 *
 * Elle ne juge pas non plus le CONTRASTE. Les couleurs PRONOTE sont choisies
 * pour le fond blanc de l'interface officielle : un bleu nuit posé sur un
 * thème sombre de Home Assistant est presque invisible. C'est pourquoi les
 * cartes ne s'en servent que comme **accent** — une bordure, jamais un fond ni
 * une couleur de texte. Un accent invisible perd une information secondaire ;
 * un fond mal contrasté rendrait la ligne illisible.
 */

/**
 * `#` suivi de trois ou six chiffres hexadécimaux, et rien d'autre.
 *
 * Les ancres `^` et `$` sont ce qui fait le travail : sans elles,
 * `#fff; position: fixed` correspondrait par son préfixe.
 *
 * Les formes à quatre et huit chiffres (avec canal alpha) sont volontairement
 * hors du contrat : le serveur ne les envoie pas, et une transparence sur un
 * accent de couleur ne servirait qu'à le rendre moins lisible.
 */
const STRICT_HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * La couleur si elle est exploitable, `undefined` sinon.
 *
 * Le paramètre est `unknown` par honnêteté : un attribut d'entité Home
 * Assistant n'est typé nulle part, et ce champ arrive tel que le serveur l'a
 * écrit. Un `string | undefined` mentirait sur ce qu'on reçoit.
 */
export function subjectColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return STRICT_HEX.test(trimmed) ? trimmed : undefined;
}
