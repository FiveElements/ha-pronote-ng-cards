import { beforeEach } from 'vitest';

/**
 * Remise à zéro du stockage du navigateur avant chaque test.
 *
 * La garde de rafraîchissement du limiteur y persiste désormais son
 * horodatage, pour qu'un rechargement de page ne réarme pas le bouton avant
 * l'heure (voir `src/core/base-card.ts`). C'est le comportement voulu en
 * production, et une fuite d'état entre tests si on ne le nettoie pas : la
 * garde posée par un test grise le bouton du suivant dès que les deux
 * montent la carte sur le même appareil.
 *
 * Ce nettoyage vit ici plutôt que dans chaque fichier concerné : il y était
 * déjà écrit deux fois, et un troisième fichier qui monterait une carte de
 * rafraîchissement hériterait silencieusement de la pollution.
 */
beforeEach(() => {
  try {
    globalThis.localStorage?.clear();
  } catch {
    // Stockage indisponible dans cet environnement : rien à nettoyer.
  }
});
