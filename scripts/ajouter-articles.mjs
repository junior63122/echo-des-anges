#!/usr/bin/env node
// Ajoute à articles.json des articles rédigés à la main, fournis sous forme de fichiers JSON (« lots »).
// Chaque entrée : n, slug, date, [precision], section, rubrique, titre, chapo, corps[], liens[], [imageCommons].
// Un article déjà présent (même slug) est mis à jour en conservant sa photo.
// Usage : node scripts/ajouter-articles.mjs lot1.json [lot2.json …]
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "articles.json");
const AUTEURS = { Business: "Camille Rostand", Finance: "Hugo Marchetti", "Événementiel": "Léa Fontaine", Tech: "Nathan Belkacem", Monde: "Sofia Delmas", "Nice & Côte d'Azur": "Lucas Giordano", Sport: "Inès Morel" };
const articles = JSON.parse(readFileSync(DB, "utf8"));
let ajout = 0, maj = 0;
for (const f of process.argv.slice(2)) {
  for (const e of JSON.parse(readFileSync(f, "utf8"))) {
    if (!AUTEURS[e.section]) throw new Error(`${e.slug} : rubrique inconnue ${e.section}`);
    const id = `${e.date}-${e.slug}`;
    const prec = articles.find((a) => a.slug === e.slug && a.lang === "fr");
    const art = {
      id, lang: "fr", date: e.date, ...(e.precision ? { precision: e.precision } : {}),
      section: e.section, rubrique: e.rubrique, emoji: "", type: "article", auteur: e.auteur || AUTEURS[e.section],
      slug: e.slug, titre: e.titre, chapo: e.chapo, corps: e.corps,
      sources: [...new Set(e.liens.map((l) => l.source))], liens: e.liens,
      ...(e.imageCommons ? { imageCommons: e.imageCommons } : {}),
      ...(e.photo === false ? { photo: false } : {}),
      ...(prec && prec.image ? { image: prec.image } : {}),
    };
    if (prec) { articles[articles.indexOf(prec)] = art; maj++; } else { articles.push(art); ajout++; }
  }
}
writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
console.log(`${ajout} article(s) ajouté(s), ${maj} mis à jour.`);
