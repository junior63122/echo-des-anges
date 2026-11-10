#!/usr/bin/env node
// Couvertures graphiques pour les articles sans photo juste.
// Quand le robot des photos a épuisé ses recherches sans trouver de photo libre qui corresponde
// au sujet (« imageEchec »), l'article reçoit une couverture aux couleurs du journal : emblème,
// rubrique et titre. Elle est propre à chaque article (jamais partagée) et indiquée comme
// « Illustration », pas comme une photo. La version anglaise a sa propre couverture.
// Usage : node scripts/couvertures.mjs   (nécessite sharp)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(process.env.SHARP_DIR ? join(process.env.SHARP_DIR, "x.js") : import.meta.url);
const sharp = req("sharp");
const DB = join(ROOT, "articles.json");
const DIR = join(ROOT, "img", "couvertures");
const RUBRIQUES = {
  Business: ["Économie", "Business"], Finance: ["Finance", "Finance"], "Événementiel": ["Événementiel", "Events"],
  Culture: ["Culture", "Culture"], Sorties: ["Sorties", "Going out"], Tech: ["Tech", "Tech"],
  International: ["International", "World"], "Nice & Côte d'Azur": ["Nice & Côte d'Azur", "French Riviera"], Sport: ["Sport", "Sport"],
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Découpe du titre en lignes d'environ n signes, sans couper les mots.
function lignes(texte, n) {
  const out = []; let cur = "";
  for (const mot of texte.replace(/\s+/g, " ").trim().split(" ")) {
    if ((cur + " " + mot).trim().length > n && cur) { out.push(cur); cur = mot; } else cur = (cur + " " + mot).trim();
  }
  if (cur) out.push(cur);
  return out;
}
function svg(a, en) {
  const rub = (RUBRIQUES[a.section] || [a.section, a.section])[en ? 1 : 0].toUpperCase();
  // Taille du titre adaptée à sa longueur : 3 à 5 lignes au plus.
  let taille = 66, l = lignes(a.titre, 30);
  if (l.length > 4) { taille = 54; l = lignes(a.titre, 37); }
  if (l.length > 5) { taille = 46; l = lignes(a.titre, 44); l = l.slice(0, 6); }
  const hauteur = l.length * taille * 1.18;
  const y0 = 360 - hauteur / 2 + taille * 0.85 + 20;
  const vagues = [0, 1, 2].map((i) => `<path d="M${-40 + i * 70} ${760 - i * 40} C ${300 + i * 60} ${700 - i * 60}, ${640 + i * 40} ${560 - i * 70}, ${1320} ${330 - i * 80}" stroke="#2b8fd6" stroke-opacity="${0.16 - i * 0.04}" stroke-width="${46 - i * 12}" fill="none" stroke-linecap="round"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#13263c"/><stop offset="1" stop-color="#0c1a2b"/></linearGradient></defs>
  <rect width="1280" height="720" fill="url(#g)"/>${vagues}
  <g transform="translate(96 92)" fill="none" stroke="#2b8fd6" stroke-width="4.2" stroke-linecap="round"><path d="M4 30 C14 28 22 22 26 8" transform="scale(1.6)"/><path d="M10 33 C21 31 30 24 34 10" transform="scale(1.6)"/><path d="M17 36 C28 34 38 27 44 14" transform="scale(1.6)"/></g>
  <text x="186" y="140" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700" font-size="26" letter-spacing="3" fill="#5fb0ea">${esc(rub)}</text>
  <rect x="96" y="${y0 - taille - 18}" width="72" height="5" fill="#2b8fd6"/>
  ${l.map((t, i) => `<text x="96" y="${y0 + i * taille * 1.18}" font-family="DejaVu Serif, Liberation Serif, serif" font-weight="700" font-size="${taille}" fill="#ffffff">${esc(t)}</text>`).join("\n  ")}
  <text x="96" y="652" font-family="DejaVu Serif, Liberation Serif, serif" font-style="italic" font-weight="700" font-size="30" fill="#ffffff">L'Écho <tspan fill="#5fb0ea" font-size="22">des</tspan> Anges</text>
</svg>`;
}

const articles = JSON.parse(readFileSync(DB, "utf8"));
const parId = new Map(articles.map((a) => [a.id, a]));
const jumeau = (a) => parId.get(a.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-"));
mkdirSync(DIR, { recursive: true });
let n = 0;
for (const a of articles) {
  if (a.image || a.photo === false) continue;
  const en = a.lang === "en";
  const ref = en ? jumeau(a) : a;
  // Seulement quand la recherche de photo est épuisée pour l'article (ou sa version française).
  if (!ref || !ref.imageEchec || (ref !== a && ref.image && !ref.image.couverture)) continue;
  const src = `img/couvertures/${a.id.slice(0, 90)}.jpg`;
  if (!existsSync(join(ROOT, src))) await sharp(Buffer.from(svg(a, en))).jpeg({ quality: 86, mozjpeg: true }).toFile(join(ROOT, src));
  a.image = { src, credit: "L'Écho des Anges", couverture: true, paysage: true, legende: { fr: "", en: "" } };
  n++;
}
writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
console.log(`${n} couverture(s) créée(s).`);
