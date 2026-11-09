// Vérifie chaque lien interne, image, script et feuille de style de chaque page HTML du site publié.
const fs=require("fs"),path=require("path");const R=process.argv[2];
const pages=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())w(p);else if(f.endsWith(".html"))pages.push(p)}})(R);
const existe=(u)=>{let p=decodeURIComponent(u.split("#")[0].split("?")[0]);if(!p.startsWith("/"))return true;const f=path.join(R,p);if(fs.existsSync(f)){if(fs.statSync(f).isDirectory())return fs.existsSync(path.join(f,"index.html"));return true}return false};
const erreurs={};let n=0;const externes=new Set();
for(const pg of pages){const h=fs.readFileSync(pg,"utf8");const rel="/"+path.relative(R,pg);
 for(const m of h.matchAll(/(?:href|src|content)="([^"]+)"/g)){let u=m[1].replace(/&amp;/g,"&");
  if(/^https?:\/\/echodesanges\.fr/.test(u))u=u.replace(/^https?:\/\/echodesanges\.fr/,"")||"/";
  else if(/^https?:/.test(u)){externes.add(u);continue}
  if(!u.startsWith("/")||u.startsWith("//"))continue;n++;
  if(!existe(u))(erreurs[u]||=[]).push(rel)}
 for(const m of h.matchAll(/srcset="([^"]+)"/g))for(const s of m[1].split(",")){const u=s.trim().split(" ")[0];n++;if(!existe(u))(erreurs[u]||=[]).push(rel)}}
// adresses du plan du site et chemins des articles
const sm=fs.readFileSync(path.join(R,"sitemap.xml"),"utf8");for(const m of sm.matchAll(/<loc>https:\/\/echodesanges\.fr([^<]*)<\/loc>/g)){n++;if(!existe(m[1]||"/"))(erreurs[m[1]]||=[]).push("sitemap.xml")}
for(const a of JSON.parse(fs.readFileSync(path.join(R,"articles.json"),"utf8")))if(a.chemin){n++;if(!existe(a.chemin))(erreurs[a.chemin]||=[]).push("articles.json "+a.id)}
const mal=[...externes].filter(u=>{try{new URL(u);return /\s/.test(u)}catch{return true}});
console.log(`${pages.length} pages, ${n} liens internes vérifiés, ${Object.keys(erreurs).length} cassés ; ${externes.size} liens externes, ${mal.length} mal formés`);
for(const [u,p] of Object.entries(erreurs).slice(0,30))console.log("  ✗",u,"←",p.length,"page(s), ex.",p[0]);
for(const u of mal.slice(0,10))console.log("  ✗ externe",u);
