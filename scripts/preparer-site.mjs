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
console.log(`Site prêt dans _site (${compacte ? "JS et CSS compactés" : "sans compactage"}).`);
