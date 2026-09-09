import { describe, expect, it } from 'vitest';
import { subjectColor } from '../src/core/subject-color';

/**
 * La couleur de matière est la seule valeur de ce dépôt qui vienne du serveur
 * PRONOTE et finisse dans un attribut `style`. Elle est donc traitée comme une
 * entrée hostile : ces tests décrivent d'abord ce qui est REFUSÉ, parce que
 * c'est là qu'est le risque, et la liste des refus vaut plus que la liste des
 * acceptations.
 */
describe('subjectColor', () => {
  describe('accepte l’hexadécimal strict', () => {
    it('accepte six chiffres', () => {
      expect(subjectColor('#1e88e5')).toBe('#1e88e5');
    });

    it('accepte trois chiffres', () => {
      expect(subjectColor('#f80')).toBe('#f80');
    });

    it('accepte les majuscules sans les reformuler', () => {
      // On rend la valeur telle quelle : normaliser la casse ferait de cette
      // fonction un formateur, alors qu'elle n'est qu'un filtre.
      expect(subjectColor('#AABBCC')).toBe('#AABBCC');
    });

    it('tolère les espaces autour, que le serveur pose parfois', () => {
      expect(subjectColor('  #1e88e5  ')).toBe('#1e88e5');
    });
  });

  describe('refuse tout le reste', () => {
    it('refuse un nom de couleur CSS', () => {
      // Valide en CSS, mais hors du contrat : accepter les noms ouvrirait la
      // porte à tout ce que CSS appelle une couleur, y compris les fonctions.
      expect(subjectColor('red')).toBeUndefined();
    });

    it('refuse une fonction CSS', () => {
      expect(subjectColor('rgb(30, 136, 229)')).toBeUndefined();
      expect(subjectColor('color-mix(in srgb, red, blue)')).toBeUndefined();
    });

    it('refuse un hexadécimal de longueur non conforme', () => {
      expect(subjectColor('#12')).toBeUndefined();
      expect(subjectColor('#12345')).toBeUndefined();
      expect(subjectColor('#1234567')).toBeUndefined();
    });

    it('refuse un hexadécimal sans dièse', () => {
      expect(subjectColor('1e88e5')).toBeUndefined();
    });

    it('refuse une injection de propriété par point-virgule', () => {
      // Le cas qui justifie toute cette fonction : la valeur est interpolée
      // dans un attribut `style`. Un point-virgule y ajouterait une propriété
      // arbitraire — `position: fixed`, un fond, un `content` — donc une
      // possibilité de recouvrir la page depuis une donnée de serveur.
      expect(subjectColor('#fff; position: fixed; inset: 0')).toBeUndefined();
      expect(subjectColor('#fff;background:url(https://demo.example.invalid/p.gif)')).toBeUndefined();
    });

    it('refuse une URL et un pseudo-protocole', () => {
      expect(subjectColor('url(https://demo.example.invalid/p.gif)')).toBeUndefined();
      expect(subjectColor('javascript:alert(1)')).toBeUndefined();
    });

    it('refuse le vide et l’absence', () => {
      expect(subjectColor(undefined)).toBeUndefined();
      expect(subjectColor(null)).toBeUndefined();
      expect(subjectColor('')).toBeUndefined();
      expect(subjectColor('   ')).toBeUndefined();
      expect(subjectColor('#')).toBeUndefined();
    });

    it('refuse ce qui n’est pas une chaîne', () => {
      // L'intégration publie ce champ tel que le serveur l'envoie : rien ne
      // garantit son type côté carte.
      expect(subjectColor(0x1e88e5)).toBeUndefined();
      expect(subjectColor(['#fff'])).toBeUndefined();
      expect(subjectColor({ hex: '#fff' })).toBeUndefined();
      expect(subjectColor(true)).toBeUndefined();
    });
  });
});
