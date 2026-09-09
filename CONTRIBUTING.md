# Contribuer à Pronote NG — Cartes

Merci de l'intérêt. Ce document dit comment travailler sur ce dépôt, et
pourquoi certaines règles sont plus strictes qu'ailleurs : les cartes que ce
dépôt distribue affichent des données qui proviennent d'un compte scolaire
d'enfant, même si le code lui-même ne manipule aucun identifiant.

Le dépôt s'appelle `ha-pronote-ng-cards` et distribue par HACS un greffon
Lovelace pour l'intégration sœur **Pronote NG** (dépôt `ha-pronote-ng`,
domaine Home Assistant `pronote_ng`).

---

## 1. Les règles non négociables

### 1.1 Jamais un identifiant d'entité en dur

`src/` ne code en dur aucun identifiant d'entité — une carte résout les
siennes à partir d'un `device_id` par `translation_key` qualifié (voir
`src/core/resolve.ts`). Un exemple, dans le code, un test ou la
documentation, s'écrit `sensor.<enfant>_prochain_cours`, jamais un
identifiant complet plausible.

### 1.2 Jamais de collecte depuis une carte

Une carte lit `hass.states`, `hass.entities` et `hass.devices` pour se
résoudre et s'afficher — elle ne déclenche jamais de collecte PRONOTE en
s'affichant. Le type qui décrit ce qu'une carte peut faire n'autorise que
deux appels de service, et aucun autre ne compile :

- `pronote_ng.refresh`, et seulement sur action explicite de l'utilisateur
  — un bouton « Rafraîchir », jamais au montage ni au rendu. Il ne place
  aucune requête PRONOTE : il relève une priorité auprès de l'ordonnanceur.
- `todo.update_item`, qui coche un devoir sur une entité `todo` de Home
  Assistant — sans rapport avec le limiteur ni avec une collecte.

Un test de garde échoue en plus si un couple domaine/service hors de cette
liste apparaît dans `src/`. Tout le reste des actions de l'intégration se
règle côté intégration, pas ici.

### 1.3 Jamais de donnée réelle, jamais le journaliseur `pronotepy`

Aucune *pull request* ne peut contenir un nom d'élève, un nom
d'établissement, une URL d'instance Home Assistant ou un identifiant réels —
ni dans le code, ni dans un test, ni dans une capture d'écran, ni dans un
message de commit. Les valeurs synthétiques imposées sont
`demo.example.invalid` pour une instance et `<enfant>` pour un enfant.

Une **URL iCal** et le **bloc d'identité** de l'intégration sœur méritent une
mention à part : la première donne accès à l'emploi du temps complet d'un
élève sans aucune authentification, le second regroupe des identifiants — on
les traite comme un mot de passe, et aucun exemple de ce dépôt n'en affiche.
Le journaliseur du module `pronotepy` écrit, lui, l'hexadécimal de chaque
requête au niveau DEBUG, identifiants compris : ce dépôt ne le recommande
**jamais**, dans sa documentation comme dans ses gabarits d'issue. Si un
renseignement de diagnostic est utile, il ne nomme que
`custom_components.pronote_ng`.

---

## 2. Mettre en place l'environnement

Node **22 ou plus récent** (voir `.nvmrc`).

```bash
npm install
```

---

## 3. Les portails

Ce sont exactement ceux que la CI applique
(`.github/workflows/validate.yml`). Faites-les passer avant d'ouvrir une PR :
ils échouent plus vite chez vous que dans un *runner*.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` produit `dist/pronote-ng-cards.js`. Ce fichier n'est **jamais
committé** — `dist/` est dans `.gitignore` — c'est le workflow de
publication qui le construit et l'attache à chaque *release*, et c'est ce
fichier, et lui seul, que `hacs.json` déclare et que HACS installe.

---

## 4. Écrire une carte

Chaque carte est un fichier `src/cards/<nom>.ts` qui déclare un `CardSpec` :
ses clés d'entité requises (qualifiées par domaine, par exemple
`sensor:next_lesson`), son schéma d'éditeur, et sa fonction `render()`. Le
socle partagé (`src/core/`) se charge de la résolution d'entité et impose la
discipline des trois états qu'une carte doit distinguer :

| État | Signification | Affichage |
| --- | --- | --- |
| Entité absente | rien au registre pour cette clé sur cet appareil | invite à vérifier les options de l'intégration |
| Indisponible | l'entité existe, son état n'est pas encore collecté | message neutre, transitoire |
| Vide | l'entité a un état, la donnée elle-même est vide | le vide est l'information ; message propre à la carte |

Le détail est dans
`docs/superpowers/specs/2026-09-08-cartes-pronote-ng-design.md`.

---

## 5. Rédaction

Toute chaîne visible par l'utilisateur — libellé de carte, message d'erreur,
description d'option — vit dans `src/localize/fr.json`, jamais écrite en dur
dans un gabarit Lit, et s'écrit en français. Le code, les noms de symboles et
les `translation_key` restent en anglais.

---

## 6. Ouvrir une pull request

1. Une branche par sujet, depuis `main`.
2. Les portails de la section 3 au vert **en local**.
3. Un message de commit qui dit ce qui change **et pourquoi**. Si vous
   corrigez un bug, décrivez le symptôme qu'un utilisateur voyait sur sa
   carte ; c'est ce qui permet à quelqu'un de juger si votre correction est
   la bonne.
4. Les workflows `Validation` et `HACS` au vert sur la PR.

---

## 7. Publier une version

Réservé aux mainteneurs.

1. Fusionner sur `main`, workflows au vert.
2. `git tag -a vX.Y.Z && git push origin vX.Y.Z`.

Le workflow `Publication` construit `dist/pronote-ng-cards.js` et l'attache à
la *release* créée pour le tag.

---

## 8. Signaler un problème

Utilisez les formulaires d'issue : ils demandent exactement ce qu'il faut et,
surtout, ils rappellent ce qu'il ne faut **pas** coller — en particulier
l'URL iCal, le bloc d'identité et tout journal du module `pronotepy`, qui
contiennent des identifiants.

---

## 9. Où lire la suite

Le tout est publié sur <https://fiveelements.github.io/ha-pronote-ng-cards/>.

**Deux documents de contributeur ne sont pas sur le site**, délibérément — ils
sont destinés à qui implémente ou relit une carte, non à qui l'installe :

| Document | Contenu |
| --- | --- |
| [`spec/parite-ancien-format.md`](spec/parite-ancien-format.md) | 89 exigences : la parité avec les huit cartes de `lovelace-pronote`, et ce que le nouveau format publie que l'ancien ne pouvait pas connaître. Chaque exigence porte sa raison et une marque de provenance — `mesuré`, `catalogue`, `fonctionnel`, `décision`, `bloqué`. |
| [`test/fixtures/FORMES.md`](test/fixtures/FORMES.md) | Les formes d'attributs telles qu'une instance les publie, avec la mention explicite de ce qui n'a **pas** pu être vérifié. |

Ils vivent hors de `docs/` et non dans `exclude_docs`, pour qu'aucune
manipulation de la configuration mkdocs ne les publie par accident.

Sous licence [MIT](LICENSE).
