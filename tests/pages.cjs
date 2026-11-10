// Navigateur choisi par NAVIGATEUR (chromium par défaut, firefox, webkit = moteur de Safari).
const chromium=require("playwright")[process.env.NAVIGATEUR||"chromium"];const fs=require("fs"),path=require("path");const B=process.argv[2],R=process.argv[3];
const pages=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())w(p);else if(f==="index.html")pages.push("/"+path.relative(R,d).split(path.sep).join("/")+(d===R?"":"/"))}})(R);
(async()=>{const br=await chromium.launch();const ctx=await br.newContext({viewport:process.env.LARGE?{width:1440,height:900}:{width:390,height:844}});
await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
const pb=[];let i=0;
const travail=async()=>{const p=await ctx.newPage();let cur="";p.on("pageerror",e=>pb.push(cur+" JS "+e.message));
 while(i<pages.length){const u=pages[i++].replace(/\/+/g,"/");cur=u;
  try{await p.goto(B+u,{waitUntil:"load",timeout:20000});
   const r=await p.evaluate(()=>({h1:(document.querySelector("h1")||{}).textContent||"",ovf:document.documentElement.scrollWidth>innerWidth+1,img:[...document.images].filter(i=>i.complete&&i.loading!=="lazy"&&i.naturalWidth===0).map(i=>i.currentSrc||i.src),vide:document.querySelector("main").innerText.trim().length}));
   if(!r.h1.trim())pb.push(u+" sans titre h1");if(r.ovf)pb.push(u+" déborde");if(r.img.length)pb.push(u+" image cassée "+r.img[0]);if(r.vide<40)pb.push(u+" quasi vide")}catch(e){pb.push(u+" "+e.message.slice(0,80))}}
 await p.close()};
await Promise.all([1,2,3,4,5,6].map(travail));await br.close();
console.log(pages.length+" pages ouvertes");console.log(pb.length?[...new Set(pb)].slice(0,40).join("\n"):"Aucun problème.");console.log(pb.length+" problème(s)")})();
