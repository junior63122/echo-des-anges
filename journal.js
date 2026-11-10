(function () {
  const app = document.getElementById("app");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const TZ = "Europe/Paris";
  const ORDRE = ["Business", "Finance", "Événementiel", "Culture", "Sorties", "Tech", "Monde", "Nice & Côte d'Azur", "Sport"];
  const SLUG = { Business: "economie", Finance: "finance", "Événementiel": "evenementiel", Culture: "culture", Sorties: "sorties", Tech: "tech", Monde: "international", "Nice & Côte d'Azur": "nice", Sport: "sport" };
  const FROM_SLUG = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));

  const I18N = {
    fr: {
      locale: "fr-FR",
      menu: "Rubriques",
      skip: "Aller au contenu",
      home: "À la une",
      notFound: "Page introuvable",
      homeH1: "L'Écho des Anges, actualité de Nice, Cannes, Monaco et de la Côte d'Azur",
      homeTitle: "L'Écho des Anges : l'actualité de Nice, Cannes, Monaco et de la Côte d'Azur",
      homeDesc: "L'Écho des Anges, quotidien d'information de Nice depuis 2018 : actualité de Nice, Cannes, Monaco et de la Côte d'Azur, économie, tech, événementiel et sport.",
      topics: "Sujets",
      live: "En continu",
      now: "À l'instant",
      founded: "Le quotidien de la Baie des Anges. Fondé à Nice en 2018.",
      loading: "Chargement de l'édition…",
      empty: "Aucun article pour le moment.",
      error: "Impossible de charger l'édition. Vérifiez votre connexion puis réessayez.",
      retry: "Réessayer",
      by: "Par",
      published: "Publié le",
      publishedIn: "Publié en",
      review: "Revue de presse",
      sources: "Sources",
      source: "Source",
      read: "Lire l'article",
      edition: "",
      numero: "N°",
      team: "La rédaction",
      sectionsTitle: "Rubriques",
      about: "À propos",
      archives: "Archives",
      archivesChapo: "Les grands événements de la Côte d'Azur et nos lectures de référence en intelligence artificielle, cybersécurité, entrepreneuriat, finance et événementiel, depuis 2018.",
      archivesFr: "",
      allThemes: "Tout",
      search: "Rechercher",
      searchPlaceholder: "Rechercher un article, un sujet, une ville…",
      searchTitle: "Recherche",
      searchIntro: "Rechercher un article de L'Écho des Anges : actualités, archives depuis 2018, portraits et entreprises.",
      results: (n, q) => `${n} résultat${n > 1 ? "s" : ""} pour « ${q} »`,
      noResult: "Aucun article ne correspond à votre recherche.",
      fromArchives: "Dans nos archives",
      local: "L'actualité de la Côte d'Azur",
      allArticles: "Tous les articles",
      allArchives: "Toutes les archives",
      history: "Notre histoire",
      legal: "Mentions légales",
      contact: "Contact",
      sourcesNote: "Nos articles s'appuient sur les informations des médias cités en source, accessibles en fin d'article.",
      more: "Toute la rubrique",
      alsoTitle: "À lire aussi",
      portrait: "Portrait",
      photo: "Photo",
      illustration: "Illustration",
      sections: { Business: "Économie", Finance: "Finance", "Événementiel": "Événementiel", Culture: "Culture", Sorties: "Sorties", Tech: "Tech", Monde: "International", "Nice & Côte d'Azur": "Nice & Côte d'Azur", Sport: "Sport" },
    },
    en: {
      locale: "en-GB",
      menu: "Sections",
      skip: "Skip to content",
      home: "Front page",
      notFound: "Page not found",
      homeH1: "L'Écho des Anges, news from Nice, Cannes, Monaco and the French Riviera",
      homeTitle: "L'Écho des Anges: news from Nice, Cannes, Monaco and the French Riviera",
      homeDesc: "L'Écho des Anges, the daily of the Baie des Anges: news from Nice, Cannes, Monaco and the French Riviera, business, tech, events and sport.",
      topics: "Topics",
      live: "Live",
      now: "Just in",
      founded: "The daily of the Baie des Anges. Founded in Nice in 2018.",
      loading: "Loading today's edition…",
      empty: "No articles yet.",
      error: "Could not load the edition. Check your connection and try again.",
      retry: "Try again",
      by: "By",
      published: "Published on",
      publishedIn: "Published in",
      review: "Press review",
      sources: "Sources",
      source: "Source",
      read: "Read the article",
      edition: "",
      numero: "No.",
      team: "Our newsroom",
      sectionsTitle: "Sections",
      about: "About",
      archives: "Archives",
      archivesChapo: "The Riviera's major events and our key readings in AI, cybersecurity, entrepreneurship, finance and events, since 2018.",
      archivesFr: "Our archives are currently available in French only.",
      allThemes: "All",
      search: "Search",
      searchPlaceholder: "Search for an article, a topic, a town…",
      searchTitle: "Search",
      searchIntro: "Search L'Écho des Anges: news, archives since 2018, profiles and companies.",
      results: (n, q) => `${n} result${n > 1 ? "s" : ""} for “${q}”`,
      noResult: "No article matches your search.",
      fromArchives: "From our archives",
      local: "Riviera news",
      allArticles: "All articles",
      allArchives: "All archives",
      history: "Our story",
      legal: "Legal notice",
      contact: "Contact",
      sourcesNote: "Our articles draw on reporting by the outlets credited as sources, listed at the end of each article.",
      more: "Whole section",
      alsoTitle: "Also worth reading",
      portrait: "Profile",
      photo: "Photo",
      illustration: "Illustration",
      sections: { Business: "Business", Finance: "Finance", "Événementiel": "Events", Culture: "Culture", Sorties: "Going out", Tech: "Tech", Monde: "World", "Nice & Côte d'Azur": "Nice & the Riviera", Sport: "Sport" },
    },
  };

  const REDACTION = [
    ["Camille Rostand", "Business"], ["Hugo Marchetti", "Finance"], ["Léa Fontaine", "Événementiel"], ["Clara Venturini", "Culture"], ["Théo Marchal", "Sorties"],
    ["Nathan Belkacem", "Tech"], ["Sofia Delmas", "Monde"], ["Lucas Giordano", "Nice & Côte d'Azur"], ["Inès Morel", "Sport"],
  ];

  // Langue : donnée par l'adresse (/en/… pour l'édition anglaise).
  const langDe = (path) => (/^\/en(\/|$)/.test(path) ? "en" : "fr");
  if (langDe(location.pathname) === "fr" && new URLSearchParams(location.search).get("lang") === "en") location.replace("/en/" + location.hash);
  let lang = langDe(location.pathname);
  let T = I18N[lang];

  let articles = [];
  let photos = {};
  const langOf = (a) => a.lang || "fr";
  const visibles = () => articles.filter((a) => langOf(a) === lang);
  // Un article et sa traduction ont le même id, à la langue près (« 2026-11-05-en-… »).
  const twinKey = (a) => (langOf(a) === "en" ? a.id.replace(/^((?:archive-)?\d{4}-\d\d-\d\d)-en-/, "$1-") : a.id);
  const secName = (k) => T.sections[k] || k;

  const longDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(T.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(T.locale, { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  // Adresses lisibles, identiques à celles des pages publiées (champ « chemin » de chaque article).
  const SLUG_EN = { economie: "business", finance: "finance", evenementiel: "events", culture: "culture", sorties: "going-out", tech: "tech", international: "world", nice: "riviera", sport: "sport" };
  const PAGES_CHEMINS = { histoire: { fr: "/histoire/", en: "/en/our-story/" }, mentions: { fr: "/mentions-legales/", en: "/en/legal-notice/" }, contact: { fr: "/contact/", en: "/en/contact/" } };
  const STATIQUES = /^\/(en\/)?(sujet|topic)\/|^\/tous-les-articles\//;
  const artLink = (a, i) => `${a.chemin}${i ? `#info-${i}` : ""}`;
  const secPath = (k, l) => ((l || lang) === "en" ? `/en/${SLUG_EN[SLUG[k]]}/` : `/${SLUG[k]}/`);
  const secLink = (k) => secPath(k);
  const pageLink = (k) => PAGES_CHEMINS[k][lang];
  const homeLink = (l) => ((l || lang) === "en" ? "/en/" : "/");
  const archivesLink = (theme, l) => `${(l || lang) === "en" ? "/en/archives/" : "/archives/"}${theme ? `?theme=${theme}` : ""}`;
  const searchLink = (q, l) => `${(l || lang) === "en" ? "/en/search/" : "/recherche/"}${q != null ? `?q=${encodeURIComponent(q)}` : ""}`;
  const sujetLink = (slug, l) => `${(l || lang) === "en" ? "/en/topic" : "/sujet"}/${slug}/`;
  const absSrc = (src) => (/^(https?:)?\//.test(src) ? src : "/" + src);
  // Sujets ayant leur propre page (personnes, entreprises)
  const SUJETS = [
    { re: /Junior William Joyant|Junior Joyant/, slug: "junior-william-joyant", nom: "Junior William Joyant" },
    { re: /Oneera/, slug: "oneera", nom: "Oneera" },
    { re: /Teufy/, slug: "teufy", nom: "Teufy" },
  ];
  const moisAnnee = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(T.locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const quand = (a) => (a.precision === "annee" ? a.date.slice(0, 4) : a.precision === "mois" ? moisAnnee(a.date) : longDate(a.date));
  const SEP = '<span class="sep" aria-hidden="true"></span>';
  const kicker = (a) => (a.type === "article" && a.rubrique && a.rubrique !== secName(a.section) ? [secName(a.section), a.rubrique] : [secName(a.section)]);
  const kickerHtml = (a) => kicker(a).map(esc).join(SEP);

  // ---------- Photos ----------
  // Photo propre à l'article, sinon une photo libre de droits de la rubrique
  // (la même pour un article et sa traduction).
  const hash = (str) => { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function imageFor(a) {
    if (a.photo === false) return null; // sujets tragiques : pas de photo d'illustration
    if (a.image) return { src: absSrc(a.image.src), credit: `${a.image.couverture ? T.illustration : T.photo} : ${a.image.credit}`, legende: (a.image.legende || {})[lang] || "", alt: (a.image.legende || {})[lang] || a.titre };
    const pool = photos[a.section] || [];
    if (!pool.length) return null;
    const p = pool[hash(twinKey(a)) % pool.length];
    const origine = p.origine === "wikimedia" ? "Wikimedia Commons" : p.origine === "pexels" ? "Pexels" : p.origine;
    return { src: `/img/stock/${p.fichier}`, credit: `${T.photo} : ${p.auteur} / ${origine} (${p.licence})`, href: p.page, legende: "", alt: a.titre };
  }
  function figure(img, cls) {
    if (!img) return "";
    const credit = img.href ? `<a href="${esc(img.href)}" target="_blank" rel="noopener">${esc(img.credit)}</a>` : esc(img.credit);
    return `<figure class="fig ${cls || ""}"><img ${imgAttr(img.src)} alt="${esc(img.alt || img.legende)}" loading="lazy" decoding="async">
      <figcaption>${img.legende ? `<span>${esc(img.legende)}</span> ` : ""}<span class="credit">${credit}</span></figcaption></figure>`;
  }
  // Images WebP générées à la publication (valeur remplacée par preparer-site.mjs).
  const WEBP = "__WEBP__" === true;
  const imgAttr = (src, large = 760) => {
    const m = WEBP && String(src).match(/^(\/img\/.+?)\.(jpe?g|png)$/i);
    return m && !/(logo|icon|og-)/i.test(m[1]) ? `src="${esc(m[1])}.webp" srcset="${esc(m[1])}-800.webp 800w, ${esc(m[1])}.webp 1280w" sizes="(max-width: 760px) 100vw, ${large}px"` : `src="${esc(src)}"`;
  };
  const EMBLEME = `<svg viewBox="0 0 48 40" aria-hidden="true"><path d="M4 30 C14 28 22 22 26 8" /><path d="M10 33 C21 31 30 24 34 10" /><path d="M17 36 C28 34 38 27 44 14" /></svg>`;
  const thumb = (img, cls) => (img ? `<div class="thumb ${cls || ""}"><img ${imgAttr(img.src, /lead-img/.test(cls || "") ? 760 : 420)} alt="${esc(img.alt || img.legende)}" ${/lead-img/.test(cls || "") ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>` : "");
  // Dans les grilles, un article sans photo garde un emplacement de même format, pour que tout reste aligné.
  const vignette = (a, cls) => thumb(imageFor(a), cls) || `<div class="thumb noimg ${cls || ""}" aria-hidden="true">${EMBLEME}</div>`;

  // ---------- Éléments fixes ----------
  function applyStatic() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T[el.dataset.i18n]; });
    const si = document.getElementById("search-input"); if (si) { si.placeholder = T.searchPlaceholder; si.setAttribute("aria-label", T.search); }
    const sb = document.getElementById("search-btn"); if (sb) sb.setAttribute("aria-label", T.search);
    document.querySelectorAll(".langs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const d = longDate(today);
    document.getElementById("edition").textContent = d.charAt(0).toUpperCase() + d.slice(1);
    document.getElementById("year").textContent = today.slice(0, 4);
    const secLinks = ORDRE.map((k) => `<a href="${secLink(k)}" data-sec="${SLUG[k]}">${esc(secName(k))}</a>`).join("");
    const extra = `<a href="${archivesLink()}" data-sec="archives">${esc(T.archives)}</a>`;
    document.getElementById("sections").innerHTML = `<a class="home" href="${homeLink()}">${esc(T.home)}</a>${secLinks}${extra}`;
    const logo = document.querySelector(".logo"); if (logo) logo.setAttribute("href", homeLink());
    document.getElementById("drawer-nav").innerHTML = `<a href="${homeLink()}">${esc(T.home)}</a>${secLinks}${extra}<a href="${pageLink("histoire")}">${esc(T.history)}</a><a href="${pageLink("contact")}">${esc(T.contact)}</a><a href="${pageLink("mentions")}">${esc(T.legal)}</a>`;
    document.getElementById("about-links").innerHTML = `<li><a href="${pageLink("histoire")}">${esc(T.history)}</a></li><li><a href="${archivesLink()}">${esc(T.archives)}</a></li><li><a href="/tous-les-articles/">${esc(T.allArticles)}</a></li><li><a href="${pageLink("contact")}">${esc(T.contact)}</a></li><li><a href="${pageLink("mentions")}">${esc(T.legal)}</a></li><li><a href="/feed.xml">RSS</a></li>`;
    document.getElementById("footer-sections").innerHTML = ORDRE.map((k) => `<li><a href="${secLink(k)}">${esc(secName(k))}</a></li>`).join("");
    document.getElementById("redaction").innerHTML = REDACTION.map(([nom, k]) => `<li><strong>${esc(nom)}</strong>${SEP}${esc(secName(k))}</li>`).join("");
  }

  function markNav(slug) {
    document.querySelectorAll("#sections a").forEach((a) => {
      const on = slug ? a.dataset.sec === slug : a.classList.contains("home");
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  // ---------- Fil « En continu » ----------
  function liveItems() {
    const out = [];
    for (const a of visibles()) {
      if (a.type !== "revue") continue;
      (a.liens || []).forEach((l, i) => { if (l.heure) out.push({ a, l, i }); });
    }
    return out.sort((x, y) => (x.l.heure < y.l.heure ? 1 : -1)).slice(0, 8);
  }
  function renderLive() {
    const items = liveItems();
    if (!items.length) return "";
    return `<section class="live" aria-label="${esc(T.live)}"><div class="live-inner">
      <span class="live-label">${esc(T.live)}</span>
      <div class="live-track">${items.map(({ a, l, i }) => {
        const recent = Date.now() - Date.parse(l.heure) < 3600e3;
        return `<div class="live-item"><time datetime="${esc(l.heure)}">${esc(hhmm(l.heure))}</time>${recent ? `<span class="tag">${esc(T.now)}</span>` : ""}
          <a href="${artLink(a, i)}">${esc(l.titre)}</a></div>`;
      }).join("")}</div>
    </div></section>`;
  }

  // ---------- Accueil ----------
  function latestBySection() {
    const map = {};
    for (const a of visibles()) if (a.type === "revue" && !map[a.section]) map[a.section] = a;
    return map;
  }

  function renderHome() {
    markNav(null);
    setMeta(T.homeTitle, T.homeDesc, location.origin + homeLink());
    const all = visibles();
    if (!all.length) { app.innerHTML = `<p class="loading">${esc(T.empty)}</p>`; return; }
    const bySec = latestBySection();
    const revues = ORDRE.map((k) => bySec[k]).filter(Boolean);
    // Les articles de la rédaction restent à la une 3 jours, puis vivent dans leur rubrique.
    const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
    const recents = all.filter((a) => a.type === "article" && (Date.parse(today) - Date.parse(a.date)) / 864e5 <= 3);
    const redaction = recents.filter((a) => a.heure).sort((x, y) => y.heure.localeCompare(x.heure));
    const leadRevue = revues.slice().sort((x, y) => ((y.liens[0] && y.liens[0].heure) || "").localeCompare((x.liens[0] && x.liens[0].heure) || ""))[0] || all[0];
    const lead = redaction.find((a) => imageFor(a)) || redaction[0] || leadRevue;
    const features = recents.filter((a) => !a.heure).slice(0, 1);
    const sideRevues = revues.filter((r) => r !== lead).slice(0, features.length ? 1 : 2);
    const blocks = revues.filter((r) => r !== lead && !sideRevues.includes(r));
    const autres = redaction.slice(5, 5 + Math.floor(Math.max(0, redaction.length - 5) / 3) * 3);

    const leadAlso = lead.type === "article"
      ? redaction.filter((a) => a !== lead).slice(0, 4).map((a) => ({ titre: a.titre, source: a.rubrique || secName(a.section), href: artLink(a) }))
      : (lead.liens || []).slice(1, 5).map((l, i) => ({ titre: l.titre, source: l.source, href: artLink(lead, i + 1) }));
    const leadHref = lead.type === "article" ? artLink(lead) : artLink(lead, lead.liens ? 0 : null);
    const featureHtml = (a, badge) => `<article class="feature">
        ${a.type === "article" ? `<a href="${artLink(a)}" tabindex="-1" aria-hidden="true">${thumb(imageFor(a), "portrait")}</a>` : ""}
        <span>${badge ? `<span class="badge">${esc(badge)}</span>` : `<span class="kicker">${kickerHtml(a)}</span>`}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p>
        <p class="byline">${esc(T.by)} ${esc(a.auteur)}</p>
      </article>`;

    app.innerHTML = `<h1 class="sr-only">${esc(T.homeH1)}</h1>${renderLive()}
    <div class="home-page">
      <section class="top">
        <article class="lead">
          <span class="kicker">${kickerHtml(lead)}</span>
          <h2><a href="${leadHref}">${esc(lead.titre)}</a></h2>
          <div class="lead-body">
            <div>
              <p class="chapo">${esc(!lead.redige && lead.liens && lead.liens[0].resume ? lead.liens[0].resume : lead.chapo)}</p>
              <p class="byline">${esc(T.by)} ${esc(lead.auteur)} ${SEP}<span class="when">${esc(quand(lead))}</span></p>
              ${imageFor(lead) ? `<a href="${leadHref}" tabindex="-1" aria-hidden="true">${thumb(imageFor(lead), "lead-img")}</a>` : `<div class="wave" role="presentation"></div>`}
            </div>
            ${leadAlso.length ? `<ul class="also">${leadAlso.map((l) => `<li><a href="${l.href}">${esc(l.titre)}</a><span class="src">${esc(l.source)}</span></li>`).join("")}</ul>` : ""}
          </div>
        </article>
        <div class="lead-side">
          ${features.map((a, i) => featureHtml(a, a.rubrique || T.portrait)).join("")}
          ${sideRevues.map((a) => featureHtml(a, null)).join("")}
        </div>
      </section>
      ${autres.length ? `<section class="block">
        <div class="block-head"><h2>${esc(T.local)}</h2><a class="more" href="${secLink("Nice & Côte d'Azur")}">${esc(T.more)}</a></div>
        <div class="block-grid archives-grid">${autres.map((a) => `<div>${vignette(a)}
          <span class="kicker">${kickerHtml(a)}</span>
          <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3><p>${esc(a.chapo)}</p></div>`).join("")}</div>
      </section>` : ""}
      ${blocks.map(renderBlock).join("")}
      ${renderArchivesBlock()}
    </div>`;
  }

  // Archives dans la langue du lecteur : la traduction quand elle existe, sinon l'original français.
  function archivesLangue() {
    const fr = articles.filter((a) => a.type === "archive" && langOf(a) === "fr");
    if (lang === "fr") return fr;
    const en = new Map(articles.filter((a) => a.type === "archive" && langOf(a) === "en").map((a) => [twinKey(a), a]));
    return fr.map((a) => en.get(twinKey(a)) || a);
  }
  // Trois archives tirées au sort chaque jour (les mêmes pour tous les lecteurs).
  function archivesPool() {
    return archivesLangue();
  }
  function renderArchivesBlock() {
    const pool = archivesPool();
    if (!pool.length) return "";
    const seed = hash(new Date().toLocaleDateString("en-CA", { timeZone: TZ }));
    const picks = [];
    for (let i = 0; picks.length < Math.min(3, pool.length) && i < 50; i++) {
      const a = pool[(seed + i * 7919) % pool.length];
      if (!picks.includes(a)) picks.push(a);
    }
    return `<section class="block archives-block">
      <div class="block-head"><h2><a href="${archivesLink()}">${esc(T.fromArchives)}</a></h2><a class="more" href="${archivesLink()}">${esc(T.allArchives)}</a></div>
      <div class="block-grid archives-grid">${picks.map((a) => `<div>${vignette(a)}
        <span class="kicker">${esc(a.rubrique && a.rubrique !== "Archives" ? a.rubrique : secName(a.section))}${SEP}${esc(quand(a))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3><p>${esc(a.chapo)}</p></div>`).join("")}</div>
    </section>`;
  }

  // ---------- Archives ----------
  const theme = (a) => (a.rubrique && a.rubrique !== "Archives" ? a.rubrique : secName(a.section));
  const slugify = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function renderArchives(filtre) {
    markNav("archives");
    const tout = archivesLangue();
    const themes = [...new Set(tout.map(theme))].sort((x, y) => x.localeCompare(y, "fr"));
    const list = filtre ? tout.filter((a) => slugify(theme(a)) === filtre) : tout;
    const parAn = {};
    for (const a of list) (parAn[a.date.slice(0, 4)] ||= []).push(a);
    const annees = Object.keys(parAn).sort().reverse();
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(T.archives)}</h1><p class="rubrique-chapo">${esc(T.archivesChapo)}${lang === "en" && !articles.some((x) => x.type === "archive" && langOf(x) === "en") && T.archivesFr ? " " + esc(T.archivesFr) : ""}</p></div>
      <nav class="years themes"><a href="${archivesLink()}"${filtre ? "" : ' aria-current="page"'}>${esc(T.allThemes)}</a>${themes.map((t) => `<a href="${archivesLink(slugify(t))}"${filtre === slugify(t) ? ' aria-current="page"' : ""}>${esc(t)}</a>`).join("")}</nav>
      <nav class="years">${annees.map((y) => `<a href="${archivesLink(filtre)}#y-${y}">${y}</a>`).join("")}</nav>
      <div class="list">${annees.map((y) => `<h2 class="year" id="y-${y}">${y}</h2>${parAn[y].map((a) => `<article class="list-item">
        <span class="kicker">${esc(theme(a))}${SEP}${esc(quand(a))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p></article>`).join("")}`).join("") || `<p class="loading">${esc(T.empty)}</p>`}</div>`;
  }

  // ---------- Recherche ----------
  const sansAccents = (x) => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  function renderSearch(q) {
    markNav(null);
    const termes = sansAccents(q).split(/\s+/).filter((t) => t.length > 1);
    const base = articles.filter((a) => langOf(a) === lang || (a.type === "archive" && !articles.some((x) => x.type === "archive" && langOf(x) === lang)));
    const res = !termes.length ? [] : base.map((a) => {
      const ti = sansAccents(a.titre), ch = sansAccents(a.chapo), co = sansAccents((a.corps || []).join(" ") + " " + (a.liens || []).map((l) => l.titre).join(" ") + " " + (a.rubrique || ""));
      let score = 0;
      for (const t of termes) {
        const p = (ti.includes(t) ? 5 : 0) + (ch.includes(t) ? 3 : 0) + (co.includes(t) ? 1 : 0);
        if (!p) return null;
        score += p;
      }
      return { a, score };
    }).filter(Boolean).sort((x, y) => y.score - x.score || (y.a.date > x.a.date ? 1 : -1)).slice(0, 60);
    const input = document.getElementById("search-input"); if (input && input.value !== q) input.value = q;
    const suggestions = lang === "en" ? ["Cannes Film Festival", "Monaco Grand Prix", "Carnaval de Nice", "start-up", "Lisnard"] : ["Festival de Cannes", "Grand Prix de Monaco", "Carnaval de Nice", "start-up", "Lisnard"];
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(T.searchTitle)}</h1><p class="rubrique-chapo">${esc(T.searchIntro)}</p></div>
      <form class="recherche-page" role="search"><input type="search" name="q" value="${esc(q)}" placeholder="${esc(T.searchPlaceholder)}" aria-label="${esc(T.search)}"><button type="submit">${esc(T.search)}</button></form>
      ${q ? `<p class="resultats-compte" role="status">${esc(T.results(res.length, q))}</p>` : `<p class="suggestions">${suggestions.map((s) => `<a href="${searchLink(s)}">${esc(s)}</a>`).join("")}</p>`}
      <div class="list">${q && res.length ? `<h2 class="sr-only">${esc(lang === "en" ? "Results" : "Résultats")}</h2>` : ""}${!q ? "" : res.length ? res.map(({ a }) => `<article class="list-item">
        <span class="kicker">${a.type === "archive" ? esc(theme(a)) : kickerHtml(a)}${SEP}${esc(quand(a))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p></article>`).join("") : `<p class="loading">${esc(T.noResult)}</p>`}</div>`;
    window.scrollTo(0, 0);
  }

  // ---------- Pages fixes ----------
  function renderPage(key) {
    markNav(null);
    const page = (window.JOURNAL_PAGES || {})[key];
    if (!page) return renderHome();
    const P = page[lang] || page.fr;
    app.innerHTML = `<article class="article page"><h1>${esc(P.titre)}</h1><p class="chapo">${esc(P.chapo)}</p><div class="page-body">${P.html}</div></article>`;
    window.scrollTo(0, 0);
  }

  function renderBlock(a) {
    const [first, ...rest] = a.liens || [];
    if (!first) return "";
    const main = a.redige ? { titre: a.titre, resume: a.chapo, source: (a.sources || []).join(", ") } : first;
    const side = rest.slice(0, 4);
    return `<section class="block">
      <div class="block-head"><h2><a href="${secLink(a.section)}">${esc(secName(a.section))}</a></h2><a class="more" href="${secLink(a.section)}">${esc(T.more)}</a></div>
      <div class="block-grid">
        <div class="main">${vignette(a)}<h3><a href="${artLink(a, 0)}">${esc(main.titre)}</a></h3>${main.resume ? `<p>${esc(main.resume)}</p>` : ""}<span class="src">${esc(T.by)} ${esc(a.auteur)}${a.redige ? "" : `${SEP}${esc(T.source)} : ${esc(main.source)}`}</span></div>
        ${side.length ? `<ul class="side-list">${side.map((l, i) => `<li><h3><a href="${artLink(a, i + 1)}">${esc(l.titre)}</a></h3>${l.resume ? `<p>${esc(l.resume.length > 160 ? l.resume.slice(0, 157).replace(/\s+\S*$/, "") + "…" : l.resume)}</p>` : ""}<span class="src">${esc(l.source)}</span></li>`).join("")}</ul>` : ""}
      </div>
    </section>`;
  }

  // ---------- Rubrique ----------
  function renderSection(key) {
    markNav(SLUG[key]);
    document.title = `${secName(key)} | L'Écho des Anges`;
    const list = visibles().filter((a) => a.section === key).sort((x, y) => (y.heure || y.date).localeCompare(x.heure || x.date));
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(secName(key))}</h1></div>
      <div class="list"><h2 class="sr-only">${lang === "en" ? "Latest articles" : "Derniers articles"}</h2>${list.length ? list.map((a) => { const im = imageFor(a); return `<article class="list-item${im ? " avec-photo" : ""}">${im ? `<a class="li-img" href="${artLink(a)}" tabindex="-1" aria-hidden="true"><img ${imgAttr(im.src, 240)} alt="${esc(im.alt || im.legende)}" loading="lazy" decoding="async"></a>` : ""}
        <span class="kicker">${esc(a.type === "revue" ? (a.redige ? secName(a.section) : T.review) : a.rubrique)}${SEP}${esc(quand(a))}</span>
        <h3><a href="${artLink(a)}">${esc(a.titre)}</a></h3>
        <p>${esc(a.chapo)}</p>
        <p class="byline">${esc(T.by)} ${esc(a.auteur)}</p></article>`; }).join("") : `<p class="loading">${esc(T.empty)}</p>`}</div>`;
    window.scrollTo(0, 0);
  }

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
  // Colonne de droite des articles (grand écran).
  function rail(a) {
    const L = lang === "en" ? { last: "Latest news", sec: "In this section" } : { last: "Dernières actualités", sec: "Dans la rubrique" };
    const memes = visibles().filter((x) => x !== a && x.type === "article").sort((x, y) => (y.heure || y.date).localeCompare(x.heure || x.date));
    const derniers = memes.slice(0, 6);
    const rub = memes.filter((x) => x.section === a.section && !derniers.includes(x)).slice(0, 5);
    const liste = (l) => `<ol>${l.map((x) => `<li><a href="${artLink(x)}">${esc(x.titre)}</a><time>${esc(quand(x))}</time></li>`).join("")}</ol>`;
    return `<aside class="rail" aria-label="${L.last}"><div class="rail-inner"><h2>${L.last}</h2>${liste(derniers)}${rub.length ? `<h2>${L.sec}</h2>${liste(rub)}` : ""}</div></aside>`;
  }

  // ---------- Article ----------
  function setMeta(titre, description, canonical) {
    document.title = titre;
    const d = document.querySelector('meta[name="description"]'); if (d) d.setAttribute("content", description);
    const c = document.querySelector('link[rel="canonical"]'); if (c) c.setAttribute("href", canonical);
  }
  function renderArticle(a, focus) {
    markNav(SLUG[a.section]);
    setMeta(`${a.titre} | L'Écho des Anges`, a.chapo, location.origin + a.chemin);
    const revue = a.type === "revue" && !a.redige;
    const sources = a.sources && a.sources.length ? `<span class="sources">${esc(T.sources)} : ${esc(a.sources.join(", "))}</span>` : "";
    app.innerHTML = `<div class="article-layout"><article class="article">
      <div class="crumbs">${a.type === "archive" ? `<a href="${archivesLink()}">${esc(T.archives)}</a>${SEP}` : ""}<a href="${secLink(a.section)}">${esc(secName(a.section))}</a>${revue ? `${SEP}${esc(T.review)}` : a.rubrique && a.rubrique !== "Archives" && a.rubrique !== secName(a.section) && a.type !== "revue" ? `${SEP}${esc(a.rubrique)}` : ""}</div>
      <h1>${esc(a.titre)}</h1>
      <p class="chapo">${esc(a.chapo)}</p>
      <div class="meta-line"><strong>${esc(T.by)} ${esc(a.auteur)}</strong><span class="when">${a.type === "archive" ? esc(quand(a)) : `${esc(a.precision === "mois" ? T.publishedIn : a.precision === "annee" ? "" : T.published)} ${esc(quand(a))}`}</span>${sources}</div>
      ${revue ? "" : barrePartage(location.origin + a.chemin, a.titre, (a.corps || []).join(" ").split(/\s+/).length, lang === "en")}
      ${figure(imageFor(a), a.image && !a.image.paysage ? "hero-portrait" : "hero")}
      ${(a.corps || []).map((p) => (p.startsWith("## ") ? `<h2 class="intertitre">${esc(p.slice(3))}</h2>` : `<p class="body">${esc(p)}</p>`)).join("")}
      ${a.transparence ? `<p class="transparence">${esc(a.transparence)}</p>` : ""}
      ${(() => { const t = SUJETS.filter((x) => x.re.test(`${a.titre} ${a.chapo} ${(a.corps || []).join(" ")}`)); return t.length && a.type !== "revue" ? `<p class="tags">${esc(T.topics)} : ${t.map((x) => `<a href="${sujetLink(x.slug)}">${esc(x.nom)}</a>`).join(", ")}</p>` : ""; })()}
      ${a.galerie && a.galerie.length ? `<div class="galerie">${a.galerie.map((g) => figure({ src: absSrc(g.src), credit: `${T.photo} : ${g.credit}`, legende: (g.legende || {})[lang] || "" })).join("")}</div>` : ""}
      ${(a.redige || a.type !== "revue") && a.liens && a.liens.length ? `<section class="sources-list"><h2>${esc(T.sources)}</h2><ul>${a.liens.map((l, i) => `
        <li id="info-${i}"><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.titre)}</a> <span>(${esc(l.source)})</span></li>`).join("")}</ul></section>` : ""}
      ${revue && a.liens && a.liens.length ? `<ol class="revue">${a.liens.map((l, i) => `
        <li id="info-${i}"><div>
          <h2>${esc(l.titre)}</h2>
          ${l.resume ? `<p>${esc(l.resume)}</p>` : ""}
          <span class="src">${l.heure ? `<time datetime="${esc(l.heure)}">${esc(hhmm(l.heure))}</time>` : ""}${esc(T.source)} : ${esc(l.source)}. <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(T.read)}</a></span>
        </div></li>`).join("")}</ol>` : ""}
    </article>${revue ? "" : rail(a)}</div>`;
    const target = focus != null && document.getElementById("info-" + focus);
    if (target && focus > 0) target.scrollIntoView(); else window.scrollTo(0, 0);
  }

  // ---------- Navigation ----------
  // Anciennes adresses avec « # » (#a/…, #r/…, #archives, #p/…, #recherche/…) → nouvelles adresses.
  function ancienneAdresse(h) {
    let m;
    if ((m = h.match(/^a\/([^/]+)(?:\/(\d+))?$/))) { const a = articles.find((x) => x.id === decodeURIComponent(m[1])); return a ? artLink(a, m[2] ? +m[2] : 0) : null; }
    if ((m = h.match(/^r\/([a-z]+)$/)) && FROM_SLUG[m[1]]) return secPath(FROM_SLUG[m[1]]);
    if ((m = h.match(/^recherche\/(.*)$/))) return searchLink(decodeURIComponent(m[1]));
    if ((m = h.match(/^archives(?:\/t\/([a-z0-9-]+))?(?:\/(\d{4}))?$/))) return archivesLink(m[1]) + (m[2] ? `#y-${m[2]}` : "");
    if ((m = h.match(/^p\/([a-z]+)$/)) && PAGES_CHEMINS[m[1]]) return PAGES_CHEMINS[m[1]][lang];
    return null;
  }
  // La page de recherche dépend de la requête : elle est toujours construite avec les données.
  const RECHERCHE = /^\/(en\/)?(recherche|search)\//;
  const ANCIEN = /^#(a|r|p|recherche|archives)(\/|$)/;
  let premier = true;
  // Mesure d'audience sans cookie (GoatCounter), une visite comptée par page affichée.
  const STATS = ((window.JOURNAL_CONFIG || {}).statistiques || "").trim();
  function compter() {
    if (!STATS || !/^echodesanges\.fr$/.test(location.hostname)) return;
    const envoyer = () => window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: location.pathname + location.search });
    if (window.goatcounter && window.goatcounter.count) return envoyer();
    if (document.getElementById("gc-script")) return;
    const s = document.createElement("script");
    s.id = "gc-script"; s.async = true; s.src = "https://gc.zgo.at/count.js";
    s.dataset.goatcounter = `https://${STATS}.goatcounter.com/count`;
    s.dataset.goatcounterSettings = '{"no_onload": true}';
    s.onload = envoyer;
    document.head.appendChild(s);
  }
  function route() {
    closeDrawer();
    compter();
    if (ANCIEN.test(location.hash)) history.replaceState(null, "", ancienneAdresse(location.hash.slice(1)) || location.pathname);
    let path = decodeURIComponent(location.pathname);
    if (!path.endsWith("/") && !/\.\w+$/.test(path)) path += "/";
    if (langDe(path) !== lang) setLang(langDe(path), false);
    const initial = premier; premier = false;
    // Pages publiées uniquement en statique (fiches sujets, liste complète) : rechargement complet.
    if (STATIQUES.test(path)) { if (!initial) location.reload(); return; }
    // Page déjà rendue côté serveur : on la garde telle quelle (affichage immédiat, rien à télécharger).
    if (initial && app.dataset.statique && !RECHERCHE.test(path)) {
      const seg = path.replace(/^\/en(?=\/)/, "").split("/")[1] || "";
      const fr = lang === "en" ? Object.keys(SLUG_EN).find((k) => SLUG_EN[k] === seg) : seg;
      markNav(seg === "archives" ? "archives" : FROM_SLUG[fr] ? fr : null);
      return;
    }
    if (!articles.length) { location.reload(); return; } // données pas encore chargées : chargement classique
    const p = path.replace(/^\/en(?=\/)/, "");
    const q = new URLSearchParams(location.search);
    if (p === "/" || p === "/index.html/") return renderHome();
    if (p === "/recherche/" || p === "/search/") { renderSearch(q.get("q") || ""); return chargerComplet().then(() => { if (/\/(recherche|search)\/$/.test(location.pathname)) renderSearch(new URLSearchParams(location.search).get("q") || ""); }); }
    if (p === "/archives/") {
      renderArchives(q.get("theme"));
      const y = location.hash.match(/^#y-(\d{4})$/), el = y && document.getElementById("y-" + y[1]);
      return el ? el.scrollIntoView() : window.scrollTo(0, 0);
    }
    if (p === "/histoire/" || p === "/our-story/") return renderPage("histoire");
    if (p === "/mentions-legales/" || p === "/legal-notice/") return renderPage("mentions");
    if (p === "/contact/") return renderPage("contact");
    const sec = ORDRE.find((k) => secPath(k) === path);
    if (sec) return renderSection(sec);
    const a = articles.find((x) => x.chemin === path);
    if (a) {
      const f = location.hash.match(/^#info-(\d+)$/);
      // Le texte intégral n'est pas dans l'index léger : on le charge, la page statique reste affichée en attendant.
      if (!a.corps && (a.type !== "revue" || a.redige)) return chargerComplet().then(() => { if (decodeURIComponent(location.pathname).replace(/\/?$/, "/") === path) renderArticle(a, f ? +f[1] : null); });
      return renderArticle(a, f ? +f[1] : null);
    }
    if (initial && app.dataset.statique) return; // page introuvable servie telle quelle
    markNav(null);
    app.innerHTML = `<div class="rubrique-head"><h1>${esc(T.notFound)}</h1></div>`;
  }
  function navigate(url) {
    if (!articles.length) { location.href = url; return; }
    // Article dont le texte intégral n'est pas encore chargé : sa page statique (quelques Ko, complète)
    // s'affiche bien plus vite que le téléchargement de tout le journal (articles.json).
    const cible = decodeURIComponent(new URL(url, location.href).pathname).replace(/\/?$/, "/");
    const art = !completCharge && articles.find((x) => x.chemin === cible);
    if (art && !art.corps && (art.type !== "revue" || art.redige)) { location.href = url; return; }
    history.pushState(null, "", url);
    route();
    if (!/#/.test(url)) window.scrollTo(0, 0);
  }

  function setLang(l, rerender = true) {
    lang = l; T = I18N[lang];
    applyStatic();
    if (rerender) route();
  }

  // Changement de langue : on ouvre la traduction de la page en cours quand elle existe.
  document.querySelector(".langs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.dataset.lang === lang) return;
    const cible = b.dataset.lang;
    const alt = document.querySelector(`link[rel="alternate"][hreflang="${cible}"]`);
    if (!articles.length) { location.href = alt ? new URL(alt.href).pathname + location.search : homeLink(cible); return; }
    let path = location.pathname; if (!path.endsWith("/")) path += "/";
    const p = path.replace(/^\/en(?=\/)/, "");
    const current = articles.find((x) => x.chemin === path);
    let dest = homeLink(cible), m;
    if (current) {
      const twin = articles.find((x) => langOf(x) === cible && twinKey(x) === twinKey(current))
        || articles.find((x) => langOf(x) === cible && x.type === current.type && x.section === current.section && x.date === current.date);
      if (twin) dest = twin.chemin;
    } else if (ORDRE.some((k) => secPath(k) === path)) dest = secPath(ORDRE.find((k) => secPath(k) === path), cible);
    else if (p === "/archives/") dest = archivesLink(new URLSearchParams(location.search).get("theme"), cible);
    else if (p === "/recherche/" || p === "/search/") dest = searchLink(new URLSearchParams(location.search).get("q") || "", cible);
    else if (p === "/histoire/" || p === "/our-story/") dest = PAGES_CHEMINS.histoire[cible];
    else if (p === "/mentions-legales/" || p === "/legal-notice/") dest = PAGES_CHEMINS.mentions[cible];
    else if (p === "/contact/") dest = PAGES_CHEMINS.contact[cible];
    else if ((m = p.match(/^\/(sujet|topic)\/([a-z0-9-]+)\/$/))) dest = sujetLink(m[2], cible);
    if (STATIQUES.test(dest)) location.href = dest; else navigate(dest);
  });

  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  document.getElementById("search-btn").addEventListener("click", () => {
    searchForm.hidden = !searchForm.hidden;
    if (!searchForm.hidden) searchInput.focus();
  });
  // Formulaire de la page de recherche elle-même.
  document.addEventListener("submit", (e) => {
    const f = e.target.closest(".recherche-page"); if (!f) return;
    e.preventDefault();
    const q = f.q.value.trim(); if (q) navigate(searchLink(q));
  });
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (q) navigate(searchLink(q));
  });

  const drawer = document.getElementById("drawer");
  const menuBtn = document.getElementById("menu-btn");
  function closeDrawer() { drawer.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    drawer.hidden = !drawer.hidden;
    menuBtn.setAttribute("aria-expanded", String(!drawer.hidden));
  });

  window.addEventListener("popstate", route);
  // Échap ferme le menu et la recherche.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!drawer.hidden) { closeDrawer(); menuBtn.focus(); }
    const f = document.getElementById("search-form"); if (f && !f.hidden) { f.hidden = true; document.getElementById("search-btn").focus(); }
  });
  // Bouton « copier le lien » de la barre de partage.
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".copier"); if (!b) return;
    const ok = () => { b.classList.add("copie"); setTimeout(() => b.classList.remove("copie"), 1600); };
    // Copie de secours quand le presse-papiers moderne est refusé (navigateur, permissions, page non sécurisée).
    const secours = () => {
      const t = document.createElement("textarea"); t.value = b.dataset.lien; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(t); t.select(); let r = false; try { r = document.execCommand("copy"); } catch { r = false; } t.remove();
      if (r) ok(); else window.prompt(lang === "en" ? "Copy this link:" : "Copiez ce lien :", b.dataset.lien);
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(b.dataset.lien).then(ok, secours); else secours();
  });
  // En-tête : seule la barre des rubriques reste visible quand on fait défiler la page.
  const entete = document.querySelector(".site-header"), barre = document.getElementById("sections");
  const caler = () => { if (entete && barre) entete.style.top = `${barre.offsetHeight - entete.offsetHeight}px`; };
  window.addEventListener("resize", caler); window.addEventListener("load", caler); setTimeout(caler, 0);
  document.getElementById("search-btn").addEventListener("click", () => setTimeout(caler, 0));
  window.addEventListener("hashchange", () => { if (ANCIEN.test(location.hash)) route(); });
  // Les liens internes restent dans l'application (pas de rechargement), sauf fichiers et pages statiques.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const el = e.target.closest("a[href]"); if (!el || el.target || el.hasAttribute("download")) return;
    const u = new URL(el.getAttribute("href"), location.href);
    if (u.origin !== location.origin || /\.\w+$/.test(u.pathname) || STATIQUES.test(u.pathname)) return;
    if (u.pathname === location.pathname && u.search === location.search && u.hash && !ANCIEN.test(u.hash)) return; // ancre dans la page
    e.preventDefault();
    navigate(u.pathname + u.search + u.hash);
  });
  applyStatic();
  // Données : un index léger (sans les textes) pour afficher vite, le texte intégral à la demande.
  // La version change à chaque publication : le navigateur peut garder les fichiers en cache entre deux.
  const VERSION = "__VERSION__";
  const v = "?v=" + (VERSION.startsWith("__") ? Date.now() : VERSION);
  let complet = null, completCharge = false;
  function chargerComplet() {
    return complet || (complet = fetch("/articles.json" + v).then((r) => r.json()).then((data) => {
      completCharge = true;
      const parId = new Map(data.map((x) => [x.id, x]));
      for (const a of articles) { const f = parId.get(a.id); if (f) { a.corps = f.corps; a.liens = f.liens; } }
    }).catch(() => {}));
  }
  const chargerIndex = () => Promise.all([
    fetch("/articles-index.json" + v).then((r) => (r.ok ? r.json() : fetch("/articles.json" + v).then((x) => x.json()))),
    fetch("/img/stock/credits.json" + v).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]).then(([data, credits]) => { articles = data; photos = credits || {}; });
  if (app.dataset.statique && !RECHERCHE.test(location.pathname)) {
    // Page statique : affichée tout de suite, l'index est chargé ensuite pour une navigation instantanée.
    route();
    const plusTard = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
    plusTard(() => chargerIndex().catch(() => {}), { timeout: 4000 });
  } else if (app.dataset.prerendu) {
    // Accueil pré-construit : affiché tel quel ; seul le fil « En continu » est rafraîchi une fois la page chargée.
    markNav(null);
    const rafraichir = () => chargerIndex().then(() => {
      premier = false;
      const ancien = document.querySelector(".live");
      if (!ancien) return;
      const t = document.createElement("div"); t.innerHTML = renderLive();
      if (t.firstElementChild) ancien.replaceWith(t.firstElementChild);
    }).catch(() => {});
    const apresChargement = () => (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(rafraichir, { timeout: 2500 });
    if (document.readyState === "complete") apresChargement(); else window.addEventListener("load", apresChargement, { once: true });
  } else {
    chargerIndex().then(route).catch(() => { app.innerHTML = `<div class="erreur-chargement" role="alert"><p>${esc(T.error)}</p><button type="button" id="reessayer">${esc(T.retry)}</button></div>`; document.getElementById("reessayer").addEventListener("click", () => location.reload()); });
  }
})();
