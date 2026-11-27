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
| Pages indexables générées (référencement) | `a/`, `p/`, `sitemap.xml`, `news-sitemap.xml`, `feed.xml`, `llms.txt`, `robots.txt` |
| Collecte de l'actualité (flux RSS) | `scripts/generate-news.mjs` |
| Dossier du jour et agenda (revue de presse, sans IA) | `scripts/dossier-semaine.mjs` |
| Photos libres (Wikimedia Commons) | `scripts/fetch-images.mjs` |
| Référencement | `scripts/build-static.mjs` |
| Test des flux RSS | `scripts/check-feeds.mjs` |

## Robots (onglet Actions)

- **Journal - éditions** : deux fois par jour. Collecte l'actualité dans les flux RSS des médias (titres et
  résumés publiés pour être repris) et en fait des revues de presse par rubrique, sources citées ; le matin,
  rédige aussi le dossier du jour. Cherche les photos libres, met à jour le référencement, puis publie.
  Aucune IA, aucun service payant. Le texte intégral des articles des autres médias n'est jamais récupéré.
- **Journal - photos des articles** : rattrapage le lundi.
- **Journal - vérification des flux** : à la demande. Teste des flux RSS.

## Mise en service

1. **GitHub Pages** : Settings → Pages → Source *Deploy from a branch*, branche `main`, dossier `/ (root)`.
   Domaine personnalisé : `echodesanges.fr` (fichier `CNAME`), puis cocher *Enforce HTTPS*.
   DNS du domaine : enregistrements A vers 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 ;
   AAAA vers 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 ;
   CNAME `www` vers `junior63122.github.io`.
2. **Aucune clé d'IA** : le journal n'utilise ni Claude, ni Gemini, ni aucune IA payante.
3. **Mentions légales** : compléter `JOURNAL_CONFIG` en haut de `pages.js` (raison sociale, forme et capital,
   RCS, siège, téléphone, TVA, hébergeur). Les champs vides ne sont pas affichés.
4. **Référencement** : déclarer le site et `sitemap.xml` dans Google Search Console et Bing Webmaster Tools.

## Changer de domaine

Mettre à jour les adresses de `index.html`, puis lancer
`SITE_URL=https://nouveau-domaine.fr node scripts/build-static.mjs`
(et modifier la valeur par défaut de `SITE` dans ce script pour les prochaines éditions).
Si le site est servi à la racine d'un domaine, le script génère aussi `robots.txt`.

## Dossier de la semaine (gratuit, sans API)

Chaque matin, l'édition du matin (« Journal - éditions ») publie une
revue de presse thématique (« La semaine de… »), en français et en anglais, sur la rubrique dont le
dernier dossier est le plus ancien : Nice & Côte d'Azur, Économie, Finance, Événementiel, Tech,
Sport, International. Chaque rubrique revient donc une fois par semaine (7 dossiers par semaine).

- Aucune API payante ni intelligence artificielle : le script `scripts/dossier-semaine.mjs`
  s'appuie sur les dépêches des 7 derniers jours collectées dans les flux RSS (`donnees/fil.json`,
  alimenté par la collecte quotidienne).
- Il regroupe les dépêches qui traitent du même sujet, classe les sujets (actualité locale,
  nombre de médias, fraîcheur) et rédige l'article : titres et extraits cités entre guillemets et
  attribués à leur média, liens vers les articles complets en fin de page.
- L'article reçoit automatiquement sa page référencée (titre, description, données structurées,
  sitemap, hreflang FR/EN).
- Lancement manuel : onglet Actions → « Journal - dossier de la semaine » → Run workflow
  (champ « Rubrique » facultatif).
