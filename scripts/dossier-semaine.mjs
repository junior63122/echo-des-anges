#!/usr/bin/env node
// « La semaine en … » : revue de presse thématique hebdomadaire, rédigée automatiquement,
// gratuitement et sans aucune API ni intelligence artificielle.
//
// Matière première : les dépêches collectées deux fois par jour dans les flux RSS des médias
// (donnees/fil.json, alimenté par generate-news.mjs) et les revues du jour (articles.json).
// Méthode :
//   1. on garde les dépêches des 7 derniers jours de la rubrique choisie ;
//   2. on regroupe celles qui parlent du même sujet (mots communs dans les titres) ;
//   3. on classe les sujets : actualité locale, nombre de médias qui l'ont traité, fraîcheur ;
//   4. on écrit l'article : chapô, un paragraphe par sujet (titre et extrait cités entre
//      guillemets et attribués au média, comme dans toute revue de presse), conclusion, sources.
// Rien n'est inventé : chaque phrase factuelle est une citation attribuée, avec le lien en fin d'article.
//
// Chaque exécution publie un dossier (FR et EN) sur la rubrique dont le dernier dossier est le
// plus ancien. Le workflow « journal-dossier » le lance le lundi, le mercredi et le vendredi.
// Usage : node scripts/dossier-semaine.mjs [--date=AAAA-MM-JJ] [--theme=Tech] [--force]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUBRIQUES } from "./generate-news.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB = join(ROOT, "articles.json");
const FIL = join(ROOT, "donnees", "fil.json");
const JOURS = 7;
const MIN_SUJETS = 4;
const MAX_SUJETS = 7;

const THEMES = {
  "Nice & Côte d'Azur": { slug: "nice-cote-d-azur", fr: { nom: "Nice et la Côte d'Azur", de: "de Nice et de la Côte d'Azur" }, en: { nom: "Nice and the French Riviera", de: "in Nice and on the French Riviera" } },
  Business: { slug: "economie", fr: { nom: "Économie", de: "économique" }, en: { nom: "Business", de: "in business" } },
  Finance: { slug: "finance", fr: { nom: "Finance", de: "financière" }, en: { nom: "Finance", de: "in finance" } },
  "Événementiel": { slug: "evenementiel", fr: { nom: "Événementiel", de: "de l'événementiel" }, en: { nom: "Events", de: "in events" } },
  Tech: { slug: "tech", fr: { nom: "Tech", de: "de la tech" }, en: { nom: "Tech", de: "in tech" } },
  Sport: { slug: "sport", fr: { nom: "Sport", de: "sportive" }, en: { nom: "Sport", de: "in sport" } },
  Monde: { slug: "international", fr: { nom: "International", de: "internationale" }, en: { nom: "World", de: "around the world" } },
};
const LOCAL = /\b(nice|niçois|cannes|cannois|antibes|monaco|monégasque|menton|grasse|cagnes|saint-laurent-du-var|villefranche|sophia|côte d'azur|cote d'azur|riviera|alpes-maritimes|var|toulon|fréjus|marseille|provence|paca|région sud|ogc nice|as monaco)\b/i;
const STOP = new Set("avec dans pour plus mais sont cette leurs entre après avant depuis contre sans sous chez comme tout tous toute toutes elle elles ils nous vous être avoir fait faire font sera quand quoi dont cela celle ceux encore aussi très trop peut veut deux trois selon face vers lors alors ainsi notre votre their there about after before over under with from that this what when will would could have been were into more than they them your just says said year years new news first last week".split(" "));

const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const DATE = arg("date") || new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
const FORCE = process.argv.includes("--force");

const hash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const pick = (list, seed) => list[hash(seed) % list.length];
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const mots = (s) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)));
const nettoyer = (t) => String(t || "").replace(/\s+[-|–]\s+[^-|–]{2,40}$/, "").replace(/\s+/g, " ").trim().replace(/(?<![.]{2})\.$/, "");
const jourDe = (iso, lang) => new Date(iso).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
const dateCourte = (d, lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).replace(/^1 /, lang === "en" ? "1 " : "1er ");

// Première phrase utile d'un résumé, limitée à ~260 caractères, coupée sur un mot.
function extrait(resume, titre) {
  const r = String(resume || "").replace(/\s+/g, " ").trim();
  const nt = norm(titre).replace(/[^a-z0-9]+/g, " ").trim();
  if (!r || norm(r).replace(/[^a-z0-9]+/g, " ").includes(nt.slice(0, Math.min(40, nt.length)))) return "";
  const phrases = r.split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý«"“])/);
  let p = phrases.find((x) => x.length >= 40) || phrases[0];
  if (p.length > 260) p = p.slice(0, 259).replace(/[\s,;:.–-]+\S*$/, "") + "…";
  return p.replace(/^[«"“]\s*|\s*[»"”]$/g, "");
}

function listeEt(xs, lang) {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "et"} ${xs[xs.length - 1]}`;
}

function collecter(articles, fil, section, lang) {
  const debut = Date.parse(DATE + "T23:59:59Z") - JOURS * 864e5;
  const fin = Date.parse(DATE + "T23:59:59Z");
  const vus = new Map();
  const ajouter = (x) => {
    const t = Date.parse(x.date);
    if (!x.url || !x.titre || Number.isNaN(t) || t < debut || t > fin || vus.has(x.url)) return;
    vus.set(x.url, { ...x, titre: nettoyer(x.titre) });
  };
  for (const x of fil) if (x.lang === lang && x.section === section) ajouter(x);
  for (const a of articles) if (a.type === "revue" && a.lang === lang && a.section === section)
    for (const l of a.liens || []) ajouter({ ...l, date: l.heure || `${a.date}T08:00:00Z` });
  return [...vus.values()];
}

function sujets(items) {
  const groupes = [];
  for (const it of items.sort((a, b) => b.date.localeCompare(a.date))) {
    const m = mots(it.titre);
    const g = groupes.find((g) => {
      const commun = [...m].filter((w) => g.mots.has(w)).length;
      return commun >= 3 || (commun >= 2 && commun / Math.min(m.size, g.mots.size || 1) >= 0.5);
    });
    if (g) { g.items.push(it); for (const w of m) g.mots.add(w); } else groupes.push({ mots: m, items: [it] });
  }
  for (const g of groupes) {
    const medias = new Set(g.items.map((x) => x.source));
    const recent = Date.parse(DATE + "T23:59:59Z") - Date.parse(g.items[0].date) < 3 * 864e5;
    const texte = g.items.map((x) => `${x.titre} ${x.resume || ""}`).join(" ");
    // L'info principale du groupe : celle qui a le meilleur extrait.
    g.items.sort((a, b) => (extrait(b.resume, b.titre).length > 60) - (extrait(a.resume, a.titre).length > 60) || b.date.localeCompare(a.date));
    g.score = 1 + (LOCAL.test(texte) ? 2 : 0) + 1.5 * (medias.size - 1) + (recent ? 1 : 0) + (extrait(g.items[0].resume, g.items[0].titre) ? 0.5 : 0);
    g.medias = [...medias];
  }
  // Pas plus de trois sujets menés par le même média, pour varier les sources.
  const parMedia = {};
  return groupes.sort((a, b) => b.score - a.score).filter((g) => (parMedia[g.items[0].source] = (parMedia[g.items[0].source] || 0) + 1) <= 3).slice(0, MAX_SUJETS);
}

const TXT = {
  fr: {
    titres: [
      (t, p) => `${t.nom} : ce qu'il faut retenir de la semaine ${p}`,
      (t, p) => `La semaine ${t.de} en ${"sept"} sujets, ${p}`,
      (t, p) => `${t.nom} : les faits marquants de la semaine ${p}`,
    ],
    periode: (d1, d2) => (d1.split(" ").pop() === d2.split(" ").pop() ? `du ${d1.split(" ")[0]} au ${d2}` : `du ${d1} au ${d2}`),
    chapo: (n, m, sujets) => `${n} informations publiées par ${m} médias en sept jours. Au programme : ${sujets}.`,
    intro: (t, d1, d2, medias) => `Du ${d1} au ${d2}, la rédaction a suivi l'actualité ${t.de} à travers les publications de ${medias}. Voici les sujets qui ont marqué la semaine, du plus suivi au plus singulier.`,
    connecteurs: ["À la une de la semaine,", "Autre sujet marquant,", "Dans un autre registre,", "Par ailleurs,", "Toujours cette semaine,", "À noter également,", "Enfin,"],
    titrait: (src, jour) => `titrait ${src} ${jour}`,
    precise: [(s) => `Le média précise : « ${s} »`, (s) => `On peut y lire : « ${s} »`, (s) => `Extrait : « ${s} »`],
    aussi: (xs) => `Le sujet a également été traité par ${xs}.`,
    fin: "Cette revue de presse hebdomadaire est établie à partir des articles des médias cités : leurs titres et extraits sont reproduits entre guillemets, et les articles complets sont accessibles par les liens en fin de page.",
    rubrique: "La semaine",
  },
  en: {
    titres: [
      (t, p) => `${t.nom}: what mattered this week, ${p}`,
      (t, p) => `The week ${t.de}: the key stories, ${p}`,
      (t, p) => `${t.nom}: the week's main stories, ${p}`,
    ],
    periode: (d1, d2) => (d1.split(" ").pop() === d2.split(" ").pop() ? `${d1.split(" ")[0]} to ${d2}` : `${d1} to ${d2}`),
    chapo: (n, m, sujets) => `${n} stories from ${m} news outlets over seven days. In this round-up: ${sujets}.`,
    intro: (t, d1, d2, medias) => `From ${d1} to ${d2}, our newsroom followed the news ${t.de} through reporting by ${medias}. Here are the stories that marked the week.`,
    connecteurs: ["Leading the week,", "Another major story:", "Elsewhere,", "Meanwhile,", "Also this week,", "Worth noting,", "Finally,"],
    titrait: (src, jour) => `${src} reported on ${jour}`,
    precise: [(s) => `It added: “${s}”`, (s) => `From the article: “${s}”`, (s) => `In its words: “${s}”`],
    aussi: (xs) => `The story was also covered by ${xs}.`,
    fin: "This weekly press review is compiled from articles by the outlets cited: their headlines and excerpts are quoted, and the full articles are available through the links at the end of the page.",
    rubrique: "The week",
  },
};

function rediger(cle, groupes, lang) {
  const t = THEMES[cle][lang];
  const T = TXT[lang];
  const d2 = DATE;
  const d1 = new Date(Date.parse(DATE + "T12:00:00Z") - (JOURS - 1) * 864e5).toISOString().slice(0, 10);
  const items = groupes.flatMap((g) => g.items);
  const medias = [...new Set(items.map((x) => x.source))];
  const q = (s) => (lang === "en" ? `“${s}”` : `« ${s} »`);
  const periode = T.periode(dateCourte(d1, lang), dateCourte(d2, lang));
  const titre = pick(T.titres, cle + DATE)(t, periode).replace(" en sept sujets", ` en ${groupes.length} sujets`);
  const corps = [T.intro(t, dateCourte(d1, lang), dateCourte(d2, lang), listeEt(medias.slice(0, 6), lang) + (medias.length > 6 ? (lang === "en" ? " and others" : " notamment") : ""))];
  groupes.forEach((g, i) => {
    const it = g.items[0];
    const co = i === groupes.length - 1 && i > 0 ? T.connecteurs[T.connecteurs.length - 1] : T.connecteurs[Math.min(i, T.connecteurs.length - 2)];
    let p = `${co} ${q(it.titre)}, ${T.titrait(it.source, jourDe(it.date, lang))}.`;
    const ex = extrait(it.resume, it.titre);
    if (ex) p += ` ${pick(T.precise, it.url)(ex)}`;
    const autres = g.medias.filter((m) => m !== it.source);
    if (autres.length) p += ` ${T.aussi(listeEt(autres, lang))}`;
    corps.push(p.charAt(0).toUpperCase() + p.slice(1));
  });
  corps.push(T.fin);
  const rub = RUBRIQUES.find((r) => r.key === cle);
  return {
    id: `${DATE}${lang === "en" ? "-en" : ""}-hebdo-${THEMES[cle].slug}`,
    lang, date: DATE, section: cle, rubrique: T.rubrique, emoji: rub ? rub.emoji : "", type: "article", genre: "hebdo",
    auteur: rub ? rub.journaliste : "La rédaction",
    titre,
    chapo: T.chapo(items.length, medias.length, listeEt(groupes.slice(0, 3).map((g) => q(g.items[0].titre)), lang)),
    corps,
    sources: medias,
    liens: items.slice(0, 20).map((x) => ({ titre: x.titre, source: x.source, url: x.url, resume: x.resume || "", heure: x.date })),
    redige: true,
  };
}

function main() {
  const articles = JSON.parse(readFileSync(DB, "utf8"));
  const fil = existsSync(FIL) ? JSON.parse(readFileSync(FIL, "utf8")) : [];
  const dernier = (cle) => articles.filter((a) => a.genre === "hebdo" && a.section === cle && a.lang === "fr").map((a) => a.date).sort().pop() || "0000";
  // Rubrique choisie : celle dont le dernier dossier est le plus ancien (ou --theme).
  const ordre = arg("theme") ? [arg("theme")] : Object.keys(THEMES).sort((a, b) => dernier(a).localeCompare(dernier(b)) || Object.keys(THEMES).indexOf(a) - Object.keys(THEMES).indexOf(b));
  for (const cle of ordre) {
    if (!THEMES[cle]) throw new Error(`Rubrique inconnue : ${cle}`);
    if (!FORCE && !arg("theme") && Date.parse(DATE) - Date.parse(dernier(cle)) < 6 * 864e5) continue;
    const gfr = sujets(collecter(articles, fil, cle, "fr"));
    if (gfr.length < MIN_SUJETS) { console.log(`= ${cle} : seulement ${gfr.length} sujet(s), rubrique suivante`); continue; }
    const nouveaux = [rediger(cle, gfr, "fr")];
    const gen = sujets(collecter(articles, fil, cle, "en"));
    if (gen.length >= MIN_SUJETS) nouveaux.push(rediger(cle, gen, "en"));
    for (const art of nouveaux) {
      const i = articles.findIndex((a) => a.id === art.id);
      if (i >= 0) articles[i] = art; else articles.unshift(art);
      console.log(`+ [${art.lang}] ${art.titre} (${art.corps.length - 2} sujets, ${art.sources.length} médias)`);
    }
    writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
    return;
  }
  console.log("Aucun dossier publié : pas assez de matière cette fois-ci.");
}

main();
