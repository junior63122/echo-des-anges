#!/usr/bin/env node
// Reporte les photos trouvées par le robot sur la dernière version du journal.
// Le robot travaille jusqu'à 40 minutes : entre-temps, d'autres publications ont pu modifier articles.json.
// Plutôt qu'une fusion git (conflits), on reprend la version à jour et on y recopie, article par article,
// uniquement ce que le robot a ajouté : la photo (et son fichier), ses recherches et ses échecs.
// Une photo écartée entre-temps (exclues.json) n'est jamais réintroduite.
// Usage : node scripts/fusion-photos.mjs <articles.json du robot> <dossier img/entreprises du robot>
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [fichierRobot, dossierRobot] = process.argv.slice(2);
const robot = new Map(JSON.parse(readFileSync(fichierRobot, "utf8")).map((a) => [a.id, a]));
const DB = join(ROOT, "articles.json");
const articles = JSON.parse(readFileSync(DB, "utf8"));
const EX = join(ROOT, "img", "entreprises", "exclues.json");
const exclues = new Set(existsSync(EX) ? JSON.parse(readFileSync(EX, "utf8")) : []);
const prises = new Set(articles.map((a) => a.image?.page).filter(Boolean));
let photos = 0, echecs = 0;
for (const a of articles) {
  const r = robot.get(a.id);
  if (!r) continue;
  if (!a.imageCommons && r.imageCommons) a.imageCommons = r.imageCommons; // recherches tirées du titre
  if (a.image) continue;
  if (r.image && r.image.src && !exclues.has(r.image.page) && (!prises.has(r.image.page) || articles.some((x) => x !== a && x.image?.page === r.image.page && x.image.src === r.image.src))) {
    const source = join(dossierRobot, basename(r.image.src));
    const cible = join(ROOT, r.image.src);
    if (!existsSync(cible)) { if (!existsSync(source)) continue; copyFileSync(source, cible); }
    a.image = r.image; delete a.imageEchec; prises.add(r.image.page); photos++;
  } else if (r.imageEchec && r.imageEchec === JSON.stringify(a.imageCommons)) { a.imageEchec = r.imageEchec; echecs++; }
}
writeFileSync(DB, JSON.stringify(articles, null, 2) + "\n");
console.log(`${photos} photo(s) et ${echecs} échec(s) reportés sur la dernière version.`);
