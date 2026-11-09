#!/usr/bin/env node
// Photos libres de droits pour des articles précis, depuis Wikimedia Commons.
// Un article qui porte « imageCommons » (nom exact « File:… » ou liste de requêtes) et pas encore
// d'« image » reçoit la première photo sous licence libre qui convient ; l'auteur et la licence sont
// crédités sous la photo. Les photos écartées après relecture vont dans img/entreprises/exclues.json.
// Usage : node scripts/fetch-article-images.mjs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "img", "entreprises");
const DB = join(ROOT, "articles.json");
const UA = "EchoDesAnges/1.0 (https://echodesanges.fr/) Node.js";
const LICENCES_OK = /^(cc0|public domain|pd|cc by(-sa)? \d|cc-by(-sa)?-\d)/i;
const stripHtml = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

async function api(params) {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({ format: "json", prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1280", ...params });
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  const txt = await res.text();
  if (!res.ok || !txt.trim().startsWith("{")) throw new Error(`HTTP ${res.status} ${res.headers.get("content-type")} : ${txt.replace(/\s+/g, " ").slice(0, 200)}`);
  const pages = Object.values(JSON.parse(txt).query?.pages || {});
  return pages.sort((a, b) => (a.index || 0) - (b.index || 0)).map((p) => {
    const ii = p.imageinfo?.[0] || {}; const m = ii.extmetadata || {};
    return { titre: p.title, mime: ii.mime, w: ii.width, h: ii.height, thumb: ii.thumburl, page: ii.descriptionurl,
      licence: stripHtml(m.LicenseShortName?.value), auteur: stripHtml(m.Artist?.value).slice(0, 80), restrictions: stripHtml(m.Restrictions?.value) };
  });
}
// Repli : Openverse (catalogue de photos sous licence Creative Commons, dont Wikimedia et Flickr).
async function openverse(q) {
  const url = "https://api.openverse.org/v1/images/?" + new URLSearchParams({ q, license: "cc0,pdm,by,by-sa", aspect_ratio: "wide", size: "large", page_size: "20", mature: "false" });
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
  const txt = await res.text();
  if (!res.ok || !txt.trim().startsWith("{")) throw new Error(`Openverse HTTP ${res.status} : ${txt.replace(/\s+/g, " ").slice(0, 200)}`);
  return (JSON.parse(txt).results || []).filter((x) => x.url && /\.jpe?g($|\?)/i.test(x.url) && (x.width || 0) >= 1200 && (x.width || 0) <= 3200 && x.creator).map((x) => ({
    titre: x.title, mime: "image/jpeg", w: x.width, h: x.height, thumb: x.url, page: x.foreign_landing_url,
    licence: `${x.license === "pdm" ? "Domaine public" : x.license === "cc0" ? "CC0" : `CC ${x.license.toUpperCase()} ${x.license_version || ""}`.trim()}`,
    auteur: String(x.creator).slice(0, 80), source: x.source === "wikimedia" ? "Wikimedia Commons" : x.source === "flickr" ? "Flickr" : x.provider || x.source, restrictions: "",
  }));
}

const convient = (x, exact) => x.mime === "image/jpeg" && x.thumb && x.w >= (exact ? 800 : 1200) && (exact || x.w > x.h * 1.15)
  && LICENCES_OK.test(x.licence) && !/trademark|personality/i.test(x.restrictions) && x.auteur;

async function main() {
  mkdirSync(DIR, { recursive: true });
  const exclues = existsSync(join(DIR, "exclues.json")) ? JSON.parse(readFileSync(join(DIR, "exclues.json"), "utf8")) : [];
  const articles = JSON.parse(readFileSync(DB, "utf8"));
  const prises = new Set(articles.map((a) => a.image?.page).filter(Boolean));
  let n = 0;
  for (const a of articles) {
    if (a.image || !a.imageCommons || a.lang === "en") continue;
    const demandes = [].concat(a.imageCommons);
    let choix = null;
    for (const q of demandes) {
      try {
        const res = q.startsWith("File:") ? await api({ titles: q }) : await api({ generator: "search", gsrnamespace: "6", gsrsearch: `${q} filetype:bitmap`, gsrlimit: "20" });
        choix = res.find((x) => convient(x, q.startsWith("File:")) && !exclues.includes(x.page) && !prises.has(x.page));
      } catch (e) { console.warn(`  ${a.id} ✗ Commons « ${q} » : ${e.message}`); }
      if (!choix && !q.startsWith("File:")) {
        try { choix = (await openverse(q)).find((x) => !exclues.includes(x.page) && !prises.has(x.page)); }
        catch (e) { console.warn(`  ${a.id} ✗ Openverse « ${q} » : ${e.message}`); }
      }
      if (choix) break;
    }
    if (!choix) { console.warn(`- ${a.id} : aucune photo libre trouvée`); continue; }
    const r = await fetch(choix.thumb, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) { console.warn(`  ${a.id} ✗ téléchargement HTTP ${r.status}`); continue; }
    const fichier = `img/entreprises/${a.id.replace(/^\d{4}-\d\d-\d\d-/, "").slice(0, 60)}.jpg`;
    writeFileSync(join(ROOT, fichier), Buffer.from(await r.arrayBuffer()));
    const image = { src: fichier, credit: `${choix.auteur} / ${choix.source || "Wikimedia Commons"} (${choix.licence})`, page: choix.page, paysage: choix.w > choix.h, legende: a.imageLegende || { fr: "", en: "" } };
    // La traduction anglaise partage la même photo.
    for (const x of articles) if (x === a || (x.lang === "en" && x.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-") === a.id)) x.image = image;
    prises.add(choix.page);
    n++;
    console.log(`+ ${a.id} ← ${choix.titre} (${choix.licence}, ${choix.auteur})`);
  }
  writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
  console.log(`${n} photo(s) ajoutée(s).`);
}
main();
