#!/usr/bin/env node
// Rédaction quotidienne des articles de L'Écho des Anges.
//
// 1. Lit les flux d'actualité (RSS) que les médias publient pour être repris : titres et résumés.
//    Le texte intégral des articles des autres médias n'est jamais récupéré ni réutilisé.
// 2. Choisit les sujets les plus importants pour les lecteurs de la Côte d'Azur et regroupe
//    les informations de plusieurs médias sur un même sujet.
// 3. Rédige un article original par sujet (faits attribués, sources citées en lien), puis sa
//    version anglaise.
// Nécessite ANTHROPIC_API_KEY ; sans clé, ne fait rien.
// Usage : node scripts/write-stories.mjs [--nombre=6]

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { fetchFeed } from "./generate-news.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "articles.json");
const MODEL = process.env.JOURNAL_MODEL || "claude-opus-5-5";
const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };

// Flux lus pour trouver les sujets du jour (local d'abord, puis national et international).
export const FLUX = [
  "https://www.nicematin.com/rss",
  "https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/alpes-maritimes/rss",
  "https://france3-regions.franceinfo.fr/provence-alpes-cote-d-azur/rss",
  "https://www.francebleu.fr/rss/azur/rubrique/infos.xml",
  "https://www.bfmtv.com/rss/cote-d-azur/",
  "https://www.monaco-tribune.com/feed/",
  "https://www.lemonde.fr/economie/rss_full.xml",
  "https://www.lemonde.fr/international/rss_full.xml",
  "https://www.lemonde.fr/sport/rss_full.xml",
  "https://www.lemonde.fr/pixels/rss_full.xml",
  "https://www.francetvinfo.fr/titres.rss",
  "https://www.ouest-france.fr/rss/une",
];

const RUBRIQUES = {
  Business: { journaliste: "Camille Rostand", emoji: "💼" },
  Finance: { journaliste: "Hugo Marchetti", emoji: "📈" },
  "Événementiel": { journaliste: "Léa Fontaine", emoji: "🎪" },
  Tech: { journaliste: "Nathan Belkacem", emoji: "💻" },
  Monde: { journaliste: "Sofia Delmas", emoji: "🌍" },
  "Nice & Côte d'Azur": { journaliste: "Lucas Giordano", emoji: "🌴" },
  Sport: { journaliste: "Inès Morel", emoji: "⚽" },
};

const SCHEMA_PLAN = {
  type: "object",
  properties: {
    sujets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string", enum: Object.keys(RUBRIQUES) },
          rubrique: { type: "string", description: "Étiquette courte : Politique, Social, Faits divers, Économie, Culture, Sport, Montagne, Solidarité, Monaco…" },
          sujet: { type: "string" },
          depeches: { type: "array", items: { type: "integer" }, description: "Numéros des dépêches qui traitent ce sujet" },
          sensible: { type: "boolean", description: "Vrai si le sujet comporte des morts, des blessés graves, une agression ou un drame" },
        },
        required: ["section", "rubrique", "sujet", "depeches", "sensible"],
        additionalProperties: false,
      },
    },
  },
  required: ["sujets"],
  additionalProperties: false,
};

const SCHEMA_ARTICLE = {
  type: "object",
  properties: {
    titre: { type: "string" },
    chapo: { type: "string" },
    corps: { type: "array", items: { type: "string" } },
  },
  required: ["titre", "chapo", "corps"],
  additionalProperties: false,
};

const STYLE = `Style : celui d'un quotidien régional de référence. Attaque factuelle sur l'information principale, puis contexte, détails, réactions. Phrases variées, verbes précis, vocabulaire concret. Pas de question rhétorique, pas d'emphase ni de formule creuse (« véritable », « à la croisée des chemins », « un tournant majeur », « dans un contexte de »), pas de conclusion moralisatrice ou de bilan général. Ne parle jamais de toi, des dépêches ni de la façon dont l'article a été écrit.`;

let client;
async function appel(params) {
  client ||= new Anthropic();
  const r = await client.beta.messages.create({ model: MODEL, max_tokens: 16000, ...FALLBACK, ...params });
  if (r.stop_reason === "refusal") throw new Error(`refus (${r.stop_details?.category ?? "sans catégorie"})`);
  if (r.stop_reason === "max_tokens") throw new Error("réponse tronquée");
  return JSON.parse(r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) { console.log("ANTHROPIC_API_KEY absente : pas de rédaction d'articles."); return; }
  const nombre = Math.max(1, parseInt((process.argv.find((a) => a.startsWith("--nombre=")) || "=6").split("=")[1], 10));
  const db = JSON.parse(readFileSync(DB, "utf8"));
  const dejaUtilisees = new Set(db.filter((a) => a.type === "article").flatMap((a) => (a.liens || []).map((l) => l.url)));
  const recentsTitres = db.filter((a) => a.type === "article" && a.heure && Date.now() - Date.parse(a.heure) < 3 * 864e5).map((a) => a.titre);

  // 1. Dépêches de la semaine (veille hebdomadaire ; JOURNAL_HEURES pour changer), avec résumé, non encore utilisées.
  const depeches = [];
  const flux = process.env.JOURNAL_FLUX ? process.env.JOURNAL_FLUX.split(/\s+/).filter(Boolean) : FLUX;
  for (const url of flux) {
    try {
      const items = await fetchFeed(url);
      depeches.push(...items.filter((i) => i.resume && i.resume.length > 60 && (!i.date || Date.now() - i.date < (+process.env.JOURNAL_HEURES || 168) * 3600e3) && !dejaUtilisees.has(i.url)).slice(0, 25));
    } catch (e) { console.warn(`  ✗ ${url} : ${e.message}`); }
  }
  const vus = new Set();
  const liste = depeches.filter((d) => !vus.has(d.url) && vus.add(d.url)).slice(0, 160);
  console.log(`${liste.length} dépêches disponibles.`);
  if (!liste.length) return;

  // 2. Choix des sujets.
  const plan = await appel({
    output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_PLAN } },
    system: "Tu es rédacteur en chef de L'Écho des Anges, quotidien basé à Nice. Tu choisis les sujets du jour pour des lecteurs de la Côte d'Azur.",
    messages: [{ role: "user", content: `Voici les dépêches disponibles :

${liste.map((d, i) => `[${i}] ${d.source} — ${d.titre}\n${d.resume}`).join("\n\n")}

Choisis jusqu'à ${nombre} sujets distincts, en privilégiant l'actualité de Nice, Cannes, Antibes, Monaco, Grasse, Menton et des Alpes-Maritimes, puis les grands sujets nationaux et internationaux qui intéressent ces lecteurs. Un sujet ne doit pas déjà avoir été traité :
${recentsTitres.map((t) => `- ${t}`).join("\n") || "(aucun)"}

Pour chaque sujet, indique la rubrique, une étiquette courte, une phrase de description et les numéros de toutes les dépêches qui en parlent (plusieurs médias si possible). N'écarte pas un sujet important parce qu'il n'a qu'une source. Évite les faits divers concernant des particuliers sans intérêt public.` }],
  });

  // 3. Rédaction.
  let faits = 0;
  for (const s of (plan.sujets || []).slice(0, nombre)) {
    const sources = s.depeches.map((i) => liste[i]).filter(Boolean);
    if (!sources.length || !RUBRIQUES[s.section]) continue;
    try {
      const fr = await appel({
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_ARTICLE } },
        system: `Tu es journaliste à L'Écho des Anges, quotidien basé à Nice, rubrique « ${s.section} ». Tu écris en français un article original sur le sujet indiqué, à partir des informations fournies.

Exactitude (règle absolue) : n'utilise que les faits présents dans les informations fournies ; aucun chiffre, nom, date, lieu ou citation inventé. Attribue les faits à leur média dans le texte (« selon Nice-Matin », « rapporte France 3 Côte d'Azur »). Si deux médias divergent, donne les deux versions. Ne mets entre guillemets que des propos cités tels quels dans les informations fournies. Si les informations sont maigres, écris un article court plutôt que de remplir. Ne reprends pas les phrases des médias : reformule entièrement, avec ta propre construction.

Construction : titre de presse informatif (8 à 16 mots), chapô de 1 à 2 phrases, puis 3 à 6 paragraphes (200 à 450 mots).
${STYLE}`,
        messages: [{ role: "user", content: `Sujet : ${s.sujet}\n\n${sources.map((d) => `${d.source}${d.date ? ` (${new Date(d.date).toISOString().slice(0, 16)})` : ""}\nTitre : ${d.titre}\nRésumé : ${d.resume}`).join("\n\n")}` }],
      });
      const corps = fr.corps.map((p) => p.trim()).filter(Boolean);
      if (!fr.titre || !fr.chapo || corps.length < 2) throw new Error("article incomplet");

      const date = new Date().toISOString().slice(0, 10);
      const heure = new Date().toISOString();
      const R = RUBRIQUES[s.section];
      const id = `${date}-${slug(fr.titre)}`;
      if (db.some((a) => a.id === id)) continue;
      const base = {
        date, heure, section: s.section, rubrique: s.rubrique, emoji: R.emoji, type: "article", auteur: R.journaliste,
        liens: sources.map((d) => ({ titre: d.titre, source: d.source, url: d.url })),
        sources: [...new Set(sources.map((d) => d.source))],
        ...(s.sensible ? { photo: false } : {}),
      };
      db.push({ ...base, id, lang: "fr", titre: fr.titre.trim(), chapo: fr.chapo.trim(), corps });

      try {
        const en = await appel({
          output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA_ARTICLE } },
          system: "You translate articles from L'Écho des Anges, a Nice-based daily, into British English for its English edition. Keep every fact, figure, name and attribution exactly; write natural newspaper English. Keep French proper names and institutions as they are. Same number of paragraphs.",
          messages: [{ role: "user", content: JSON.stringify({ titre: fr.titre, chapo: fr.chapo, corps }) }],
        });
        db.push({ ...base, id: `${date}-en-${slug(fr.titre)}`, lang: "en", rubrique: s.section === "Nice & Côte d'Azur" ? "Riviera" : s.rubrique, titre: en.titre, chapo: en.chapo, corps: en.corps });
      } catch (e) { console.warn(`  (pas de version anglaise : ${e.message})`); }

      db.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : (x.type === "revue" ? 0 : 1) - (y.type === "revue" ? 0 : 1) || x.id.localeCompare(y.id)));
      writeFileSync(DB, JSON.stringify(db, null, 2) + "\n");
      faits++;
      console.log(`✓ [${s.section}] ${fr.titre} (${base.sources.join(", ")})`);
    } catch (e) {
      console.warn(`✗ ${s.sujet.slice(0, 70)} : ${e.message}`);
    }
  }
  console.log(`${faits} article(s) rédigé(s).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
