#!/usr/bin/env node
// Billet d'humeur satirique de la semaine (un par semaine, lancé avec la veille du lundi).
//
// Matière : les dépêches de la semaine (titres et résumés des flux RSS des médias), comme pour les
// articles. Le billet commente l'actualité avec ironie ; il est toujours présenté comme une satire :
// étiquette « Billet satirique », avertissement en tête de page, type SatiricalArticle pour les
// moteurs, et absence du plan Google News.
// Garde-fous : faits réels uniquement tirés des dépêches, exagérations évidentes, aucune citation
// inventée prêtée à une personne réelle, pas de particuliers, de victimes ni de drames.
// Nécessite ANTHROPIC_API_KEY ; sans clé, ne fait rien.
// Usage : node scripts/write-billet.mjs [--force]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeed } from "./generate-news.mjs";
import { FLUX } from "./write-stories.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "articles.json");
const MODEL = process.env.JOURNAL_MODEL || "claude-opus-5-5";
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
const PLUME = "Le Pointu";

const SCHEMA = {
  type: "object",
  properties: {
    titre: { type: "string" },
    chapo: { type: "string" },
    corps: { type: "array", items: { type: "string" } },
    depeches: { type: "array", items: { type: "integer" }, description: "Numéros des dépêches dont le billet commente les faits" },
  },
  required: ["titre", "chapo", "corps", "depeches"],
  additionalProperties: false,
};
const SCHEMA_EN = {
  type: "object",
  properties: { titre: { type: "string" }, chapo: { type: "string" }, corps: { type: "array", items: { type: "string" } } },
  required: ["titre", "chapo", "corps"],
  additionalProperties: false,
};

let client;
async function appel(params) {
  client ||= new Anthropic();
  const r = await client.beta.messages.create({ model: MODEL, max_tokens: 12000, ...FALLBACK, ...params });
  if (r.stop_reason === "refusal") throw new Error(`refus (${r.stop_details?.category ?? "sans catégorie"})`);
  if (r.stop_reason === "max_tokens") throw new Error("réponse tronquée");
  return JSON.parse(r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.log("ANTHROPIC_API_KEY absente : pas de billet."); return; }
  const db = JSON.parse(readFileSync(DB, "utf8"));
  const dernier = db.filter((a) => a.genre === "billet" && a.lang === "fr").map((a) => a.date).sort().pop();
  if (!process.argv.includes("--force") && dernier && Date.now() - Date.parse(dernier) < 6 * 864e5) { console.log(`Billet déjà publié le ${dernier}.`); return; }

  const depeches = [];
  for (const url of FLUX) {
    try {
      const items = await fetchFeed(url);
      depeches.push(...items.filter((i) => i.resume && i.resume.length > 60 && (!i.date || Date.now() - i.date < 7 * 864e5)).slice(0, 25));
    } catch (e) { console.warn(`  ✗ ${url} : ${e.message}`); }
  }
  const vus = new Set();
  const liste = depeches.filter((d) => !vus.has(d.url) && vus.add(d.url)).slice(0, 140);
  if (liste.length < 5) { console.log("Trop peu de dépêches cette semaine : pas de billet."); return; }

  const fr = await appel({
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
    system: `Tu es « ${PLUME} », chroniqueur satirique de L'Écho des Anges, journal indépendant basé à Nice. Chaque semaine, tu écris un billet d'humeur ironique sur l'actualité de Nice, de la Côte d'Azur et de Monaco.

Règles impératives :
- Les faits réels que tu évoques viennent uniquement des dépêches fournies, sans en déformer aucun.
- L'humour passe par l'ironie, le décalage, l'exagération manifeste : une exagération doit être si évidente qu'aucun lecteur ne puisse la prendre pour une information.
- N'invente aucune citation, aucun chiffre ni aucun fait attribué à une personne, une entreprise ou une institution réelle. Tu peux moquer les décisions publiques, les institutions, les situations et les travers du quotidien, jamais la vie privée.
- Jamais de particuliers, de victimes, de malades, de morts, de drames, d'accidents ni de faits divers violents ; jamais d'attaque sur l'origine, la religion, le sexe, l'orientation, le handicap.
- Pas d'injure ni d'accusation : rien qui puisse passer pour une affirmation diffamatoire.
- Ton : esprit niçois, malicieux mais bienveillant, phrases vives. Pas de point médian, pas de tiret cadratin.
Construction : titre court et piquant (6 à 12 mots), chapô d'une phrase, 4 à 6 paragraphes (300 à 500 mots). Indique les numéros des dépêches dont tu commentes les faits.`,
    messages: [{ role: "user", content: `Dépêches de la semaine :\n\n${liste.map((d, i) => `[${i}] ${d.source} — ${d.titre}\n${d.resume}`).join("\n\n")}\n\nÉcris le billet satirique de la semaine en choisissant un ou deux sujets locaux qui s'y prêtent.` }],
  });
  const corps = fr.corps.map((p) => p.trim()).filter(Boolean);
  if (!fr.titre || !fr.chapo || corps.length < 3) throw new Error("billet incomplet");
  const sources = (fr.depeches || []).map((i) => liste[i]).filter(Boolean);

  const date = new Date().toISOString().slice(0, 10);
  const base = {
    date, heure: new Date().toISOString(), section: "Nice & Côte d'Azur", type: "article", genre: "billet", satire: true,
    auteur: PLUME, emoji: "🎭",
    liens: sources.map((d) => ({ titre: d.titre, source: d.source, url: d.url })),
    sources: [...new Set(sources.map((d) => d.source))],
    // Pas de photo de presse sur une satire : couverture graphique du journal (scripts/couvertures.mjs).
    imageCommons: [], imageEchec: "[]",
  };
  const id = `${date}-billet-${slug(fr.titre)}`;
  db.push({ ...base, id, lang: "fr", rubrique: "Billet satirique", titre: fr.titre.trim(), chapo: fr.chapo.trim(), corps });
  try {
    const en = await appel({
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA_EN } },
      system: "You translate a weekly satirical column from L'Écho des Anges, a Nice-based paper, into British English. Keep the irony, every fact and every name exactly; same number of paragraphs.",
      messages: [{ role: "user", content: JSON.stringify({ titre: fr.titre, chapo: fr.chapo, corps }) }],
    });
    db.push({ ...base, id: `${date}-en-billet-${slug(fr.titre)}`, lang: "en", rubrique: "Satirical column", titre: en.titre, chapo: en.chapo, corps: en.corps });
  } catch (e) { console.warn(`  (pas de version anglaise : ${e.message})`); }
  db.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : x.id.localeCompare(y.id)));
  writeFileSync(DB, JSON.stringify(db, null, 2) + "\n");
  console.log(`✓ Billet : ${fr.titre}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
