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
5. Ces tests se lancent ici, sur la machine de travail, jamais sur GitHub Actions (`qualite.yml` n'est lancé qu'à la demande explicite du propriétaire).

6. Veille hebdomadaire (tâche programmée de Claude, mercredi 10 h 37) : outils seo-news-discover, technical-seo-code-audit, seo-hreflang, seo-schema, seo-geo, site-audit, accessibility-review et revue de sécurité ; chaque constat est rejoué, corrigé puis retesté avec les quatre suites ; corrections sur une branche `veille/AAAA-MM-JJ`, rapport dans `audits/AAAA-MM-JJ.md`.

Limites connues : seul Chromium est disponible pour les tests (pas de Safari/WebKit ni Firefox réels) ; le site n'a pas de vidéo ni de formulaire d'envoi (contact par adresse électronique, recherche locale).

## Règles éditoriales

- Pas de point médian « · » ni de tiret cadratin dans les textes du journal (hors titres de sources cités tels quels).
- Ne jamais inventer de chiffres, de citations ni de sources ; chaque article cite ses sources.
- Chaque photo doit correspondre au sujet de son article et n'être utilisée qu'une fois (robot : `scripts/fetch-article-images.mjs`, exclusions : `img/entreprises/exclues.json`).

## Coûts

- Uniquement des outils gratuits : aucune IA dans le journal ni dans ses robots (ni Claude/API Anthropic, ni Gemini, qui est réservé à Teufy), aucun service payant.
- Rythme : deux éditions par jour et un dossier par jour (outils gratuits).
- Minutes GitHub Actions (solde payé par le propriétaire) : réservées aux robots automatiques du journal (éditions, dossier, photos, publication du site). Le développement n'en consomme aucune : pas de tests sur les pull requests, pas de publication à la fusion (les changements partent avec l'édition suivante), aucun lancement manuel d'un workflow par Claude sans demande explicite.
- Le journal doit consommer le moins possible : le dossier, l'actualité et les photos dans une seule exécution le matin, une courte le soir, le site republié seulement s'il a changé, rattrapage photo le lundi ; contrôle du site en ligne et tests Firefox/WebKit seulement à la demande.
