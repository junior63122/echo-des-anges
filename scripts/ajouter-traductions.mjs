#!/usr/bin/env node
// Ajoute (ou met à jour) la version anglaise d'articles déjà publiés en français.
// Entrée : fichiers JSON [{ slug, titre, chapo, corps[], legende_en }].
// La traduction reçoit l'identifiant « <date>-en-<slug> », ce qui la relie à l'original
// (balises hreflang, bouton de langue, plan du site).
// Usage : node scripts/ajouter-traductions.mjs traductions1.json [traductions2.json …]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "articles.json");
const RUBRIQUES = {
  Entreprises: "Companies", Portrait: "Profile", "Médias": "Media", "Marchés": "Markets", Culture: "Culture",
  "Start-up": "Start-ups", Industrie: "Industry", "Énergie": "Energy", "Économie": "Economy", Festivals: "Festivals",
  Agritech: "Agritech", Environnement: "Environment", "Palmarès": "Rankings", "Capital-risque": "Venture capital", "Société": "Society",
};
const articles = JSON.parse(readFileSync(DB, "utf8"));
let ajout = 0, maj = 0;
for (const f of process.argv.slice(2)) {
  for (const t of JSON.parse(readFileSync(f, "utf8"))) {
    const fr = articles.find((a) => a.lang === "fr" && a.slug === t.slug);
    if (!fr) throw new Error(`Original introuvable : ${t.slug}`);
    if (!t.titre || !t.chapo || !Array.isArray(t.corps) || t.corps.length !== fr.corps.length) throw new Error(`Traduction incomplète : ${t.slug}`);
    if (fr.image && t.legende_en) fr.image.legende = { ...fr.image.legende, en: t.legende_en };
    const id = `${fr.date}-en-${fr.slug}`;
    const en = {
      ...fr, id, lang: "en", rubrique: RUBRIQUES[fr.rubrique] || fr.rubrique,
      titre: t.titre, chapo: t.chapo, corps: t.corps,
      ...(fr.image ? { image: fr.image } : {}),
    };
    const i = articles.findIndex((a) => a.id === id);
    if (i >= 0) { articles[i] = en; maj++; } else { articles.splice(articles.indexOf(fr) + 1, 0, en); ajout++; }
  }
}
writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
console.log(`${ajout} traduction(s) ajoutée(s), ${maj} mise(s) à jour.`);
