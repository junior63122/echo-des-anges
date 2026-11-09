#!/usr/bin/env node
// Prépare le dossier publié (_site) : seuls les fichiers nécessaires à l'affichage du journal
// y sont copiés. Les scripts du robot, la documentation, les données de travail et la
// configuration du dépôt ne sont donc jamais servis sur le site.
// Le JavaScript et le CSS sont compactés (sans commentaires) si esbuild est disponible.
// Usage : node scripts/preparer-site.mjs
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "_site");

// Liste blanche : tout le reste du dépôt reste privé.
const FICHIERS = [
  "index.html", "CNAME", "journal.css", "journal.js", "pages.js", "articles.json",
  "favicon.svg", "favicon-32.png", "apple-touch-icon.png", "site.webmanifest",
  "robots.txt", "sitemap.xml", "news-sitemap.xml", "feed.xml", "llms.txt",
];
const DOSSIERS = ["img"];
const EXCLUS = [/(^|\/)exclues\.json$/];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const f of FICHIERS) if (existsSync(join(ROOT, f))) cpSync(join(ROOT, f), join(OUT, f));
for (const d of DOSSIERS) if (existsSync(join(ROOT, d)))
  cpSync(join(ROOT, d), join(OUT, d), { recursive: true, filter: (src) => !EXCLUS.some((re) => re.test(src.slice(ROOT.length + 1))) });

// Pages générées par build-static.mjs (articles, rubriques, sujets, redirections, 404).
if (!existsSync(join(ROOT, "_genere"))) throw new Error("Lancer d'abord node scripts/build-static.mjs");
cpSync(join(ROOT, "_genere"), OUT, { recursive: true });

// Données publiées : uniquement les champs utiles à l'affichage.
const INTERNES = ["imageCommons", "imageLegende", "slug", "redigeSur"];
const articles = JSON.parse(readFileSync(join(ROOT, "articles.json"), "utf8"))
  .map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !INTERNES.includes(k))));
writeFileSync(join(OUT, "articles.json"), JSON.stringify(articles));
// Index léger pour l'affichage immédiat : sans le texte intégral ni les sources des articles rédigés.
// Les revues gardent leurs liens (fil « En continu ») mais pas leur texte ; le reste perd texte et sources.
const index = articles.map((a) => Object.fromEntries(Object.entries(a).filter(([k]) => k !== "corps" && (a.type === "revue" || k !== "liens") && k !== "numero")));
writeFileSync(join(OUT, "articles-index.json"), JSON.stringify(index));
const VERSION = createHash("sha1").update(JSON.stringify(articles)).digest("hex").slice(0, 10);

// GitHub Pages ne doit pas réinterpréter le site.
writeFileSync(join(OUT, ".nojekyll"), "");

// Compactage (esbuild) : retire commentaires et espaces.
const esbuild = process.env.ESBUILD || "esbuild";
let compacte = false;
try {
  for (const f of ["journal.js", "pages.js", "journal.css"]) {
    execFileSync(esbuild, [join(ROOT, f), "--minify", "--legal-comments=none", "--charset=utf8", `--outfile=${join(OUT, f)}`, "--allow-overwrite", "--log-level=warning"], { stdio: "inherit" });
  }
  compacte = true;
} catch { /* esbuild absent : fichiers copiés tels quels */ }
// Images : versions WebP (1280 et 640 px de large) à côté des originaux, si sharp est disponible.
// Les originaux JPEG restent pour les aperçus des réseaux sociaux (og:image).
let webp = false;
try {
  const { createRequire } = await import("node:module");
  const req = createRequire(process.env.SHARP_DIR ? join(process.env.SHARP_DIR, "x.js") : import.meta.url);
  const sharp = req("sharp");
  const { readdirSync, statSync } = await import("node:fs");
  const images = [];
  const parcourir = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) parcourir(p); else if (/\.(jpe?g|png)$/i.test(f) && !/(logo|icon|og-)/i.test(f)) images.push(p); } };
  parcourir(join(OUT, "img"));
  await Promise.all(images.map(async (p) => {
    const base = p.replace(/\.(jpe?g|png)$/i, "");
    await sharp(p).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 74 }).toFile(base + ".webp");
    await sharp(p).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 70 }).toFile(base + "-800.webp");
  }));
  // Pages HTML : chaque <img> pointe vers la version WebP, avec la petite taille pour les mobiles.
  const { readdirSync: rd } = await import("node:fs");
  const pages = [];
  const html = (d) => { for (const f of rd(d)) { const p = join(d, f); if (statSync(p).isDirectory()) html(p); else if (f.endsWith(".html")) pages.push(p); } };
  html(OUT);
  for (const p of pages) {
    const t = readFileSync(p, "utf8");
    let n = t.replace(/<img src="(\/img\/[^"]+?)\.(jpe?g|png)"/gi, (m, b, ext) => (/(logo|icon|og-)/i.test(b) ? m : `<img src="${b}.webp" srcset="${b}-800.webp 800w, ${b}.webp 1280w" sizes="(max-width: 760px) 100vw, 760px"`));
    // Photo principale (prioritaire) : téléchargement demandé dès l'en-tête de la page.
    const hero = n.match(/<img src="(\/img\/[^"]+\.webp)" srcset="([^"]+)" sizes="([^"]+)"[^>]*fetchpriority="high"/);
    if (hero && !n.includes('rel="preload" as="image"')) n = n.replace("</head>", `<link rel="preload" as="image" href="${hero[1]}" imagesrcset="${hero[2]}" imagesizes="${hero[3]}" fetchpriority="high">\n</head>`);
    if (n !== t) writeFileSync(p, n);
  }
  webp = true;
} catch (e) { console.log("Images non converties :", e.message); }
try {
  const js = join(OUT, "journal.js");
  writeFileSync(js, readFileSync(js, "utf8").replace("__VERSION__", VERSION).replace('"__WEBP__"', webp ? "true" : "false"));
} catch { /* esbuild absent : fichiers copiés tels quels */ }
// Accueil pré-construit (jsdom) : la page s'affiche avant le script, qui la rafraîchit ensuite
// avec les données du moment (fil en continu, heures). Sans jsdom, l'accueil reste construit par le navigateur.
let preconstruit = false;
try {
  const { createRequire } = await import("node:module");
  const req = createRequire(process.env.SHARP_DIR ? join(process.env.SHARP_DIR, "x.js") : import.meta.url);
  const { JSDOM } = req("jsdom");
  for (const [page, url] of [["index.html", "http://localhost/"]]) {
    const fichier = join(OUT, page);
    const dom = new JSDOM(readFileSync(fichier, "utf8"), { url, runScripts: "outside-only", pretendToBeVisual: true });
    const w = dom.window;
    w.fetch = async (u) => { const f = join(OUT, new URL(u, url).pathname); return { ok: existsSync(f), json: async () => JSON.parse(readFileSync(f, "utf8")) }; };
    w.scrollTo = () => {};
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    w.eval(readFileSync(join(OUT, "pages.js"), "utf8"));
    w.eval(readFileSync(join(OUT, "journal.js"), "utf8"));
    const app = w.document.getElementById("app");
    for (let i = 0; i < 100 && !app.querySelector("section, article, .lead"); i++) await new Promise((r) => setTimeout(r, 50));
    if (!app.querySelector("section, article, .lead")) throw new Error("accueil vide");
    // Marqué « pré-construit » : le navigateur l'affiche tel quel et le rafraîchit une fois la page chargée.
    let rendu = dom.serialize().replace('<main id="app"', '<main id="app" data-prerendu="1"');
    const hero = rendu.match(/<img src="(\/img\/[^"]+\.webp)" srcset="([^"]+)" sizes="([^"]+)"[^>]*fetchpriority="high"/);
    if (hero) rendu = rendu.replace("</head>", `<link rel="preload" as="image" href="${hero[1]}" imagesrcset="${hero[2]}" imagesizes="${hero[3]}" fetchpriority="high">\n</head>`);
    writeFileSync(fichier, rendu);
    w.close();
  }
  preconstruit = true;
} catch (e) { console.log("Accueil non pré-construit :", e.message); }
console.log(`Site prêt dans _site (${compacte ? "JS et CSS compactés" : "sans compactage"}${webp ? ", images WebP" : ""}${preconstruit ? ", accueil pré-construit" : ""}).`);
