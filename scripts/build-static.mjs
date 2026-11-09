#!/usr/bin/env node
// Référencement de L'Écho des Anges.
// Génère, à partir de articles.json et pages.js :
//  - une page HTML complète par article (a/<id>.html) : titre, description, adresse canonique,
//    hreflang, Open Graph / Twitter, données structurées NewsArticle + fil d'Ariane, texte intégral,
//    sujets liés et « À lire aussi » ;
//  - une page par rubrique (r/<rubrique>.html, r/<rubrique>-en.html) ;
//  - une page par sujet suivi (sujet/<slug>.html) : personnes et entreprises, avec fiche schema.org ;
//  - l'index de tous les articles (a/index.html), les pages fixes (p/*.html) et des redirections
//    pour les anciennes adresses ;
//  - une version pré-rendue de la une dans index.html (lisible sans JavaScript) ;
//  - sitemap.xml (avec images et versions linguistiques), news-sitemap.xml, feed.xml, llms.txt, robots.txt.
// Usage : node scripts/build-static.mjs   (SITE_URL=https://exemple.fr pour un autre domaine)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, openSync, readSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const J = ROOT; // le site est à la racine du dépôt
const SITE = (process.env.SITE_URL || "https://echodesanges.fr").replace(/\/$/, "");
const NOM = "L'Écho des Anges";
const DESC_FR = "L'Écho des Anges, le quotidien de la Baie des Anges : actualité de Nice, Cannes, Monaco et de la Côte d'Azur, économie, finance, événementiel, tech, international et sport.";
const DESC_EN = "L'Écho des Anges, the daily of the Baie des Anges: news from Nice, Cannes, Monaco and the French Riviera, business, finance, events, tech, world and sport.";
const ORG_ID = `${SITE}/#org`;
const SITE_ID = `${SITE}/#site`;

const SECTIONS = {
  Business: { fr: "Économie", en: "Business", slug: "economie",
    dfr: "L'actualité économique de Nice, de la Côte d'Azur et d'ailleurs : entreprises, start-up, emploi, commerce et tourisme.",
    den: "Business news from Nice, the French Riviera and beyond: companies, start-ups, jobs, retail and tourism." },
  Finance: { fr: "Finance", en: "Finance", slug: "finance",
    dfr: "Marchés, banques, investissement et levées de fonds : l'actualité financière suivie par la rédaction.",
    den: "Markets, banks, investment and fundraising: the financial news followed by our newsroom." },
  "Événementiel": { fr: "Événementiel", en: "Events", slug: "evenementiel",
    dfr: "Festivals, salons, soirées et grands rendez-vous de Nice, Cannes et Monaco : l'actualité de l'événementiel.",
    den: "Festivals, trade fairs, parties and major events in Nice, Cannes and Monaco." },
  Culture: { fr: "Culture", en: "Culture", slug: "culture",
    dfr: "Expositions, musées, théâtre, opéra, cinéma et musique : la vie culturelle de Nice, Cannes, Monaco et de la Côte d'Azur.",
    den: "Exhibitions, museums, theatre, opera, film and music: cultural life in Nice, Cannes, Monaco and on the French Riviera." },
  Sorties: { fr: "Sorties", en: "Going out", slug: "sorties",
    dfr: "Que faire, où aller : sorties, spectacles, fêtes, marchés et bons plans, avec l'agenda de la semaine sur la Côte d'Azur.",
    den: "Where to go and what to do: outings, shows, festivals and markets, with the weekly agenda for the French Riviera." },
  Tech: { fr: "Tech", en: "Tech", slug: "tech",
    dfr: "Intelligence artificielle, cybersécurité, applications et start-up : l'actualité technologique.",
    den: "Artificial intelligence, cybersecurity, apps and start-ups: technology news." },
  Monde: { fr: "International", en: "World", slug: "international",
    dfr: "L'essentiel de l'actualité internationale, vu depuis la Côte d'Azur.",
    den: "The essential world news, seen from the French Riviera." },
  "Nice & Côte d'Azur": { fr: "Nice & Côte d'Azur", en: "Nice & the Riviera", slug: "nice",
    dfr: "L'actualité de Nice, Cannes, Antibes, Grasse, Menton, Monaco et des Alpes-Maritimes.",
    den: "News from Nice, Cannes, Antibes, Grasse, Menton, Monaco and the Alpes-Maritimes." },
  Sport: { fr: "Sport", en: "Sport", slug: "sport",
    dfr: "OGC Nice, AS Monaco, rugby, handball, voile, rallye : le sport azuréen et international.",
    den: "OGC Nice, AS Monaco, rugby, handball, sailing, rallying: Riviera and international sport." },
};

// Sujets suivis : une page dédiée chacun, et une fiche schema.org reliée aux articles (champ « about »).
const SUJETS = [
  {
    slug: "junior-william-joyant", nom: "Junior William Joyant", re: /Junior William Joyant|Junior Joyant/,
    image: "img/articles/jwj-defile.jpg",
    entite: {
      "@type": "Person", name: "Junior William Joyant", alternateName: "Junior Joyant",
      jobTitle: "Entrepreneur", homeLocation: { "@type": "City", name: "Nice", sameAs: "https://fr.wikipedia.org/wiki/Nice" },
      knowsAbout: ["Événementiel", "Cybersécurité", "Géolocalisation", "Applications mobiles", "Vie nocturne de la Côte d'Azur"],
      founder: [{ "@id": `${SITE}/sujet/oneera/#org` }, { "@id": `${SITE}/sujet/teufy/#org` }],
      birthDate: "2002", birthPlace: { "@type": "Country", name: "Haïti" },
      sameAs: ["https://www.linkedin.com/in/junior-joyant-99876622b/", "https://www.instagram.com/junior_joyant/"],
      netWorth: { "@type": "MonetaryAmount", currency: "EUR", minValue: 2500000, maxValue: 4000000 },
    },
    fr: {
      titre: "Junior William Joyant : biographie, entreprises, fortune et actualité",
      h1: "Junior William Joyant",
      role: "Entrepreneur niçois, fondateur d'Oneera et de Teufy",
      desc: "Junior William Joyant, entrepreneur de 24 ans installé à Nice, fondateur d'Oneera et de Teufy : parcours, entreprises, fortune estimée entre 2,5 et 4 millions d'euros.",
      faits: [
        ["Âge", "24 ans (né en 2002)"],
        ["Origine", "Né en Haïti, adopté à 4 ans, a grandi à Clermont-Ferrand ; installé seul sur la Côte d'Azur à 19 ans"],
        ["Activité", "Entrepreneur dans la tech et l'événementiel"],
        ["Sociétés", "Oneera (2026, 70 %), Teufy (2021, 80 %), une agence informatique et de cybersécurité (2022, 90 %), une agence événementielle à Monaco (2023, 70 %)"],
        ["Formation", "Master en cybersécurité ; master en événementiel en cours"],
        ["Patrimoine professionnel", "Participations valorisées entre 2,5 et 4 millions d'euros"],
        ["Basé à", "Nice (Alpes-Maritimes)"],
      ],
      faq: [
        ["Qui est Junior William Joyant ?", "Junior William Joyant est un entrepreneur de 24 ans installé à Nice. Il a fondé Teufy, une application de sorties lancée en 2021, et Oneera, une société de cartographie en temps réel des lieux qui accueillent du public, créée en 2026."],
        ["Quelle est la fortune estimée de Junior William Joyant ?", "Ses participations professionnelles sont valorisées entre 2,5 et 4 millions d'euros. Ce montant repose sur les valorisations de référence de ses quatre sociétés, dont il détient la majorité du capital, et sur les propositions de rachat reçues pour certaines d'entre elles."],
        ["Quelles entreprises dirige-t-il ?", "Il détient la majorité du capital de quatre entreprises : Teufy, lancée en 2021 (80 %), une agence informatique et de cybersécurité créée en 2022 (90 %), une agence événementielle privée basée à Monaco depuis 2023 (70 %) et Oneera, immatriculée en mai 2026 (70 %)."],
        ["D'où vient Junior William Joyant ?", "Né en Haïti en 2002, il a été adopté à l'âge de 4 ans et est arrivé en France la même année. Il a grandi à Clermont-Ferrand, puis s'est installé seul sur la Côte d'Azur à 19 ans."],
        ["Quelle est sa formation ?", "Il est titulaire d'un master en cybersécurité et prépare un master en événementiel."],
        ["Où est-il basé ?", "Il vit et travaille à Nice, dans les Alpes-Maritimes, d'où il dirige ses sociétés."],
      ],
      bio: [
        "Junior William Joyant est un entrepreneur de 24 ans installé à Nice. Né en Haïti en 2002, adopté à 4 ans, il a grandi à Clermont-Ferrand avant de s'installer seul sur la Côte d'Azur à 19 ans. Il a fondé Teufy, une application de sorties qui recense soirées, festivals et bons plans sur la Côte d'Azur, puis Oneera, une société spécialisée dans la cartographie en temps réel des festivals, des clubs et des lieux qui accueillent du public.",
        "Avant de créer ses sociétés, il est passé par Taxi Nice Riviera et par Riva Boat Services, à Saint-Tropez, puis a pris en charge les opérations VIP, les coulisses et l'accueil dans de grands établissements de la nuit cannoise.",
        "Titulaire d'un master en cybersécurité, il prépare un master en événementiel. Il détient aussi 90 % d'une agence informatique et de cybersécurité créée en 2022 et 70 % d'une agence événementielle privée basée à Monaco depuis 2023. Ses participations sont valorisées entre 2,5 et 4 millions d'euros.",
      ],
    },
    en: {
      titre: "Junior William Joyant: biography, companies, net worth and news",
      h1: "Junior William Joyant",
      role: "Nice-based entrepreneur, founder of Oneera and Teufy",
      desc: "Junior William Joyant, 24-year-old Nice-based entrepreneur, founder of Oneera and Teufy: background, companies and net worth estimated at €2.5m to €4m.",
      faits: [
        ["Age", "24 (born 2002)"],
        ["Background", "Born in Haiti, adopted at 4, grew up in Clermont-Ferrand; moved to the French Riviera on his own at 19"],
        ["Occupation", "Entrepreneur in tech and events"],
        ["Companies", "Oneera (2026, 70%), Teufy (2021, 80%), an IT and cybersecurity agency (2022, 90%), a Monaco events agency (2023, 70%)"],
        ["Education", "Master's degree in cybersecurity; master's in event management under way"],
        ["Business holdings", "Stakes valued at €2.5m to €4m"],
        ["Based in", "Nice (Alpes-Maritimes)"],
      ],
      faq: [
        ["Who is Junior William Joyant?", "Junior William Joyant is a 24-year-old entrepreneur based in Nice. He founded Teufy, a going-out app launched in 2021, and Oneera, a company that builds real-time maps of venues open to the public, set up in 2026."],
        ["What is Junior William Joyant's estimated net worth?", "His business holdings are valued at between €2.5 million and €4 million. The figure is based on the reference valuations of his four companies, in which he holds majority stakes, and on buyout proposals received for some of them."],
        ["Which companies does he run?", "He holds majority stakes in four companies: Teufy, launched in 2021 (80%), an IT and cybersecurity agency set up in 2022 (90%), a private events agency based in Monaco since 2023 (70%) and Oneera, registered in May 2026 (70%)."],
        ["Where does Junior William Joyant come from?", "Born in Haiti in 2002, he was adopted at the age of four and came to France that same year. He grew up in Clermont-Ferrand, then moved to the French Riviera on his own at 19."],
        ["What is his educational background?", "He holds a master's degree in cybersecurity and is studying for a master's in event management."],
        ["Where is he based?", "He lives and works in Nice, in the Alpes-Maritimes, where he runs his companies."],
      ],
      bio: [
        "Junior William Joyant is a 24-year-old entrepreneur based in Nice. Born in Haiti in 2002 and adopted at four, he grew up in Clermont-Ferrand before moving to the French Riviera on his own at 19. He founded Teufy, a going-out app listing parties, festivals and deals on the French Riviera, then Oneera, a company that builds real-time maps of festivals, clubs and other venues open to the public.",
        "Before starting his companies, he worked for Taxi Nice Riviera and Riva Boat Services in Saint-Tropez, then ran VIP operations, backstage and guest services at major Cannes nightlife venues.",
        "He holds a master's degree in cybersecurity and is studying for a master's in event management. He also owns 90% of an IT and cybersecurity agency set up in 2022 and 70% of a private events agency based in Monaco since 2023. His stakes are valued at between €2.5 million and €4 million.",
      ],
    },
  },
  {
    slug: "oneera", nom: "Oneera", re: /Oneera/, image: "img/articles/jwj-climathon.jpg",
    entite: {
      "@type": "Organization", name: "Oneera", foundingDate: "2026-05",
      foundingLocation: { "@type": "City", name: "Nice" },
      founder: { "@id": `${SITE}/sujet/junior-william-joyant/#person` },
      sameAs: ["https://www.instagram.com/oneera_official/"],
      description: "Cartographie en temps réel des festivals, des clubs et des lieux qui accueillent du public.",
    },
    fr: {
      titre: "Oneera : la start-up niçoise de cartographie en temps réel",
      h1: "Oneera", role: "Start-up niçoise de cartographie en temps réel des lieux accueillant du public",
      desc: "Oneera, start-up fondée à Nice en 2026 par Junior William Joyant : cartographie en temps réel des festivals et des clubs, fonctionnement, essais et articles.",
      faits: [["Création", "Mai 2026, à Nice"], ["Fondateur", "Junior William Joyant (70 % du capital)"], ["Activité", "Cartographie en temps réel, gestion de foule"], ["Technologies", "GPS en extérieur, balises Bluetooth en intérieur"]],
      bio: [
        "Oneera développe une cartographie en temps réel des festivals, des clubs et des lieux qui accueillent du public. Les visiteurs se repèrent et retrouvent leurs proches depuis leur téléphone ; les organisateurs suivent la densité de la foule, reçoivent les signalements d'incidents et coordonnent leurs équipes depuis un tableau de bord.",
        "Fondée à Nice en mai 2026 par Junior William Joyant, la société a mené ses premiers essais dans des clubs cannois et envisage d'ouvrir 20 à 30 % de son capital à des investisseurs.",
      ],
    },
    en: {
      titre: "Oneera: the Nice start-up mapping venues in real time",
      h1: "Oneera", role: "Nice start-up building real-time maps of venues open to the public",
      desc: "Oneera, a start-up founded in Nice in 2026 by Junior William Joyant: real-time maps of festivals and clubs, how it works, trials and articles.",
      faits: [["Founded", "May 2026, in Nice"], ["Founder", "Junior William Joyant (70% of the capital)"], ["Business", "Real-time mapping, crowd management"], ["Technology", "Outdoor GPS, indoor Bluetooth beacons"]],
      bio: [
        "Oneera builds real-time maps of festivals, clubs and other venues open to the public. Visitors find their way and locate their friends from their phone; organisers monitor crowd density, receive incident reports and coordinate their teams from a dashboard.",
        "Founded in Nice in May 2026 by Junior William Joyant, the company ran its first trials in Cannes clubs and is considering opening 20 to 30% of its capital to investors.",
      ],
    },
  },
  {
    slug: "teufy", nom: "Teufy", re: /Teufy/, image: null,
    entite: {
      "@type": "Organization", name: "Teufy", foundingDate: "2021",
      founder: { "@id": `${SITE}/sujet/junior-william-joyant/#person` },
      areaServed: ["Côte d'Azur", "Var"],
      sameAs: ["https://www.instagram.com/teufy_official/"],
      description: "Application de sorties : soirées, festivals et bons plans à proximité.",
    },
    fr: {
      titre: "Teufy : l'application de sorties de la Côte d'Azur",
      h1: "Teufy", role: "Application de sorties sur la Côte d'Azur et dans le Var",
      desc: "Teufy, application de sorties lancée en 2021 par Junior William Joyant : soirées, festivals et bons plans, plus de 200 partenaires sur la Côte d'Azur et dans le Var.",
      faits: [["Lancement", "2021"], ["Fondateur", "Junior William Joyant (80 %)"], ["Partenaires", "Plus de 200, sur la Côte d'Azur et dans le Var"], ["Projet", "Refonte complète prévue d'ici à 2027-2028"]],
      bio: ["Lancée en 2021 par Junior William Joyant, Teufy est une application de sorties qui recense soirées, festivals et bons plans à proximité, tout en offrant de la visibilité aux établissements. Elle a fédéré plus de 200 partenaires entre la Côte d'Azur et le Var et doit être entièrement repensée d'ici à 2027-2028."],
    },
    en: {
      titre: "Teufy: the French Riviera going-out app",
      h1: "Teufy", role: "Going-out app for the French Riviera and the Var",
      desc: "Teufy, a going-out app launched in 2021 by Junior William Joyant: parties, festivals and deals, with more than 200 partners on the French Riviera and in the Var.",
      faits: [["Launched", "2021"], ["Founder", "Junior William Joyant (80%)"], ["Partners", "More than 200, on the French Riviera and in the Var"], ["Plans", "Full overhaul due by 2027-2028"]],
      bio: ["Launched in 2021 by Junior William Joyant, Teufy is a going-out app listing nearby parties, festivals and deals while giving venues more visibility. It has brought together more than 200 partners across the French Riviera and the Var, and is due to be completely overhauled by 2027-2028."],
    },
  },
];
const LIEUX = [
  { re: /\bNice\b/, item: { "@type": "City", name: "Nice", sameAs: "https://fr.wikipedia.org/wiki/Nice" } },
  { re: /\bCannes\b/, item: { "@type": "City", name: "Cannes", sameAs: "https://fr.wikipedia.org/wiki/Cannes" } },
  { re: /\bMonaco\b/, item: { "@type": "Country", name: "Monaco", sameAs: "https://fr.wikipedia.org/wiki/Monaco" } },
];
const sujetChemin = (s, lang) => `${lang === "en" ? "/en/topic" : "/sujet"}/${s.slug}/`;
const sujetUrl = (s, lang) => `${SITE}${sujetChemin(s, lang)}`;
const profilNom = (u) => (/linkedin\.com/.test(u) ? "LinkedIn" : /instagram\.com\/([^/]+)/.test(u) ? `Instagram @${u.match(/instagram\.com\/([^/]+)/)[1]}` : u);
const sujetId = (s) => `${SITE}/sujet/${s.slug}/#${s.entite["@type"] === "Person" ? "person" : "org"}`;

// Anciennes adresses d'articles déplacés (changement de date) → nouvelle adresse.
const REDIRECTIONS = {
  "2026-11-06-portrait-junior-william-joyant": "2026-09-23-portrait-junior-william-joyant",
  "2026-11-06-en-portrait-junior-william-joyant": "2026-09-23-en-portrait-junior-william-joyant",
  "2026-11-05-oneera-cartographie-temps-reel": "2026-06-17-oneera-cartographie-temps-reel",
  "2026-11-05-en-oneera-cartographie-temps-reel": "2026-06-17-en-oneera-cartographie-temps-reel",
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const xml = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const langOf = (a) => a.lang || "fr";
const twinKey = (a) => (langOf(a) === "en" ? a.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-") : a.id);
const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
// Heure de Paris : +01:00 l'hiver, +02:00 l'été (dernier dimanche de mars → dernier dimanche d'octobre).
const decalage = (d) => {
  const y = +d.slice(0, 4);
  const dim = (m) => { const x = new Date(Date.UTC(y, m + 1, 0)); return x.getUTCDate() - x.getUTCDay(); };
  const t = Date.parse(d + "T12:00:00Z");
  return t >= Date.UTC(y, 2, dim(2)) && t < Date.UTC(y, 9, dim(9)) ? "+02:00" : "+01:00";
};
const iso = (a) => a.heure || (a.precision === "annee" ? a.date.slice(0, 4) : `${a.date}T08:00:00${decalage(a.date)}`);
const isoComplet = (a) => (a.precision === "annee" ? `${a.date.slice(0, 4)}-01-01T08:00:00+01:00` : iso(a));
const modifie = (a) => (a.redigeSur && a.redigeSur > isoComplet(a) ? a.redigeSur : isoComplet(a));
const quand = (a) => (a.precision === "annee" ? a.date.slice(0, 4) : a.precision === "mois" ? new Date(a.date + "T12:00:00Z").toLocaleDateString(langOf(a) === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }) : dateLong(a.date, langOf(a)));
const dateLong = (d, lang) => new Date(d + "T12:00:00Z").toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fichier = (id) => `${id.replace(/[^a-z0-9-]/gi, "-")}.html`;
const url = (a) => `${SITE}${a.chemin}`;
const texteDe = (a) => (a.chapo || (a.liens && a.liens[0] && a.liens[0].resume) || "").replace(/\s+/g, " ").trim();
// Description de 155 caractères au plus, coupée à la fin d'un mot.
const couper = (s, n = 155) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,;:.–-]+\S*$/, "") + "…"; };
const resume = (a) => couper(texteDe(a));
// Adresses lisibles : /economie/2026/09/23/portrait-.../ ; /en/business/... pour l'anglais.
const SLUG_EN = { economie: "business", finance: "finance", evenementiel: "events", culture: "culture", sorties: "going-out", tech: "tech", international: "world", nice: "riviera", sport: "sport" };
const secChemin = (slug, lang) => (lang === "en" ? `/en/${SLUG_EN[slug] || slug}/` : `/${slug}/`);
const secLien = (slug, lang) => `${SITE}${secChemin(slug, lang)}`;
const CHEMINS_FIXES = { histoire: { fr: "/histoire/", en: "/en/our-story/" }, mentions: { fr: "/mentions-legales/", en: "/en/legal-notice/" }, contact: { fr: "/contact/", en: "/en/contact/" } };
const archivesChemin = (lang) => (lang === "en" ? "/en/archives/" : "/archives/");
const rechercheChemin = (lang) => (lang === "en" ? "/en/search/" : "/recherche/");
const accueilChemin = (lang) => (lang === "en" ? "/en/" : "/");
const TOUS = "/tous-les-articles/";

const articlesBrut = readFileSync(join(J, "articles.json"), "utf8");
const articles = JSON.parse(articlesBrut);
// Typographie : apostrophes typographiques, espaces insécables à la française (avant « : ; ! ? » et dans les guillemets).
const typo = (t, lang) => {
  if (typeof t !== "string") return t;
  t = t.replace(/(\p{L})'(?=\p{L})/gu, "$1’");
  if (lang !== "en") t = t.replace(/ ([;!?])/g, "\u202F$1").replace(/ :/g, "\u00A0:").replace(/« /g, "«\u00A0").replace(/ »/g, "\u00A0»");
  return t;
};
for (const a of articles) {
  const l = a.lang || "fr";
  a.titre = typo(a.titre, l); a.chapo = typo(a.chapo, l);
  if (Array.isArray(a.corps)) a.corps = a.corps.map((p) => typo(p, l));
  if (a.image && a.image.legende) for (const k of Object.keys(a.image.legende)) a.image.legende[k] = typo(a.image.legende[k], k);
}
// Chaque contenu reçoit son adresse définitive (« chemin »), partagée avec l'application (journal.js).
{
  const pris = new Set();
  for (const a of articles) {
    const en = (a.lang || "fr") === "en";
    const [y, m, d] = a.date.split("-");
    let chemin;
    if (a.type === "archive") {
      const slug = a.id.replace(/^archive-\d{4}-\d\d-\d\d-(en-)?/, "").replace(/^lecture-\d{4}-\d+-/, "");
      chemin = `${en ? "/en" : ""}/archives/${y}/${slug}/`;
    } else {
      const sec = Object.keys(SECTIONS).includes(a.section) ? SECTIONS[a.section].slug : "actualite";
      const slug = a.type === "revue" ? (en ? "press-review" : "revue-de-presse") : a.id.replace(/^\d{4}-\d\d-\d\d-(en-)?/, "");
      chemin = `${secChemin(sec, en ? "en" : "fr")}${y}/${m}/${d}/${slug}/`;
    }
    let final = chemin, n = 2;
    while (pris.has(final)) final = chemin.replace(/\/$/, `-${n++}/`);
    pris.add(final);
    a.chemin = final;
  }
  const nouveau = JSON.stringify(articles, null, 2) + "\n";
  if (nouveau !== articlesBrut) writeFileSync(join(J, "articles.json"), nouveau);
}
const credits = existsSync(join(J, "img/stock/credits.json")) ? JSON.parse(readFileSync(join(J, "img/stock/credits.json"), "utf8")) : {};

// Pages fixes : on exécute pages.js dans un bac à sable pour récupérer son contenu.
const bac = { window: {} };
vm.runInNewContext(readFileSync(join(J, "pages.js"), "utf8"), bac);
const PAGES = bac.window.JOURNAL_PAGES || {};
const CONFIG = bac.window.JOURNAL_CONFIG || {};

// Seuls les contenus rédigés sont indexés (les revues de presse brutes sont de simples listes de liens).
const indexables = articles.filter((a) => a.type === "article" || a.type === "archive" || (a.type === "revue" && a.redige && a.corps?.length));
const parDate = (x, y) => isoComplet(y).localeCompare(isoComplet(x));

// Dimensions des images (JPEG / PNG), pour les balises width/height et og:image.
const tailles = {};
function dimensions(src) {
  if (src in tailles) return tailles[src];
  let r = null;
  try {
    const fd = openSync(join(J, src), "r"); const buf = Buffer.alloc(65536); const n = readSync(fd, buf, 0, buf.length, 0); closeSync(fd);
    if (buf.readUInt32BE(0) === 0x89504e47) r = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    else if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i < n - 9) {
        if (buf[i] !== 0xff) { i++; continue; }
        const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { r = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; break; }
        i += 2 + len;
      }
    }
  } catch { r = null; }
  return (tailles[src] = r);
}
const dimAttr = (src) => { const d = dimensions(src); return d ? ` width="${d.w}" height="${d.h}"` : ""; };

function image(a) {
  if (a.photo === false) return null;
  if (a.image) return { src: a.image.src, credit: a.image.credit, legende: (a.image.legende || {})[langOf(a)] || "" };
  const pool = credits[a.section] || [];
  if (!pool.length) return null;
  const p = pool[hash(twinKey(a)) % pool.length];
  const org = p.origine === "wikimedia" ? "Wikimedia Commons" : p.origine === "pexels" ? "Pexels" : p.origine;
  return { src: `img/stock/${p.fichier}`, credit: `${p.auteur} / ${org} (${p.licence})`, legende: "" };
}

function tete({ lang, titre, description, canonical, type = "website", imageSrc, imageAlt, alternates = [], jsonld = [], extra = "", robots }) {
  const src = imageSrc || "img/og-default.jpg";
  const img = `${SITE}/${src}`;
  if (titre.length > 72) titre = titre.replace(/ \| L'Écho des Anges$/, "");
  const d = dimensions(src);
  const alt = alternates.length ? [...alternates, { lang: "x-default", href: (alternates.find((x) => x.lang === "fr") || alternates[0]).href }] : [];
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots || "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}">
<link rel="canonical" href="${canonical}">
${alt.map((x) => `<link rel="alternate" hreflang="${x.lang}" href="${x.href}">`).join("\n")}
<meta property="og:site_name" content="${esc(NOM)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(titre.replace(/ \| L'Écho des Anges$/, ""))}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${img}">
${d ? `<meta property="og:image:width" content="${d.w}">\n<meta property="og:image:height" content="${d.h}">\n` : ""}<meta property="og:image:alt" content="${esc(imageAlt || NOM)}">
<meta property="og:locale" content="${lang === "en" ? "en_GB" : "fr_FR"}">
<meta property="og:locale:alternate" content="${lang === "en" ? "fr_FR" : "en_GB"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titre.replace(/ \| L'Écho des Anges$/, ""))}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${img}">
${extra}
<meta name="theme-color" content="#0c1a2b">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(NOM)}" href="${SITE}/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;0,6..72,800;1,6..72,600;1,6..72,800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/journal.css">
${jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>`;
}

// En-tête et pied de page : ceux du site (index.html), pour que chaque page ait la même navigation.
const entete = (lang, actif) => `<!--ENTETE:${lang}:${actif || ""}-->`;
const pied = () => "";
const CORPS = readFileSync(join(J, "index.html"), "utf8").match(/<body>([\s\S]*)<\/body>/)[1];
function corpsSite(lang, actif, contenu) {
  const en = lang === "en";
  const nav = `<a class="home" href="${accueilChemin(lang)}"${actif === "accueil" ? ' aria-current="page"' : ""}>${en ? "Front page" : "À la une"}</a>`
    + Object.values(SECTIONS).map((x) => `<a href="${secChemin(x.slug, lang)}" data-sec="${x.slug}"${actif === x.slug ? ' aria-current="page"' : ""}>${esc(x[lang])}</a>`).join("")
    + `<a href="${archivesChemin(lang)}" data-sec="archives"${actif === "archives" ? ' aria-current="page"' : ""}>Archives</a>`;
  const rubs = Object.values(SECTIONS).map((x) => `<li><a href="${secChemin(x.slug, lang)}">${esc(x[lang])}</a></li>`).join("");
  return CORPS
    .replace(/<a class="logo" href="[^"]*"/, `<a class="logo" href="${accueilChemin(lang)}"`)
    .replace(/(<nav class="sections" id="sections"[^>]*>)<\/nav>/, `$1${nav}</nav>`)
    .replace(/(<ul id="footer-sections" class="footer-list">)<\/ul>/, `$1${rubs}</ul>`)
    .replace(/<main id="app">[\s\S]*?<\/main>/, () => `<main id="app" data-statique="1">${contenu}</main>`);
}
function assembler(html) {
  const m = html.match(/^([\s\S]*?<body>)\s*<!--ENTETE:(\w+):([\w-]*)-->\s*<main id="contenu">([\s\S]*?)<\/main>/);
  if (!m) throw new Error("Page mal formée");
  return `${m[1]}\n${corpsSite(m[2], m[3], m[4])}\n</body>\n</html>\n`;
}

const editeur = {
  "@type": "NewsMediaOrganization", "@id": ORG_ID, name: NOM, url: `${SITE}/`,
  logo: { "@type": "ImageObject", url: `${SITE}/img/logo-512.png`, width: 512, height: 512 },
  foundingDate: "2018", foundingLocation: { "@type": "City", name: "Nice" },
  publishingPrinciples: `${SITE}/histoire/`,
  ...(CONFIG.contact ? { contactPoint: { "@type": "ContactPoint", contactType: "newsroom", email: CONFIG.contact, url: `${SITE}/contact/`, availableLanguage: ["fr", "en"] } } : {}),
};

const vignetteListe = (a) => { const i = image(a); return i ? `<a class="li-img" href="${url(a)}" tabindex="-1" aria-hidden="true"><img src="/${i.src}" alt="" loading="lazy" decoding="async"${dimAttr(i.src)}></a>` : ""; };
const listeArticles = (liste, lang) => liste.map((a) => `<article class="list-item${image(a) ? " avec-photo" : ""}">${vignetteListe(a)}<span class="kicker">${esc((SECTIONS[a.section] || {})[lang] || a.section)}<span class="sep" aria-hidden="true"></span><time datetime="${iso(a)}">${esc(quand(a))}</time></span><h3><a href="${url(a)}">${esc(a.titre)}</a></h3><p>${esc(resume(a))}</p></article>`).join("\n");

const ICONES = {x:"M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",fb:"M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z",li:"M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",wa:"M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z",mail:"M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2.3V17h16V7.3l-8 5.2z",lien:"M10.6 13.4a1 1 0 0 0 1.4 0l4.6-4.6a3 3 0 0 0-4.2-4.2l-1.6 1.6 1.4 1.4 1.6-1.6a1 1 0 0 1 1.4 1.4l-4.6 4.6a1 1 0 0 0 0 1.4zm2.8-2.8a1 1 0 0 0-1.4 0l-4.6 4.6a3 3 0 0 0 4.2 4.2l1.6-1.6-1.4-1.4-1.6 1.6a1 1 0 0 1-1.4-1.4l4.6-4.6a1 1 0 0 0 0-1.4z"};
const svgIcone = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[k]}"/></svg>`;
// Barre de partage (liens simples, aucun script tiers) et temps de lecture.
const barrePartage = (adresse, titre, mots, en) => {
  const u = encodeURIComponent(adresse), t = encodeURIComponent(titre);
  const min = Math.max(1, Math.round(mots / 230));
  const L = en ? { lire: `${min} min read`, sur: "Share on", mail: "Share by email", copier: "Copy link" } : { lire: `Lecture : ${min} min`, sur: "Partager sur", mail: "Partager par courriel", copier: "Copier le lien" };
  return `<div class="partage"><span class="lecture">${L.lire}</span>`
    + `<a href="https://twitter.com/intent/tweet?url=${u}&amp;text=${t}" target="_blank" rel="noopener" aria-label="${L.sur} X">${svgIcone("x")}</a>`
    + `<a href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" aria-label="${L.sur} Facebook">${svgIcone("fb")}</a>`
    + `<a href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" target="_blank" rel="noopener" aria-label="${L.sur} LinkedIn">${svgIcone("li")}</a>`
    + `<a href="https://wa.me/?text=${t}%20${u}" target="_blank" rel="noopener" aria-label="${L.sur} WhatsApp">${svgIcone("wa")}</a>`
    + `<a href="mailto:?subject=${t}&amp;body=${u}" aria-label="${L.mail}">${svgIcone("mail")}</a>`
    + `<button type="button" class="copier" data-lien="${adresse}" aria-label="${L.copier}">${svgIcone("lien")}</button></div>`;
};

// Colonne de droite des articles (grand écran) : dernières actualités et articles de la même rubrique.
function rail(a, lang) {
  const T = lang === "en" ? { last: "Latest news", sec: "In this section" } : { last: "Dernières actualités", sec: "Dans la rubrique" };
  const memes = indexables.filter((x) => x !== a && langOf(x) === lang && x.type === "article").sort(parDate);
  const derniers = memes.slice(0, 6);
  const rubrique = memes.filter((x) => x.section === a.section && !derniers.includes(x)).slice(0, 5);
  const liste = (l) => `<ol>${l.map((x) => `<li><a href="${x.chemin}">${esc(x.titre)}</a><time datetime="${iso(x)}">${esc(quand(x))}</time></li>`).join("")}</ol>`;
  return `<aside class="rail" aria-label="${T.last}"><div class="rail-inner"><h2>${T.last}</h2>${liste(derniers)}${rubrique.length ? `<h2>${T.sec}</h2>${liste(rubrique)}` : ""}</div></aside>`;
}

function pageArticle(a) {
  const lang = langOf(a);
  const sec = SECTIONS[a.section] || { fr: a.section, en: a.section, slug: "" };
  const img = image(a);
  const imgAbs = img ? `${SITE}/${img.src}` : `${SITE}/img/og-default.jpg`;
  const twin = indexables.find((x) => x !== a && langOf(x) !== lang && twinKey(x) === twinKey(a));
  const alternates = twin ? [{ lang, href: url(a) }, { lang: langOf(twin), href: url(twin) }] : [];
  const texte = `${a.titre} ${a.chapo} ${(a.corps || []).join(" ")}`;
  const sujets = SUJETS.filter((s) => s.re.test(texte));
  const about = [...sujets.map((s) => ({ "@id": sujetId(s), "@type": s.entite["@type"], name: s.nom })), ...LIEUX.filter((s) => s.re.test(texte)).map((s) => s.item)];
  const T = lang === "en"
    ? { by: "By", pub: "Published on", pubIn: "Published in", src: "Sources", photo: "Photo", topics: "Topics", also: "Read also", home: "Front page" }
    : { by: "Par", pub: "Publié le", pubIn: "Publié en", src: "Sources", photo: "Photo", topics: "Sujets", also: "À lire aussi", home: "À la une" };
  const ld = {
    "@context": "https://schema.org",
    "@type": a.type === "archive" ? "Article" : "NewsArticle",
    "@id": `${url(a)}#article`,
    headline: a.titre.length > 110 ? couper(a.titre, 110) : a.titre,
    description: resume(a),
    inLanguage: lang,
    datePublished: isoComplet(a),
    dateModified: modifie(a),
    articleSection: sec[lang],
    // Liens internes (liensInternes) : déclarés aux moteurs et aux IA uniquement, jamais affichés aux lecteurs.
    mainEntityOfPage: { "@type": "WebPage", "@id": url(a), ...(a.liensInternes?.length ? { relatedLink: a.liensInternes.map((l) => l.url) } : {}) },
    url: url(a),
    image: img ? [{ "@type": "ImageObject", url: imgAbs, ...(dimensions(img.src) ? { width: dimensions(img.src).w, height: dimensions(img.src).h } : {}), ...(img.credit ? { creditText: img.credit } : {}) }] : [imgAbs],
    author: { "@type": "Organization", "@id": ORG_ID, name: NOM, url: `${SITE}/` },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": SITE_ID },
    isAccessibleForFree: true,
    wordCount: (a.corps || []).join(" ").split(/\s+/).filter(Boolean).length,
    articleBody: (a.corps || []).map((p) => p.replace(/^## /, "")).join("\n\n"),
    ...(about.length ? { about } : {}),
    ...(sujets.length ? { mentions: sujets.map((s) => ({ "@id": sujetId(s) })) } : {}),
    ...(a.liens?.length ? { citation: a.liens.map((l) => ({ "@type": "CreativeWork", name: l.titre, url: l.url, publisher: { "@type": "Organization", name: l.source } })) } : {}),
    ...(twin ? { workTranslation: { "@id": `${url(twin)}#article` } } : {}),
  };
  const filNom = a.type === "archive" ? "Archives" : sec[lang];
  const filUrl = a.type === "archive" ? `${SITE}${archivesChemin(lang)}` : secLien(sec.slug, lang);
  const fil = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NOM, item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: filNom, item: filUrl },
    { "@type": "ListItem", position: 3, name: a.titre, item: url(a) },
  ] };
  const rub = a.rubrique && a.rubrique !== "Archives" && a.rubrique !== sec[lang] && a.type !== "revue" ? `<span class="sep" aria-hidden="true"></span>${esc(a.rubrique)}` : "";
  const fig = img ? `<figure class="fig ${a.image && !a.image.paysage ? "hero-portrait" : "hero"}"><img src="/${img.src}" alt="${esc(img.legende || a.titre)}"${dimAttr(img.src)} fetchpriority="high"><figcaption>${img.legende ? `<span>${esc(img.legende)}</span> ` : ""}<span class="credit">${T.photo} : ${esc(img.credit)}</span></figcaption></figure>` : "";
  const galerie = a.galerie?.length ? `<div class="galerie">${a.galerie.map((g) => `<figure class="fig"><img src="/${esc(g.src)}" alt="${esc((g.legende || {})[lang] || a.titre)}"${dimAttr(g.src)} loading="lazy" decoding="async"><figcaption><span>${esc((g.legende || {})[lang] || "")}</span> <span class="credit">${T.photo} : ${esc(g.credit)}</span></figcaption></figure>`).join("")}</div>` : "";
  const sources = a.liens?.length ? `<section class="sources-list"><h2>${T.src}</h2><ul>${a.liens.map((l) => `<li><a href="${esc(l.url)}" rel="noopener nofollow" target="_blank">${esc(l.titre)}</a> <span>(${esc(l.source)})</span></li>`).join("")}</ul></section>` : "";
  const tags = sujets.length ? `<p class="tags">${T.topics} : ${sujets.map((s) => `<a href="${sujetUrl(s, lang)}">${esc(s.nom)}</a>`).join(", ")}</p>` : "";
  // À lire aussi : d'abord les articles qui partagent un sujet, puis les plus récents de la rubrique.
  const memeLangue = indexables.filter((x) => x !== a && langOf(x) === lang && x !== twin);
  const proches = [...memeLangue.filter((x) => sujets.some((s) => s.re.test(`${x.titre} ${x.chapo}`))).sort(parDate),
    ...memeLangue.filter((x) => x.section === a.section && x.type === a.type).sort(parDate)];
  const aussi = [...new Set(proches)].slice(0, 4);
  const lireAussi = aussi.length ? `<section class="related"><h2>${T.also}</h2><ul>${aussi.map((x) => `<li><a href="${url(x)}">${esc(x.titre)}</a> <span>${esc(quand(x))}</span></li>`).join("")}</ul></section>` : "";
  return tete({
    lang, titre: `${a.titre} | ${NOM}`, description: resume(a), canonical: url(a), type: "article", imageSrc: img && img.src, imageAlt: img ? img.legende || a.titre : null, alternates, jsonld: [ld, fil],
    extra: `<meta property="article:published_time" content="${isoComplet(a)}">\n<meta property="article:modified_time" content="${modifie(a)}">\n<meta property="article:section" content="${esc(sec[lang])}">\n${sujets.map((s) => `<meta property="article:tag" content="${esc(s.nom)}">`).join("\n")}`,
  }) + entete(lang, a.type === "archive" ? null : sec.slug) + `
<main id="contenu">
<div class="article-layout">
<article class="article">
  <nav class="crumbs" aria-label="${lang === "en" ? "Breadcrumb" : "Fil d'Ariane"}"><a href="${SITE}/">${T.home}</a><span class="sep" aria-hidden="true"></span><a href="${filUrl}">${esc(filNom)}</a>${rub}</nav>
  <h1>${esc(a.titre)}</h1>
  <p class="chapo">${esc(a.chapo)}</p>
  <div class="meta-line"><strong>${T.by} ${esc(a.auteur)}</strong><span class="when">${a.type === "archive" || a.precision === "annee" ? "" : (a.precision === "mois" ? T.pubIn : T.pub) + " "}<time datetime="${isoComplet(a)}">${esc(quand(a))}</time></span>${a.sources?.length ? `<span class="sources">${T.src} : ${esc(a.sources.join(", "))}</span>` : ""}${twin ? `<a class="lang-switch" href="${url(twin)}" hreflang="${langOf(twin)}">${langOf(twin) === "en" ? "Read in English" : "Lire en français"}</a>` : ""}</div>
  ${barrePartage(url(a), a.titre, (a.corps || []).join(" ").split(/\s+/).length, lang === "en")}
  ${fig}
  ${(a.corps || []).map((p) => (p.startsWith("## ") ? `<h2 class="intertitre">${esc(p.slice(3))}</h2>` : `<p class="body">${esc(p)}</p>`)).join("\n  ")}
  ${galerie}
  ${tags}
  ${sources}
  ${lireAussi}
</article>
${rail(a, lang)}
</div>
</main>
` + pied(lang);
}

function pageRubrique(cle, lang) {
  const s = SECTIONS[cle];
  const liste = indexables.filter((a) => a.section === cle && langOf(a) === lang).sort(parDate);
  const recents = liste.filter((a) => a.type !== "archive").slice(0, 40);
  const archives = liste.filter((a) => a.type === "archive").slice(0, 60);
  const canon = secLien(s.slug, lang);
  const titre = lang === "en" ? `${s.en} news | ${NOM}` : `${s.fr} : toute l'actualité | ${NOM}`;
  const desc = lang === "en" ? s.den : s.dfr;
  const ld = {
    "@context": "https://schema.org", "@type": "CollectionPage", "@id": canon, name: s[lang], description: desc, url: canon, inLanguage: lang,
    isPartOf: { "@id": SITE_ID }, publisher: { "@id": ORG_ID },
    mainEntity: { "@type": "ItemList", itemListElement: [...recents, ...archives].slice(0, 30).map((a, i) => ({ "@type": "ListItem", position: i + 1, url: url(a), name: a.titre })) },
  };
  const fil = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NOM, item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: s[lang], item: canon }] };
  return tete({ lang, titre, description: desc, canonical: canon, alternates: [{ lang: "fr", href: secLien(s.slug, "fr") }, { lang: "en", href: secLien(s.slug, "en") }], jsonld: [ld, fil] })
    + entete(lang, s.slug) + `
<main id="contenu">
<div class="rubrique-head"><h1>${esc(s[lang])}</h1><p class="rubrique-chapo">${esc(desc)}</p></div>
<div class="list">
<h2 class="sr-only">${lang === "en" ? "Latest articles" : "Derniers articles"}</h2>
${recents.length ? listeArticles(recents, lang) : ""}
${archives.length ? `<h2 class="year">${lang === "en" ? "From the archives" : "Dans nos archives"}</h2>\n${listeArticles(archives, lang)}` : ""}
</div>
</main>
` + pied(lang);
}

function pageSujet(s, lang) {
  const F = s[lang];
  const canon = sujetUrl(s, lang);
  const liste = indexables.filter((a) => langOf(a) === lang && s.re.test(`${a.titre} ${a.chapo} ${(a.corps || []).join(" ")}`)).sort(parDate);
  const imgSrc = s.image || null;
  const entite = {
    ...s.entite, "@id": sujetId(s), url: `${SITE}/sujet/${s.slug}/`,
    description: F.role,
    ...(imgSrc ? { image: { "@type": "ImageObject", url: `${SITE}/${imgSrc}`, ...(dimensions(imgSrc) ? { width: dimensions(imgSrc).w, height: dimensions(imgSrc).h } : {}) } } : {}),
    subjectOf: liste.map((a) => ({ "@id": `${url(a)}#article` })),
  };
  const page = {
    "@context": "https://schema.org",
    "@type": s.entite["@type"] === "Person" ? "ProfilePage" : "AboutPage",
    "@id": canon, url: canon, name: F.titre, description: F.desc, inLanguage: lang,
    isPartOf: { "@id": SITE_ID }, publisher: { "@id": ORG_ID },
    dateModified: liste.length ? modifie(liste[0]) : undefined,
    mainEntity: entite,
  };
  const fil = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: NOM, item: `${SITE}/` }, { "@type": "ListItem", position: 2, name: s.nom, item: canon }] };
  const L = lang === "en" ? { prof: "Official profiles", key: "Key facts", arts: "Our articles", topic: "Topic", other: "Read also", faq: "Frequently asked questions" } : { prof: "Profils officiels", key: "Repères", arts: "Nos articles", topic: "Sujet", other: "À lire aussi", faq: "Questions fréquentes" };
  const faq = F.faq ? { "@context": "https://schema.org", "@type": "FAQPage", "@id": `${canon}#faq`, inLanguage: lang, about: { "@id": sujetId(s) },
    mainEntity: F.faq.map(([q, r]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: r } })) } : null;
  const autres = SUJETS.filter((x) => x !== s);
  return tete({ lang, titre: `${F.titre} | ${NOM}`, description: F.desc, canonical: canon, type: s.entite["@type"] === "Person" ? "profile" : "website", imageSrc: imgSrc, imageAlt: s.nom,
    alternates: [{ lang: "fr", href: sujetUrl(s, "fr") }, { lang: "en", href: sujetUrl(s, "en") }], jsonld: [page, fil, ...(faq ? [faq] : [])] })
    + entete(lang, "sujet") + `
<main id="contenu">
<article class="article page sujet">
  <div class="crumbs">${L.topic}</div>
  <h1>${esc(F.h1)}</h1>
  <p class="chapo">${esc(F.role)}</p>
  ${imgSrc ? `<figure class="fig hero-portrait"><img src="/${imgSrc}" alt="${esc(s.nom)}"${dimAttr(imgSrc)} fetchpriority="high"></figure>` : ""}
  ${F.bio.map((p) => `<p class="body">${esc(p)}</p>`).join("\n  ")}
  <section class="faits"><h2>${L.key}</h2><dl>${F.faits.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}${s.entite.sameAs ? `<dt>${L.prof}</dt><dd>${s.entite.sameAs.map((u) => `<a href="${esc(u)}" rel="noopener me" target="_blank">${esc(profilNom(u))}</a>`).join(", ")}</dd>` : ""}</dl></section>
  ${F.faq ? `<section class="faq"><h2>${L.faq}</h2>${F.faq.map(([q, r]) => `<h3>${esc(q)}</h3><p>${esc(r)}</p>`).join("")}</section>` : ""}
  ${liste.length ? `<section class="related"><h2>${L.arts}</h2><ul>${liste.map((a) => `<li><a href="${url(a)}">${esc(a.titre)}</a> <span>${esc(quand(a))}</span></li>`).join("")}</ul></section>` : ""}
  <section class="related"><h2>${L.other}</h2><ul>${autres.map((x) => `<li><a href="${sujetUrl(x, lang)}">${esc(x.nom)}</a> <span>${esc(x[lang].role)}</span></li>`).join("")}</ul></section>
</article>
</main>
` + pied(lang);
}

function pageIndex() {
  const parAn = {};
  for (const a of indexables.filter((x) => langOf(x) === "fr")) (parAn[a.date.slice(0, 4)] ||= []).push(a);
  const annees = Object.keys(parAn).sort().reverse();
  const en = indexables.filter((x) => langOf(x) === "en").sort(parDate);
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", "@id": `${SITE}${TOUS}`, name: `Tous les articles de ${NOM}`, url: `${SITE}${TOUS}`, inLanguage: "fr", isPartOf: { "@id": SITE_ID }, publisher: { "@id": ORG_ID } };
  return tete({ lang: "fr", titre: `Tous les articles et archives depuis 2018 | ${NOM}`, description: `Tous les articles et archives de ${NOM} depuis 2018 : Nice, Cannes, Monaco, la Côte d'Azur, l'économie, la tech et l'événementiel.`, canonical: `${SITE}${TOUS}`, jsonld: [ld] })
    + entete("fr") + `
<main id="contenu">
<div class="rubrique-head"><h1>Tous les articles</h1><p class="rubrique-chapo">${indexables.length} articles publiés depuis 2018, du plus récent au plus ancien.</p></div>
<div class="list">
<nav class="annees" aria-label="Années">${annees.map((y) => `<a href="#y-${y}">${y}</a>`).join('<span class="sep" aria-hidden="true"></span>')}<span class="sep" aria-hidden="true"></span><a href="#english">English</a></nav>
${annees.map((y) => `<h2 class="year" id="y-${y}">${y}</h2>\n${listeArticles(parAn[y].sort(parDate), "fr")}`).join("\n")}
<h2 class="year" id="english" lang="en">English edition</h2>
${listeArticles(en, "en")}
</div>
</main>
` + pied("fr");
}

function pageFixe(cle, lang) {
  const P = (PAGES[cle] || {})[lang];
  if (!P) return null;
  const C = CHEMINS_FIXES[cle] || { fr: `/${cle}/`, en: `/en/${cle}/` };
  const ld = { "@context": "https://schema.org", "@type": cle === "histoire" ? "AboutPage" : cle === "contact" ? "ContactPage" : "WebPage", "@id": `${SITE}${C[lang]}`, name: P.titre, url: `${SITE}${C[lang]}`, inLanguage: lang, isPartOf: { "@id": SITE_ID }, ...(cle === "histoire" ? { about: { "@id": ORG_ID } } : {}) };
  return tete({ lang, titre: `${P.titre} | ${NOM}`, description: couper(P.chapo), canonical: `${SITE}${C[lang]}`, alternates: [{ lang: "fr", href: `${SITE}${C.fr}` }, { lang: "en", href: `${SITE}${C.en}` }], jsonld: [ld] })
    + entete(lang) + `
<main id="contenu"><article class="article page"><h1>${esc(P.titre)}</h1><p class="chapo">${esc(P.chapo)}</p><div class="page-body">${P.html}</div></article></main>
` + pied(lang);
}

// Ancienne adresse → nouvelle adresse (redirection immédiate, reconnue par les moteurs).
const pageRedirection = (cible) => `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>${esc(NOM)}</title>
<link rel="canonical" href="${cible}">
<meta http-equiv="refresh" content="0; url=${cible}">
<script>location.replace(${JSON.stringify(cible)} + location.hash)</script>
</head><body><p><a href="${cible}">${esc(NOM)}</a></p></body></html>
`;

// Archives, recherche, accueil anglais et page introuvable : coquilles du site avec un contenu statique.
function pageArchives(lang) {
  const en = lang === "en";
  // En anglais : la version anglaise de chaque archive quand elle existe, sinon l'original français.
  const traductions = new Map(indexables.filter((a) => a.type === "archive" && langOf(a) === "en").map((a) => [twinKey(a), a]));
  const liste = indexables.filter((a) => a.type === "archive" && langOf(a) === "fr").map((a) => (en && traductions.get(twinKey(a))) || a).sort(parDate);
  const parAn = {};
  for (const a of liste) (parAn[a.date.slice(0, 4)] ||= []).push(a);
  const annees = Object.keys(parAn).sort().reverse();
  const canon = `${SITE}${archivesChemin(lang)}`;
  return tete({ lang, titre: `${en ? "Archives since 2018" : "Archives depuis 2018"} | ${NOM}`, description: en ? "Archives of L'Écho des Anges since 2018: French Riviera history and reading notes on the economy, technology and events." : "Les archives de L'Écho des Anges depuis 2018 : l'histoire de la Côte d'Azur et nos notes de lecture sur l'économie, la tech et l'événementiel.", canonical: canon,
    alternates: [{ lang: "fr", href: `${SITE}${archivesChemin("fr")}` }, { lang: "en", href: `${SITE}${archivesChemin("en")}` }], jsonld: [{ "@context": "https://schema.org", "@type": "CollectionPage", "@id": canon, url: canon, name: "Archives", inLanguage: lang, isPartOf: { "@id": SITE_ID } }] })
    + entete(lang, "archives") + `
<main id="contenu">
<div class="rubrique-head"><h1>Archives</h1></div>
<div class="list">
${annees.map((y) => `<h2 class="year" id="y-${y}">${y}</h2>\n${listeArticles(parAn[y], lang)}`).join("\n")}
</div>
</main>
`;
}
function pageSimple(lang, titre, texte, chemin, robots) {
  return tete({ lang, titre: `${titre} | ${NOM}`, description: texte, canonical: `${SITE}${chemin}`, robots })
    + entete(lang) + `
<main id="contenu"><div class="rubrique-head"><h1>${esc(titre)}</h1><p class="rubrique-chapo">${esc(texte)}</p></div></main>
`;
}
function accueilAnglais() {
  const en = indexables.filter((a) => langOf(a) === "en" && a.type !== "archive").sort(parDate).slice(0, 20);
  return tete({ lang: "en", titre: `${NOM}: news from Nice, Cannes, Monaco and the French Riviera`, description: DESC_EN, canonical: `${SITE}/en/`,
    alternates: [{ lang: "fr", href: `${SITE}/` }, { lang: "en", href: `${SITE}/en/` }],
    jsonld: [{ "@context": "https://schema.org", "@type": "WebPage", "@id": `${SITE}/en/`, url: `${SITE}/en/`, name: NOM, inLanguage: "en", isPartOf: { "@id": SITE_ID }, about: { "@id": ORG_ID } }] })
    + entete("en", "accueil") + `
<main id="contenu"><div class="prerendu"><h1 class="sr-only">${esc(NOM)}, news from Nice, Cannes, Monaco and the French Riviera</h1><h2>Latest stories</h2>
<ul>${en.map((a) => `<li><a href="${a.chemin}">${esc(a.titre)}</a></li>`).join("")}</ul></div></main>
`;
}

// ---------- Écriture ----------
// Les pages sont générées dans _genere/ (publié par le workflow « Site - publication »).
const GEN = join(J, "_genere");
rmSync(GEN, { recursive: true, force: true });
for (const d of ["a", "r", "p", "sujet"]) rmSync(join(J, d), { recursive: true, force: true }); // anciennes adresses
const ecrire = (chemin, html) => {
  const f = chemin.endsWith("/") ? join(GEN, chemin, "index.html") : join(GEN, chemin);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, html);
};
for (const a of indexables) ecrire(a.chemin, assembler(pageArticle(a)));
for (const a of articles.filter((x) => x.type === "revue" && !indexables.includes(x))) {
  const L = langOf(a);
  ecrire(a.chemin, assembler(tete({ lang: L, titre: `${a.titre} | ${NOM}`, description: resume(a), canonical: url(a), robots: "noindex, follow" })
    + entete(L, (SECTIONS[a.section] || {}).slug) + `\n<main id="contenu"><article class="article"><h1>${esc(a.titre)}</h1><p class="chapo">${esc(a.chapo)}</p><ol class="revue">${(a.liens || []).map((l, i) => `<li id="info-${i}"><h2>${esc(l.titre)}</h2>${l.resume ? `<p>${esc(l.resume)}</p>` : ""}<p class="src">${esc(l.source)} : <a href="${esc(l.url)}" rel="noopener nofollow">${L === "en" ? "Read the article" : "Lire l’article"}</a></p></li>`).join("")}</ol></article></main>\n`));
}
// Redirections depuis les anciennes adresses (/a/…html, /r/…html, /p/…html, /sujet/…html)
for (const a of articles) ecrire(`/a/${fichier(a.id)}`, pageRedirection(url(a)));
for (const [ancien, cible] of Object.entries(REDIRECTIONS)) { const c = articles.find((a) => a.id === cible); if (c && !articles.some((a) => a.id === ancien)) ecrire(`/a/${fichier(ancien)}`, pageRedirection(url(c))); }
ecrire("/a/index.html", pageRedirection(`${SITE}${TOUS}`));
ecrire(TOUS, assembler(pageIndex()));
for (const lang of ["fr", "en"]) ecrire(archivesChemin(lang), assembler(pageArchives(lang)));
ecrire("/recherche/", assembler(pageSimple("fr", "Recherche", "Rechercher un article de L'Écho des Anges.", "/recherche/", "noindex, follow")));
ecrire("/en/search/", assembler(pageSimple("en", "Search", "Search L'Écho des Anges.", "/en/search/", "noindex, follow")));
ecrire("/en/", assembler(accueilAnglais()));
ecrire("/404.html", assembler(pageSimple("fr", "Page introuvable", "L'article ou la page que vous cherchez n'existe pas, ou a changé d'adresse.", "/404.html", "noindex, follow")));
const fixes = [];
for (const cle of Object.keys(PAGES)) for (const lang of ["fr", "en"]) {
  const html = pageFixe(cle, lang);
  if (!html) continue;
  const C = CHEMINS_FIXES[cle] || { fr: `/${cle}/`, en: `/en/${cle}/` };
  ecrire(C[lang], assembler(html));
  ecrire(`/p/${cle}${lang === "en" ? "-en" : ""}.html`, pageRedirection(`${SITE}${C[lang]}`));
  fixes.push({ loc: `${SITE}${C[lang]}`, fr: `${SITE}${C.fr}`, en: `${SITE}${C.en}` });
}
const rubriques = [];
for (const cle of Object.keys(SECTIONS)) for (const lang of ["fr", "en"]) {
  const s = SECTIONS[cle];
  ecrire(secChemin(s.slug, lang), assembler(pageRubrique(cle, lang)));
  ecrire(`/r/${s.slug}${lang === "en" ? "-en" : ""}.html`, pageRedirection(secLien(s.slug, lang)));
  rubriques.push({ loc: secLien(s.slug, lang), fr: secLien(s.slug, "fr"), en: secLien(s.slug, "en") });
}
const sujets = [];
for (const s of SUJETS) for (const lang of ["fr", "en"]) {
  ecrire(sujetChemin(s, lang), assembler(pageSujet(s, lang)));
  ecrire(`/sujet/${s.slug}${lang === "en" ? "-en" : ""}.html`, pageRedirection(sujetUrl(s, lang)));
  sujets.push({ loc: sujetUrl(s, lang), fr: sujetUrl(s, "fr"), en: sujetUrl(s, "en"), image: s.image });
}

// Une pré-rendue dans index.html : les moteurs et les visiteurs sans JavaScript voient les derniers articles.
const indexPath = join(J, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const debut = "<!-- prerendu:debut -->", fin = "<!-- prerendu:fin -->";
if (indexHtml.includes(debut)) {
  const fr = indexables.filter((a) => langOf(a) === "fr");
  const derniers = fr.filter((a) => a.type !== "archive").sort(parDate).slice(0, 12);
  const archives = fr.filter((a) => a.type === "archive").sort(parDate).slice(0, 6);
  const bloc = `${debut}
    <div class="prerendu">
      <h1 class="sr-only">L'Écho des Anges, actualité de Nice, Cannes, Monaco et de la Côte d'Azur</h1>
      <h2>À la une</h2>
      <ul>${derniers.map((a) => `<li><a href="${a.chemin}">${esc(a.titre)}</a></li>`).join("")}</ul>
      <h2>Rubriques</h2>
      <ul>${Object.values(SECTIONS).map((s) => `<li><a href="${secChemin(s.slug, "fr")}">${esc(s.fr)}</a></li>`).join("")}</ul>
      <h2>Sujets</h2>
      <ul>${SUJETS.map((s) => `<li><a href="${sujetChemin(s, "fr")}">${esc(s.nom)}</a></li>`).join("")}</ul>
      <h2>Archives</h2>
      <ul>${archives.map((a) => `<li><a href="${a.chemin}">${esc(a.titre)}</a></li>`).join("")}<li><a href="${TOUS}">Tous les articles depuis 2018</a></li></ul>
    </div>
    ${fin}`;
  writeFileSync(indexPath, indexHtml.replace(new RegExp(`${debut}[\\s\\S]*?${fin}`), bloc));
}

// Plan du site, avec images et versions linguistiques
const maj = new Date().toISOString().slice(0, 10);
const altLinks = (x) => (x.fr && x.en ? `<xhtml:link rel="alternate" hreflang="fr" href="${x.fr}"/><xhtml:link rel="alternate" hreflang="en" href="${x.en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${x.fr}"/>` : "");
const imgTag = (src) => (src ? `<image:image><image:loc>${SITE}/${xml(src)}</image:loc></image:image>` : "");
const lignesArticles = indexables.map((a) => {
  const twin = indexables.find((x) => x !== a && langOf(x) !== langOf(a) && twinKey(x) === twinKey(a));
  const alt = twin ? altLinks({ fr: url(langOf(a) === "fr" ? a : twin), en: url(langOf(a) === "en" ? a : twin) }) : "";
  const img = image(a);
  return `  <url><loc>${url(a)}</loc><lastmod>${modifie(a).slice(0, 10)}</lastmod>${alt}${imgTag(img && img.src)}${(a.galerie || []).map((g) => imgTag(g.src)).join("")}</url>`;
});
writeFileSync(join(J, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url><loc>${SITE}/</loc><lastmod>${maj}</lastmod></url>
  <url><loc>${SITE}/en/</loc><lastmod>${maj}</lastmod><xhtml:link rel="alternate" hreflang="fr" href="${SITE}/"/><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/"/></url>
  <url><loc>${SITE}${TOUS}</loc><lastmod>${maj}</lastmod></url>
  <url><loc>${SITE}/archives/</loc><lastmod>${maj}</lastmod></url>
${rubriques.map((x) => `  <url><loc>${x.loc}</loc><lastmod>${maj}</lastmod>${altLinks(x)}</url>`).join("\n")}
${sujets.map((x) => `  <url><loc>${x.loc}</loc><lastmod>${maj}</lastmod>${altLinks(x)}${imgTag(x.image)}</url>`).join("\n")}
${fixes.map((x) => `  <url><loc>${x.loc}</loc>${altLinks(x)}</url>`).join("\n")}
${lignesArticles.join("\n")}
</urlset>
`);

// Plan du site Google News : articles d'actualité des dernières 48 heures
const news = indexables.filter((a) => a.type !== "archive" && Date.now() - Date.parse(iso(a)) < 48 * 3600e3);
writeFileSync(join(J, "news-sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${news.map((a) => `  <url>
    <loc>${url(a)}</loc>
    <news:news>
      <news:publication><news:name>${xml(NOM)}</news:name><news:language>${langOf(a)}</news:language></news:publication>
      <news:publication_date>${iso(a)}</news:publication_date>
      <news:title>${xml(a.titre)}</news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>
`);

// Fil RSS (50 derniers articles en français)
const recents = indexables.filter((a) => langOf(a) === "fr" && a.type !== "archive").sort(parDate).slice(0, 50);
writeFileSync(join(J, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <title>${xml(NOM)}</title>
  <link>${SITE}/</link>
  <description>${xml(DESC_FR)}</description>
  <language>fr-FR</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <image><url>${SITE}/img/logo-512.png</url><title>${xml(NOM)}</title><link>${SITE}/</link></image>
  <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${recents.map((a) => { const img = image(a); return `  <item>
    <title>${xml(a.titre)}</title>
    <link>${url(a)}</link>
    <guid isPermaLink="true">${url(a)}</guid>
    <pubDate>${new Date(isoComplet(a)).toUTCString()}</pubDate>
    <category>${xml((SECTIONS[a.section] || {}).fr || a.section)}</category>
    <description>${xml(resume(a))}</description>${img ? `\n    <media:content url="${SITE}/${xml(img.src)}" medium="image"/>` : ""}
  </item>`; }).join("\n")}
</channel>
</rss>
`);

// llms.txt : résumé lisible par les IA (convention llmstxt.org)
const ligne = (a) => `- [${a.titre}](${url(a)}) (${a.precision === "annee" ? a.date.slice(0, 4) : a.precision === "mois" ? a.date.slice(0, 7) : a.date}) : ${texteDe(a)}`;
const fr = indexables.filter((a) => langOf(a) === "fr");
const ficheTxt = (s) => {
  const F = s.fr;
  const arts = fr.filter((a) => s.re.test(`${a.titre} ${a.chapo} ${(a.corps || []).join(" ")}`)).sort(parDate);
  return `### ${s.nom}

${F.role}. Page dédiée : ${sujetUrl(s, "fr")} (English: ${sujetUrl(s, "en")})

${F.bio.join("\n\n")}

${F.faits.map(([k, v]) => `- ${k} : ${v}`).join("\n")}${s.entite.sameAs ? `\n- Profils officiels : ${s.entite.sameAs.join(", ")}` : ""}${F.faq ? "\n\n" + F.faq.map(([q, r]) => `Q : ${q}\nR : ${r}`).join("\n\n") : ""}

Articles :
${arts.map((a) => `- [${a.titre}](${url(a)}) (${a.date})`).join("\n")}`;
};
const llms = `# ${NOM}

> ${DESC_FR}

${NOM} est un quotidien d'information en ligne fondé en 2018 et basé à Nice, publié en français et en anglais. Chaque article cite ses sources en fin de texte. Toutes les pages listées ci-dessous sont des pages HTML statiques contenant le texte intégral.

- Site : ${SITE}/
- Tous les articles : ${SITE}${TOUS}
- Rubriques : ${Object.values(SECTIONS).map((s) => `[${s.fr}](${secLien(s.slug, "fr")})`).join(", ")}
- Plan du site : ${SITE}/sitemap.xml
- Fil RSS : ${SITE}/feed.xml
- Histoire du journal : ${SITE}/histoire/
- Mentions légales : ${SITE}/mentions-legales/
- Contact de la rédaction : ${SITE}/contact/

## Sujets suivis par la rédaction

${SUJETS.map(ficheTxt).join("\n\n")}

## Articles
${fr.filter((a) => a.type !== "archive").sort(parDate).map(ligne).join("\n")}

## Archives (événements de la Côte d'Azur et notes de lecture depuis 2018)
${fr.filter((a) => a.type === "archive").sort(parDate).map(ligne).join("\n")}

## English edition
${indexables.filter((a) => langOf(a) === "en").sort(parDate).map(ligne).join("\n")}
`;
writeFileSync(join(J, "llms.txt"), llms);

// Racine du site : robots.txt (n'a d'effet qu'à la racine d'un domaine)
if (new URL(SITE).pathname === "/") {
  writeFileSync(join(ROOT, "robots.txt"), `# Tous les robots, y compris les moteurs de recherche et les assistants IA, sont autorisés.
User-agent: *
Allow: /
Disallow: /scripts/
Disallow: /node_modules/
Disallow: /donnees/

Sitemap: ${SITE}/sitemap.xml
Sitemap: ${SITE}/news-sitemap.xml

# Moteurs de recherche et assistants IA explicitement bienvenus
User-agent: Googlebot
User-agent: Googlebot-Image
User-agent: Googlebot-News
User-agent: Bingbot
User-agent: DuckDuckBot
User-agent: Applebot
User-agent: Qwantbot
User-agent: YandexBot
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: MistralAI-User
Allow: /
Disallow: /scripts/
Disallow: /node_modules/
Disallow: /donnees/
`);
}

const total = 2 + rubriques.length + sujets.length + fixes.length + indexables.length;
console.log(`${indexables.length} pages d'articles, ${rubriques.length} pages de rubrique, ${sujets.length} pages de sujet, ${fixes.length} pages fixes, sitemap (${total} URL), RSS (${recents.length}), llms.txt.`);
