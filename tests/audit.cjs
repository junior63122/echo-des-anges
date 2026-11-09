// Audit complémentaire : tailles d'écran, clavier, accessibilité (axe), cibles tactiles, réseau, mouvement réduit, XSS, CLS.
// Usage : node test-audit.js http://localhost:8765
const { chromium } = require("playwright");
const fs = require("fs");
const B = process.argv[2];
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const A = require(require("path").join(__dirname, "..", "_site", "articles.json"));
const pb = []; const note = (m) => { pb.push(m); console.log("✗ " + m); };
const fr = A.filter((a) => a.lang !== "en" && a.chemin);
const en = A.filter((a) => a.lang === "en" && a.chemin);
const PAGES = [
  "/", "/economie/", "/sport/", "/archives/", "/tous-les-articles/", "/recherche/?q=cannes", "/contact/", "/mentions-legales/",
  "/sujet/junior-william-joyant/", "/page-inexistante-xyz/", "/en/", "/en/business/", "/en/archives/", "/en/search/?q=nice",
  fr.find((a) => a.image && a.image.paysage).chemin, fr.find((a) => a.image && !a.image.paysage).chemin,
  fr.find((a) => a.type === "revue").chemin, fr.find((a) => a.type === "archive").chemin, fr.find((a) => !a.image).chemin || "/",
  en.find((a) => a.image).chemin,
];
const TAILLES = [[320, 568], [360, 740], [390, 844], [844, 390], [768, 1024], [1024, 768], [1280, 800], [1920, 1080], [2560, 1440]];

(async () => {
  const br = await chromium.launch();
  let nVerif = 0;
  // 1. Toutes les tailles d'écran : débordements, éléments hors écran, images, h1, cibles tactiles.
  for (const [w, h] of TAILLES) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 && w < h });
    await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    const p = await ctx.newPage();
    const erreurs = [];
    p.on("pageerror", (e) => erreurs.push(e.message));
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource.*(404|ERR_FAILED)/.test(m.text())) erreurs.push(m.text()); });
    p.on("response", (r) => { if (r.status() >= 400 && !/page-inexistante/.test(r.url()) && !/fonts\./.test(r.url())) erreurs.push(r.status() + " " + r.url()); });
    for (const u of PAGES) {
      erreurs.length = 0;
      await p.goto(B + u, { waitUntil: "networkidle" });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } scrollTo(0, 0); });
      await p.waitForTimeout(150);
      const r = await p.evaluate((mobile) => {
        const vw = document.documentElement.clientWidth;
        const out = [];
        if (document.documentElement.scrollWidth > vw + 1) out.push("défilement horizontal " + document.documentElement.scrollWidth + ">" + vw);
        for (const el of document.querySelectorAll("body *")) {
          const s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden" || el.closest("[hidden],.sr-only,[aria-hidden=true] svg")) continue;
          const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
          const defile = (() => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === "auto" || o === "scroll") return true; } return false; })();
          if (b.right > vw + 2 && !defile && !el.closest(".ticker,.live") && s.position !== "fixed") { out.push("hors écran : " + el.tagName + "." + el.className + " " + Math.round(b.right)); break; }
        }
        for (const img of document.images) if (img.complete && img.naturalWidth === 0 && getComputedStyle(img).display !== "none") out.push("image cassée " + img.currentSrc);
        for (const img of document.images) if (!img.hasAttribute("alt")) out.push("image sans alt " + img.src);
        if (document.querySelectorAll("h1").length !== 1) out.push(document.querySelectorAll("h1").length + " h1");
        // Texte coupé : élément à texte dont le contenu dépasse et qui masque le débordement sans points de suspension.
        for (const el of document.querySelectorAll("h1,h2,h3,p,a,button,li,span,figcaption")) {
          const s = getComputedStyle(el);
          if ((s.overflow === "hidden" || s.overflowX === "hidden") && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== "ellipsis" && el.clientWidth > 1 && !el.closest(".ticker,.live,.sr-only")) { out.push("texte coupé " + el.tagName + "." + el.className); break; }
        }
        if (mobile) {
          // WCAG 2.2 (2.5.8) : cibles d'au moins 24 × 24 px, sauf liens dans le texte.
          for (const el of document.querySelectorAll("a,button,input,select,[role=button]")) {
            const s = getComputedStyle(el); if (s.display === "none" || s.visibility === "hidden" || el.closest("[hidden]")) continue;
            const b = el.getBoundingClientRect(); if (!b.width) continue;
            // Exceptions WCAG : lien dans une phrase, ou titre d'article (ligne de texte sans autre cible à moins de 24 px).
            const enLigne = s.display === "inline" && el.closest("p,li,figcaption,dd,.corps,.chapo,.credit,h1,h2,h3,h4");
            if (!enLigne && (b.width < 24 || b.height < 24) && !el.classList.contains("skip")) { out.push("cible trop petite " + el.tagName + " «" + (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30) + "» " + Math.round(b.width) + "×" + Math.round(b.height)); break; }
          }
        }
        return out;
      }, w < 900);
      nVerif++;
      for (const m of [...r, ...erreurs]) note(`${w}×${h} ${u} : ${m}`);
    }
    await ctx.close();
  }
  console.log(`tailles : ${nVerif} pages×tailles vérifiées`);

  // 2. Accessibilité automatique (axe-core, WCAG 2.2 AA) en mobile et ordinateur, clair et sombre.
  for (const [nom, vp, schema] of [["ordinateur", { width: 1440, height: 900 }, "light"], ["mobile", { width: 390, height: 844 }, "light"], ["mobile sombre", { width: 390, height: 844 }, "dark"]]) {
    const ctx = await br.newContext({ viewport: vp, colorScheme: schema, bypassCSP: true }); // axe est injecté en ligne : la CSP du site le bloquerait
    await ctx.route(/fonts\.(googleapis|gstatic)/, (r) => r.abort());
    const p = await ctx.newPage();
    for (const u of PAGES) {
      await p.goto(B + u, { waitUntil: "networkidle" });
      await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] })).violations.map((x) => `${x.id} (${x.nodes.length}) ${x.nodes[0].target.join(" ")}`));
      for (const m of v) note(`axe ${nom} ${u} : ${m}`);
    }
    await ctx.close();
  }
  console.log("axe terminé");

  // 3. Clavier : lien d'évitement, focus visible, menu au clavier, Échap.
  {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    for (const u of ["/", PAGES[14]]) {
      await p.goto(B + u, { waitUntil: "networkidle" });
      await p.keyboard.press("Tab");
      const premier = await p.evaluate(() => ({ t: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute("href") }));
      if (!/contenu|content/i.test(premier.t)) note(`clavier ${u} : pas de lien d'évitement en premier (« ${premier.t} »)`);
      else { await p.keyboard.press("Enter"); const f = await p.evaluate(() => document.activeElement.id || document.activeElement.tagName); if (!/app|MAIN/.test(f)) note(`clavier ${u} : le lien d'évitement ne déplace pas le focus (${f})`); }
      // 40 tabulations : chaque élément focalisé doit avoir un indicateur visible.
      let invisibles = 0, vus = 0;
      for (let i = 0; i < 40; i++) {
        await p.keyboard.press("Tab");
        const vis = await p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e); const b = e.getBoundingClientRect(); return { ok: (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none", dansEcran: b.bottom > 0 && b.top < innerHeight, n: e.tagName + "." + e.className }; });
        if (!vis) continue; vus++;
        if (!vis.ok) { invisibles++; if (invisibles === 1) note(`clavier ${u} : focus invisible sur ${vis.n}`); }
        if (!vis.dansEcran) note(`clavier ${u} : élément focalisé hors écran ${vis.n}`);
      }
      if (!vus) note(`clavier ${u} : aucune tabulation possible`);
    }
    await ctx.close();
  }
  console.log("clavier terminé");

  // 4. Réseau : lent, coupé, erreurs serveur, hors ligne après chargement.
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
    const err = []; // Une navigation coupée par le réseau annule la transition de page : message du navigateur, sans effet sur la page.
    p.on("pageerror", (e) => { if (!/Transition was aborted/.test(e.message)) err.push(e.message); });
    const cdp = await ctx.newCDPSession(p);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 });
    const t0 = Date.now(); await p.goto(B + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    const titre = await p.textContent("h1").catch(() => ""); if (!titre) note("réseau lent : accueil sans titre");
    console.log("accueil en 3G lente : DOM prêt en " + (Date.now() - t0) + " ms");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    // Données en erreur 500 : la page statique doit rester lisible et la navigation fonctionner.
    await ctx.route(/articles(-index)?\.json/, (r) => r.fulfill({ status: 500, body: "erreur" }));
    await p.goto(B + PAGES[14], { waitUntil: "networkidle" });
    if (!(await p.textContent("h1"))) note("erreur 500 des données : article vide");
    await p.click("header a[href='/economie/'], nav a[href='/economie/']").catch(() => {});
    await p.waitForLoadState("networkidle");
    if (!/economie/.test(p.url()) || !(await p.textContent("h1"))) note("erreur 500 des données : navigation vers une rubrique cassée " + p.url());
    // Réponse JSON invalide.
    await ctx.unroute(/articles(-index)?\.json/);
    await ctx.route(/articles(-index)?\.json/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{pas du json" }));
    await p.goto(B + "/recherche/?q=nice", { waitUntil: "networkidle" });
    const txt = await p.textContent("main"); if (!/indisponible|unavailable|réessayer|erreur/i.test(txt || "")) note("JSON invalide : la recherche n'affiche aucun message d'erreur");
    await ctx.unroute(/articles(-index)?\.json/);
    // Hors ligne après chargement : un clic doit mener quelque part, pas une page blanche figée.
    await p.goto(B + "/", { waitUntil: "networkidle" });
    await ctx.setOffline(true);
    const lien = await p.$("main a[href^='/'][href$='/']"); const href = await lien.getAttribute("href");
    await lien.click().catch(() => {}); await p.waitForTimeout(1500);
    const corps = await p.evaluate(() => document.body.innerText.length);
    if (corps < 50) note("hors ligne : page blanche après un clic vers " + href);
    await ctx.setOffline(false);
    for (const e of err) note("réseau : erreur JS " + e);
    await ctx.close();
  }
  console.log("réseau terminé");

  // 5. Mouvement réduit : aucune animation ou transition longue.
  {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" }); const p = await ctx.newPage();
    for (const u of ["/", PAGES[14]]) {
      await p.goto(B + u, { waitUntil: "networkidle" });
      const longs = await p.evaluate(() => { const r = []; for (const el of document.querySelectorAll("*")) { const s = getComputedStyle(el); const d = Math.max(...s.animationDuration.split(",").map(parseFloat)) * (s.animationName !== "none" ? 1 : 0); const t = Math.max(...s.transitionDuration.split(",").map(parseFloat)); if (d > 0.01 || t > 0.2) r.push(el.tagName + "." + el.className + " " + d + "/" + t); } return r.slice(0, 3); });
      for (const m of longs) note(`mouvement réduit ${u} : ${m}`);
    }
    await ctx.close();
  }
  // 6. XSS par l'adresse et la recherche.
  {
    const ctx = await br.newContext(); const p = await ctx.newPage(); let alerte = false; p.on("dialog", (d) => { alerte = true; d.dismiss(); });
    for (const q of ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', "javascript:alert(1)", "%3Csvg%20onload%3Dalert(1)%3E"]) {
      await p.goto(B + "/recherche/?q=" + encodeURIComponent(q), { waitUntil: "networkidle" });
      await p.fill("input[type=search]", q).catch(() => {}); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
      await p.goto(B + "/" + encodeURIComponent(q) + "/", { waitUntil: "networkidle" });
    }
    if (alerte) note("XSS : un script injecté s'est exécuté");
    await ctx.close();
  }
  // 7. Stabilité visuelle (CLS) et plus grand affichage (LCP) en mobile.
  {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
    // Processeur ralenti (téléphone modeste) : les décalages tardifs apparaissent comme chez un vrai lecteur.
    const cdpCls = await ctx.newCDPSession(p); await cdpCls.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    for (const u of PAGES) {
      await p.goto(B + u, { waitUntil: "load" });
      const cls = await p.evaluate(() => new Promise((res) => { let c = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) c += e.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => res(c), 1500); }));
      if (cls > 0.02) note(`CLS ${u} : ${cls.toFixed(3)}`);
    }
    await ctx.close();
  }
  // 8. Clics sur un appareil lent, juste après l'arrivée sur l'accueil (non-régression : un élément animé
  //    qui bouge entre l'appui et le relâchement faisait perdre le clic).
  {
    const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await p.goto(B + "/", { waitUntil: "load" });
    const dureesClic = [];
    const liens = (await p.$$eval("main a[href]", (x) => x.map((a) => a.getAttribute("href")).filter((h) => /^\/[a-z-]+\/\d{4}\//.test(h)))).slice(0, 10);
    for (const h of liens) {
      await p.goto(B + "/economie/"); await p.goto(B + "/"); await p.waitForTimeout(400);
      const el = await p.$(`main a[href="${h}"]`); if (!el) continue;
      const accueil = (await p.textContent("h1")) || ""; // titre de l'accueil, lu avant le clic
      await el.click({ force: true });
      await p.waitForURL((u) => u.pathname === h.split("#")[0], { timeout: 8000 }).catch(() => note(`clic lent : ${h} ne s'ouvre pas`));
      // L'article doit s'afficher vite : pas l'accueil qui reste à l'écran sous la nouvelle adresse.
      const t0 = Date.now();
      await p.waitForFunction((t) => (document.querySelector("h1") || {}).textContent !== t, accueil, { timeout: 10000 }).catch(() => note(`clic lent : ${h} garde l'accueil affiché plus de 10 s`));
      dureesClic.push(Date.now() - t0);
    }
    console.log(`clics sur appareil lent (processeur ÷6) : article affiché en ${dureesClic.join(", ")} ms`);
    await ctx.close();
  }
  await br.close();
  console.log(`\n${pb.length} problème(s)`);
})();
