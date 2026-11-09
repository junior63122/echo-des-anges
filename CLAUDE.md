# L'Écho des Anges : règles de travail

## Contrôle qualité (à appliquer après toute modification importante)

Cycle : analyser, corriger, retester, noter, recommencer. Ne jamais déclarer un test qui n'a pas été exécuté.

1. Construire le site comme en production :
   `node scripts/build-static.mjs && ESBUILD=node_modules/.bin/esbuild node scripts/preparer-site.mjs`
2. Servir `_site` : `node tests/serveur.cjs _site 8765`
3. Lancer les quatre suites (toutes doivent finir par « 0 problème ») :
   - `node tests/liens.cjs _site` : chaque lien interne, image, script et feuille de style de chaque page ;
   - `node tests/scenarios.cjs http://localhost:8765` : boutons, menu, recherche piégée, langue, retour/avance, clics rapides, filtres, sans JavaScript, mode sombre (mobile et ordinateur) ;
   - `node tests/audit.cjs http://localhost:8765` : 9 tailles d'écran (320 px à 2560 px, portrait et paysage), cibles tactiles WCAG 2.2, axe (WCAG 2.2 AA) clair et sombre, clavier et lien d'évitement, réseau lent, coupé, erreur 500 et JSON invalide, mouvement réduit, XSS, stabilité visuelle (CLS) ;
   - `node tests/pages.cjs http://localhost:8765 _site` puis `LARGE=1 …` : toutes les pages ouvertes en mobile et en ordinateur (erreurs JS, débordement, image cassée, titre).
4. Lighthouse en mobile et ordinateur sur l'accueil, une rubrique, un article, les archives, une fiche sujet, l'anglais.
5. Le workflow `.github/workflows/qualite.yml` rejoue les suites 1 à 3 sur chaque pull request.

Limites connues : seul Chromium est disponible pour les tests (pas de Safari/WebKit ni Firefox réels) ; le site n'a pas de vidéo ni de formulaire d'envoi (contact par adresse électronique, recherche locale).

## Règles éditoriales

- Pas de point médian « · » ni de tiret cadratin dans les textes du journal (hors titres de sources cités tels quels).
- Ne jamais inventer de chiffres, de citations ni de sources ; chaque article cite ses sources.
- Chaque photo doit correspondre au sujet de son article et n'être utilisée qu'une fois (robot : `scripts/fetch-article-images.mjs`, exclusions : `img/entreprises/exclues.json`).
