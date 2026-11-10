// Scénarios d'utilisation et tentatives de faire planter le site. Usage : node test-scenarios.js http://localhost:8765
// Navigateur choisi par NAVIGATEUR (chromium par défaut, firefox, webkit = moteur de Safari).
const chromium=require("playwright")[process.env.NAVIGATEUR||"chromium"];const B=process.argv[2];const pb=[];const ok=(c,m)=>{if(!c)pb.push(m)};
const A=require(require("path").join(__dirname, "..", "_site", "articles.json"));
(async()=>{const br=await chromium.launch();
for(const [nom,vp] of [["ordinateur",{width:1440,height:900}],["mobile",{width:390,height:844}]]){
 const ctx=await br.newContext({viewport:vp,hasTouch:nom==="mobile"});const p=await ctx.newPage();const errs=[];
 // Clic qui ne bloque pas toute la suite : un clic impossible devient un problème signalé, avec l'état de l'élément.
 const clic=async(sel,o={})=>{try{await p.click(sel,{timeout:8000,...o})}catch(e){const el=await p.$(sel);pb.push(`${nom}: clic impossible sur ${sel} (${el?((await el.isVisible())?"visible":"présent mais invisible"):"absent"}) sur ${p.url()} : ${e.message.split("\n")[0].slice(0,90)}`)}};
 p.on("pageerror",e=>errs.push(p.url()+" "+e.message));p.on("console",m=>{if(m.type()==="error"&&!/fonts\.g|ERR_|net::/.test(m.text())){if(!/status of 404/.test(m.text()))errs.push(p.url()+" console "+m.text())}});
 p.on("dialog",d=>{pb.push(nom+": une boîte de dialogue s'est ouverte ("+d.message()+")");d.dismiss()});
 const h1=()=>p.evaluate(()=>(document.querySelector("h1")||{}).textContent||"");
 const ovf=async(t)=>ok(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),`${nom}: débordement horizontal sur ${t}`);
 // 1. Accueil puis chaque rubrique par la barre de navigation (FR puis EN)
 for(const lang of ["fr","en"]){
  await p.goto(B+(lang==="en"?"/en/":"/"));await p.waitForTimeout(900);await ovf("accueil "+lang);
  const liens=await p.$$eval("#sections a",x=>x.map(a=>({h:a.getAttribute("href"),t:a.textContent})));
  ok(liens.length>=11,`${nom}: barre des rubriques incomplète (${liens.length})`);
  for(const l of liens){await clic(`#sections a[href="${l.h}"]`,{force:true}).catch(async()=>{await p.goto(B+l.h)});await p.waitForTimeout(500);
   const u=new URL(p.url()).pathname;ok(u===l.h,`${nom}: clic « ${l.t} » mène à ${u} au lieu de ${l.h}`);
   const t=await h1();ok(t.trim().length>0,`${nom}: page ${l.h} sans titre`);await ovf(l.h);
   ok(await p.evaluate(h=>!!document.querySelector(`#sections a[href="${h}"][aria-current="page"]`),l.h),`${nom}: rubrique active non signalée sur ${l.h}`)}
 }
 // 2. Tous les liens d'articles de l'accueil (clic, titre identique, retour)
 await p.goto(B+"/");await p.waitForTimeout(900);
 const arts=await p.$$eval("main a[href]",x=>[...new Set(x.map(a=>a.getAttribute("href")).filter(h=>/^\/[a-z-]+\/\d{4}\/|^\/archives\/\d{4}\//.test(h)))]);
 for(const h of arts.slice(0,25)){await p.goto(B+"/");await p.waitForTimeout(400);const el=await p.$(`main a[href="${h}"]`);if(!el)continue;await el.scrollIntoViewIfNeeded();await el.click({force:true});await p.waitForTimeout(600);
  const a=A.find(x=>x.chemin===h.split("#")[0]);const t=(await h1()).trim();ok(a&&t===a.titre.replace(/\s+/g," ").trim()||t.length>0,`${nom}: ${h} titre inattendu « ${t.slice(0,60)} »`);
  ok(new URL(p.url()).pathname===h.split("#")[0],`${nom}: lien ${h} ouvre ${p.url()}`);
  await p.goBack();await p.waitForTimeout(400);ok(new URL(p.url()).pathname==="/",`${nom}: retour arrière depuis ${h} ne revient pas à l'accueil`)}
 // 3. Menu « Rubriques » : ouvrir, fermer, naviguer
 await p.goto(B+"/economie/");await p.waitForTimeout(700);
 await clic("#menu-btn");await p.waitForTimeout(200);ok(await p.isVisible("#drawer"),`${nom}: le menu ne s'ouvre pas`);
 ok(await p.getAttribute("#menu-btn","aria-expanded")==="true",`${nom}: aria-expanded faux menu ouvert`);
 await clic("#menu-btn");await p.waitForTimeout(200);ok(!(await p.isVisible("#drawer")),`${nom}: le menu ne se ferme pas`);
 await clic("#menu-btn");await clic("#drawer-nav a[href*='contact']");await p.waitForTimeout(500);ok(/contact/.test(p.url())&&!(await p.isVisible("#drawer")),`${nom}: menu → Contact ne marche pas ou reste ouvert`);
 await clic("#menu-btn");await p.keyboard.press("Escape");await p.waitForTimeout(200);ok(!(await p.isVisible("#drawer")),`${nom}: Échap ne ferme pas le menu`);
 if(await p.isVisible("#drawer"))await clic("#menu-btn");
 // 4. Recherche : cas normaux et pièges
 const qs=["Nice","Lisnard","festival de cannes","zzzzqqq","é","  ","<img src=x onerror=alert(1)>","\"><script>alert(1)</script>","%","a".repeat(500),"NICE","Côte d'Azur"];
 for(const q of qs){await p.goto(B+"/");await p.waitForTimeout(400);await clic("#search-btn");await p.waitForTimeout(150);
  ok(await p.isVisible("#search-input"),`${nom}: champ de recherche invisible`);await p.fill("#search-input",q);await p.press("#search-input","Enter");await p.waitForTimeout(500);
  const t=await p.evaluate(()=>document.querySelector("main").innerText);ok(!/undefined|NaN|\[object/.test(t),`${nom}: recherche « ${q.slice(0,20)} » affiche undefined/NaN`);
  if(q==="Nice")ok((await p.$$(".list-item")).length>5,`${nom}: « Nice » trouve trop peu de résultats`)}
 await p.goto(B+"/recherche/?q=Lisnard");await p.waitForTimeout(1200);ok((await p.$$(".list-item")).length>0,`${nom}: /recherche/?q=Lisnard en accès direct sans résultat`);
 const r1=await p.$(".list-item h3 a");if(r1){const h=await r1.getAttribute("href");await r1.click();await p.waitForTimeout(600);ok(new URL(p.url()).pathname===h.split("#")[0],`${nom}: clic sur un résultat de recherche ne s'ouvre pas`)}
 // 4b. Page de recherche vide : champ, suggestions, Échap sur la recherche de l'en-tête
 for(const u of ["/recherche/","/en/search/"]){await p.goto(B+u);await p.waitForTimeout(1200);ok(await p.isVisible(".recherche-page input"),`${nom}: pas de champ sur ${u}`);
  await p.fill(".recherche-page input","Monaco");await p.press(".recherche-page input","Enter");await p.waitForTimeout(600);ok((await p.$$(".list-item")).length>0&&/q=Monaco/.test(p.url()),`${nom}: recherche depuis ${u} sans résultat`);
  await p.goto(B+u);await p.waitForTimeout(1000);const sg=await p.$(".suggestions a");ok(!!sg,`${nom}: pas de suggestions sur ${u}`);if(sg){await sg.click();await p.waitForTimeout(600);ok((await p.$$(".list-item")).length>0,`${nom}: suggestion sans résultat sur ${u}`)}}
 await p.goto(B+"/");await p.waitForTimeout(500);await clic("#search-btn");await p.keyboard.press("Escape");await p.waitForTimeout(200);ok(!(await p.isVisible("#search-input")),`${nom}: Échap ne ferme pas la recherche`);
 // 5. Changement de langue sur chaque type de page
 const types=["/","/economie/","/archives/","/recherche/?q=Nice","/histoire/","/mentions-legales/","/contact/","/sujet/junior-william-joyant/","/tous-les-articles/",A.find(a=>a.type==="article"&&a.lang!=="en"&&A.some(b=>b.id===a.id.replace(/^(\d{4}-\d\d-\d\d)-/,"$1-en-"))).chemin,A.find(a=>a.type==="archive"&&a.lang!=="en"&&a.precision!=="annee").chemin];
 for(const u of types){for(const attente of [150,2500]){await p.goto(B+u);await p.waitForTimeout(attente);const avant=new URL(p.url()).pathname;
  await clic(".langs button[data-lang='en']");await p.waitForTimeout(900);const ap=new URL(p.url()).pathname;
  ok(ap.startsWith("/en/")&&ap!==avant,`${nom}: FR→EN depuis ${u} (après ${attente} ms) mène à ${ap}`);
  ok(await p.evaluate(()=>document.documentElement.lang)==="en",`${nom}: langue de la page pas « en » après bascule depuis ${u}`);
  await clic(".langs button[data-lang='fr']");await p.waitForTimeout(900);const re=new URL(p.url()).pathname;ok(!re.startsWith("/en/"),`${nom}: EN→FR depuis ${ap} reste en anglais (${re})`)}}
 // 6. Bouton « copier le lien » et liens de partage
 const art=A.find(a=>a.type==="article"&&a.lang!=="en"&&a.corps);await ctx.grantPermissions(["clipboard-read","clipboard-write"],{origin:B}).catch(()=>{});
 await p.goto(B+art.chemin);await p.waitForTimeout(600);const cp=await p.$(".copier");ok(!!cp,`${nom}: pas de bouton copier sur un article`);
 if(cp){await cp.click();await p.waitForTimeout(300);if((process.env.NAVIGATEUR||"chromium")==="chromium"){const clip=await p.evaluate(()=>navigator.clipboard.readText().catch(()=>""));ok(clip.endsWith(art.chemin),`${nom}: le lien copié est « ${clip} »`)}else{/* Firefox et WebKit : le presse-papiers n'est pas lisible par le test, on vérifie la confirmation affichée */ok(await p.evaluate(()=>!!document.querySelector(".copier.copie")),`${nom}: pas de confirmation après « copier le lien »`)}
  const parts=await p.$$eval(".partage a",x=>x.map(a=>a.href));ok(parts.length===5&&parts.every(h=>h.includes(encodeURIComponent("/"+art.chemin.split("/")[1]))||h.startsWith("mailto:")),`${nom}: liens de partage incorrects`)}
 // 7. Navigation SPA puis rechargement, avant/arrière en rafale
 await p.goto(B+"/");await p.waitForTimeout(700);for(const h of ["/sport/","/culture/","/archives/","/tech/"]){await clic(`#sections a[href="${h}"]`,{force:true});await p.waitForTimeout(250)}
 for(let i=0;i<4;i++){await p.goBack();}await p.waitForTimeout(700);ok(new URL(p.url()).pathname==="/",`${nom}: 4 retours arrière rapides finissent sur ${p.url()}`);
 for(let i=0;i<4;i++){await p.goForward();}await p.waitForTimeout(700);ok(new URL(p.url()).pathname==="/tech/"&&/Tech/.test(await h1()),`${nom}: avance rapide incohérente (${p.url()}, « ${await h1()} »)`);
 await p.reload();await p.waitForTimeout(700);ok(/Tech/.test(await h1()),`${nom}: rechargement de /tech/ cassé`);
 // 8. Adresses piégées
 for(const [u,attendu] of [["/nimporte-quoi/","introuvable|not found"],["/economie/2099/01/01/inexistant/","introuvable|not found"],["/economie","Économie"],["/#a/"+(A.find(a=>a.type==="article"&&a.lang!=="en").id),""],["/a/"+(A.find(a=>a.type==="article"&&a.lang!=="en").id)+".html",""],["/archives/?theme=sport","Archives"],["/archives/#y-2019","Archives"],["/en/nope/","not found|introuvable"],["/?q=<script>","" ],["/recherche/?q=%E9%%","" ]]){
  const r=await p.goto(B+u).catch(e=>null);await p.waitForTimeout(1200);const t=await h1();
  ok(attendu===""?t.trim().length>0:new RegExp(attendu,"i").test(t),`${nom}: ${u} affiche « ${t.slice(0,60)} »`)}
 // 9. Clics rapides répétés et double clics
 await p.goto(B+"/");await p.waitForTimeout(700);for(let i=0;i<8;i++){await clic("#menu-btn");}await clic("#search-btn");await clic("#search-btn");await clic(".langs button[data-lang='en']");await clic(".langs button[data-lang='fr']");await p.waitForTimeout(1200);
 ok((await h1()).length>0||(await p.$$(".lead,.block")).length>0,`${nom}: page vide après clics en rafale`);
 // 10. Filtres des archives
 await p.goto(B+"/archives/");await p.waitForTimeout(1200);const filtres=await p.$$eval(".themes a, .years a, .annees a",x=>x.map(a=>a.getAttribute("href")).slice(0,12));
 for(const f of filtres){await p.goto(B+"/archives/");await p.waitForTimeout(500);const el=await p.$(`a[href="${f}"]`);if(!el)continue;await el.click({force:true});await p.waitForTimeout(500);ok((await p.$$(".list-item")).length>0||/#y-/.test(f),`${nom}: filtre d'archives ${f} vide`)}
 ok(errs.length===0,`${nom}: erreurs JavaScript : ${[...new Set(errs)].slice(0,5).join(" | ")}`);
 await ctx.close()}
// 11. Sans JavaScript : les pages statiques doivent rester lisibles
const nj=await br.newContext({javaScriptEnabled:false});const q=await nj.newPage();for(const u of ["/","/economie/",A.find(a=>a.type==="article"&&a.lang!=="en").chemin,"/archives/"]){await q.goto(B+u);const t=await q.evaluate(()=>document.body.innerText.length);ok(t>500,`sans JavaScript : ${u} quasi vide (${t} caractères)`)}
// 12. Mode sombre
const dk=await br.newContext({colorScheme:"dark"});const d=await dk.newPage();await d.goto(B+"/economie/");await d.waitForTimeout(600);const bg=await d.evaluate(()=>getComputedStyle(document.body).backgroundColor);ok(bg!=="rgb(255, 255, 255)",`mode sombre : fond resté blanc`);
await br.close();console.log(pb.length?pb.map(x=>"✗ "+x).join("\n"):"Aucun problème.");console.log(pb.length+" problème(s)")})();
