<!--
Merci pour la contribution. Le guide complet est dans CONTRIBUTING.md ;
ce qui suit en est la version courte, à remplir.
-->

## Ce que ça change

<!-- Et surtout *pourquoi*. Pour une correction, décrivez le symptôme qu'un
utilisateur voyait sur sa carte : c'est ce qui permet de juger si la
correction est la bonne, et pas seulement si elle fait passer les tests. -->

## Comment vous l'avez vérifié

<!-- Les tests ajoutés, ou ce que vous avez observé sur un tableau de bord
réel avec des entités synthétiques. -->

## Portails

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build` — `dist/pronote-ng-cards.js` se génère sans erreur

## Vérifications propres à ce dépôt

- [ ] **Aucun identifiant d'entité en dur** : `sensor.<enfant>_prochain_cours`,
      jamais un identifiant complet plausible — ni dans le code, ni dans les
      tests, ni dans la documentation, ni dans les messages de commit.
- [ ] **Aucun appel à un service autre que `pronote_ng.refresh`** depuis une
      carte, et seulement sur action explicite de l'utilisateur — jamais au
      montage ni au rendu.
- [ ] **Aucune donnée réelle** : nom d'élève, nom d'établissement,
      identifiant, URL d'instance — dans le code, les tests, les captures
      d'écran ou ce message de commit. Valeurs synthétiques imposées :
      `demo.example.invalid`, `<enfant>`.
- [ ] Si vous avez touché à un texte visible par l'utilisateur : il est en
      français et vit dans `src/localize/fr.json`, jamais écrit en dur dans
      un gabarit Lit.
- [ ] Rien de ce que j'ai écrit — code, documentation, message de commit —
      ne recommande d'activer le journaliseur `pronotepy` ; seul
      `custom_components.pronote_ng` peut l'être.

## Issues liées

<!-- Closes #… -->
