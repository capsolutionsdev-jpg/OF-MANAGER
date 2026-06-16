const fs = require("fs");
const f = "prisma/schema.prisma";
let s = fs.readFileSync(f, "utf8");
const EXCLUDE = new Set(["Organisme", "User"]); // déjà traités / non-tenant
const re = /model\s+(\w+)\s*\{/g;
let m, count = 0, skipped = [];
// On collecte les positions des modèles
const models = [];
while ((m = re.exec(s)) !== null) models.push({ name: m[1], start: m.index });
// Traiter de la fin vers le début pour ne pas décaler les index
for (let i = models.length - 1; i >= 0; i--) {
  const { name, start } = models[i];
  if (EXCLUDE.has(name)) continue;
  const open = s.indexOf("{", start);
  const close = s.indexOf("\n}", open);
  let block = s.slice(open + 1, close);
  if (/organismeId/.test(block)) { skipped.push(name); continue; }
  // Insérer le champ juste après la 1re ligne contenant @id
  const lines = block.split("\n");
  const idIdx = lines.findIndex((l) => /@id/.test(l));
  const insertAt = idIdx >= 0 ? idIdx + 1 : 1;
  lines.splice(insertAt, 0, "  organismeId String? // tenant (multi-OF)");
  // Ajouter un index en fin de bloc
  lines.push("  @@index([organismeId])");
  block = lines.join("\n");
  s = s.slice(0, open + 1) + block + s.slice(close);
  count++;
}
fs.writeFileSync(f, s);
console.log("Modèles modifiés:", count);
console.log("Déjà ok (ignorés):", skipped.join(", ") || "(aucun)");
