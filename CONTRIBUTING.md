# Contribuer à Carnet scolaire — Cartes

Merci de l'intérêt. Ce document dit comment travailler sur ce dépôt, et
pourquoi certaines règles sont plus strictes qu'ailleurs : les cartes que ce
dépôt distribue affichent des données qui proviennent d'un compte scolaire
d'enfant, même si le code lui-même ne manipule aucun identifiant.

Le dépôt s'appelle `ha-carnet-scolaire-cards` et distribue par HACS un greffon
Lovelace pour l'intégration sœur **Carnet scolaire** (dépôt `ha-carnet-scolaire`,
domaine Home Assistant `carnet_scolaire`).

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

- `carnet_scolaire.refresh`, et seulement sur action explicite de l'utilisateur
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
`custom_components.carnet_scolaire`.

---

## 2. Mettre en place l'environnement

### 2.1 Node et dépendances

Node **22 ou plus récent** (voir `.nvmrc`).

```bash
npm install
```

### 2.2 `graft`, l'index de code (facultatif)

Le dépôt est indexé par [graft](https://github.com/trailhq/Graft) (licence MIT,
publié sur npm sous `@nanonets/graft`) : un graphe du code en fiches markdown,
une par fichier, qui nomment le `fichier:ligne` de chaque symbole et les arêtes
« qui appelle quoi ».

```bash
npm install -g @nanonets/graft
graft build          # construit graft/ à partir de src/ et test/
```

Ce qu'il apporte ici tient surtout à une question : `graft callers <symbole>
--depth all` donne le rayon d'impact d'un changement **avant** de le faire.
C'est ce qu'il faut savoir avant de toucher à `RenderCtx`, à `CardSpec` ou à la
résolution d'entités, par où passe chaque carte sans exception — et ce qu'un
`grep` sur un nom court comme `render` ne prouvera jamais.

Quatre points sur ce que le dépôt porte réellement.

**`graft/` n'est pas versionné.** L'index se régénère intégralement à partir du
code ; le committer reviendrait à verser un artefact dérivé, à le reconstruire
dans chaque PR et à y arbitrer des conflits. `.gitignore` l'exclut, et les
commandes rafraîchissent le graphe d'elles-mêmes avant de répondre — y compris
sur une modification non committée.

**`.ignore` le réadmet à la recherche.** `ripgrep` lit `.ignore` avant
`.gitignore` : sans ce fichier, un `rg` dans le dépôt ne verrait aucune fiche,
alors qu'elles sont précisément faites pour être lues. Il ne réadmet que la
recherche, jamais le suivi de version.

**`.claude/` configure Claude Code, et rien d'autre.** `settings.json` y
enregistre les hooks et la ligne de statut, `skills/graft/SKILL.md` dit quand
employer laquelle des six commandes, et `.mcp.json` déclare le serveur MCP —
que le client demande d'activer explicitement au premier lancement. Les
préférences propres à un poste vont dans `.claude/settings.local.json`, qui
n'est pas versionné. Les deux fichiers de `.claude/helpers/` ne sont que des
amorces : elles cherchent le paquet installé et n'ont aucun effet en son
absence. L'installeur y grave le chemin absolu de la machine qui l'a lancé, ce
que ce dépôt neutralise à chaque fois — un chemin d'un autre poste n'aide
personne, et porte un nom de compte.

**Aucune porte n'en dépend.** `validate.yml` n'appelle pas graft, et rien dans
`src/` ne le connaît. Qui ne l'installe pas travaille exactement comme avant :
ce que le dépôt versionne, c'est la configuration, jamais l'index. graft suit
`.gitignore`, donc il indexe `src/` et `test/`, jamais `node_modules/` ni
`dist/`.

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

`npm run build` produit `dist/carnet-scolaire-cards.js`. Ce fichier n'est **jamais
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
`docs/superpowers/specs/2026-09-08-cartes-carnet-scolaire-design.md`.

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

Le workflow `Publication` construit `dist/carnet-scolaire-cards.js` et l'attache à
la *release* créée pour le tag.

---

## 8. Signaler un problème

Utilisez les formulaires d'issue : ils demandent exactement ce qu'il faut et,
surtout, ils rappellent ce qu'il ne faut **pas** coller — en particulier
l'URL iCal, le bloc d'identité et tout journal du module `pronotepy`, qui
contiennent des identifiants.

---

## 9. Où lire la suite

Le tout est publié sur <https://fiveelements.github.io/ha-carnet-scolaire-cards/>.

**Deux documents de contributeur ne sont pas sur le site**, délibérément — ils
sont destinés à qui implémente ou relit une carte, non à qui l'installe :

| Document | Contenu |
| --- | --- |
| [`spec/parite-ancien-format.md`](spec/parite-ancien-format.md) | 89 exigences : la parité avec les huit cartes de `lovelace-pronote`, et ce que le nouveau format publie que l'ancien ne pouvait pas connaître. Chaque exigence porte sa raison et une marque de provenance — `mesuré`, `catalogue`, `fonctionnel`, `décision`, `bloqué`. |
| [`test/fixtures/FORMES.md`](test/fixtures/FORMES.md) | Les formes d'attributs telles qu'une instance les publie, avec la mention explicite de ce qui n'a **pas** pu être vérifié. |

Ils vivent hors de `docs/` et non dans `exclude_docs`, pour qu'aucune
manipulation de la configuration mkdocs ne les publie par accident.

Sous licence [MIT](LICENSE).
