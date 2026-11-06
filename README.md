# L'Écho des Anges

Quotidien en ligne de la Baie des Anges : actualité de Nice, Cannes, Monaco et de la Côte d'Azur,
en français et en anglais, mis à jour deux fois par jour par un workflow GitHub Actions.

**Site : https://echodesanges.fr/**

## Contenu du dépôt

| Élément | Fichier |
| --- | --- |
| Application (une, rubriques, articles, archives) | `index.html`, `journal.js`, `journal.css` |
| Pages fixes (Notre histoire, Mentions légales) | `pages.js` |
| Articles, revues de presse et archives | `articles.json` |
| Photos (articles, banque libre de droits + crédits) | `img/` |
| Pages indexables générées (référencement) | `a/`, `p/`, `sitemap.xml`, `feed.xml`, `llms.txt` |
| Collecte de l'actualité (flux RSS) | `scripts/generate-news.mjs` |
| Rédaction des articles du jour (API Claude) | `scripts/write-articles.mjs` |
| Rédaction des archives (API Claude + recherche web) | `scripts/write-archives.mjs` |
| Photos libres (Wikimedia Commons) | `scripts/fetch-images.mjs` |
| Référencement | `scripts/build-static.mjs` |
| Test des flux RSS | `scripts/check-feeds.mjs` |

## Robots (onglet Actions)

- **Journal - éditions** : deux fois par jour (et à la demande). Collecte l'actualité, rédige les articles si la
  clé API est présente, met à jour les photos et le référencement, puis publie.
- **Journal - archives** : à la demande. Rédige des archives sur une période choisie (événements vérifiés par
  recherche web, sources citées, version anglaise).
- **Journal - vérification des flux** : à la demande. Teste des flux RSS.

## Mise en service

1. **GitHub Pages** : Settings → Pages → Source *Deploy from a branch*, branche `main`, dossier `/ (root)`.
   Domaine personnalisé : `echodesanges.fr` (fichier `CNAME`), puis cocher *Enforce HTTPS*.
   DNS du domaine : enregistrements A vers 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 ;
   AAAA vers 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 ;
   CNAME `www` vers `junior63122.github.io`.
2. **Clé API** (rédaction automatique) : Settings → Secrets and variables → Actions → New repository secret,
   nom `ANTHROPIC_API_KEY`. Sans clé, les rubriques restent en revue de presse (titres, résumés, liens).
3. **Mentions légales** : compléter `JOURNAL_CONFIG` en haut de `pages.js` (raison sociale, forme et capital,
   RCS, siège, téléphone, TVA, hébergeur). Les champs vides s'affichent « [à compléter] ».
4. **Référencement** : déclarer le site et `sitemap.xml` dans Google Search Console et Bing Webmaster Tools.

## Changer de domaine

Mettre à jour les adresses de `index.html`, puis lancer
`SITE_URL=https://nouveau-domaine.fr node scripts/build-static.mjs`
(et modifier la valeur par défaut de `SITE` dans ce script pour les prochaines éditions).
Si le site est servi à la racine d'un domaine, le script génère aussi `robots.txt`.
