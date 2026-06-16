const fs = require("fs");
const path = require("path");

// Actions appelées UNIQUEMENT depuis l'UI authentifiée → cloisonnées.
const FILES = [
  "candidat-actions", "admin-actions", "account-actions", "client-pro-actions",
  "crm-actions", "session-actions", "formateur-actions", "formation-actions",
  "qualiopi-actions", "registre-actions", "learning-actions", "cours-actions",
  "apprenant-actions", "emargement-actions", "rgpd-actions",
  "automation-settings-actions", "email-actions", "inscription-actions",
].map((n) => path.join("src/lib/actions", n + ".ts"));

function matchBrace(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function bodyOpenAfterParams(s, fnIdx) {
  const pOpen = s.indexOf("(", fnIdx);
  let depth = 0, pClose = -1;
  for (let i = pOpen; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) { pClose = i; break; } }
  }
  return s.indexOf("{", pClose);
}

let total = 0;
for (const fp of FILES) {
  if (!fs.existsSync(fp)) { console.log("absent:", fp); continue; }
  let s = fs.readFileSync(fp, "utf8");
  if (!s.includes('from "@/lib/prisma"')) { console.log("pas de prisma:", fp); continue; }

  // Injecter db dans chaque "export async function ... {" dont le corps utilise prisma.
  // On traite de la fin vers le début pour ne pas décaler les index.
  const re = /export\s+async\s+function\s+\w+\s*\(/g;
  const idxs = [];
  let m;
  while ((m = re.exec(s)) !== null) idxs.push(m.index);
  let injected = 0;
  for (let k = idxs.length - 1; k >= 0; k--) {
    const bo = bodyOpenAfterParams(s, idxs[k]);
    const bc = matchBrace(s, bo);
    if (bo < 0 || bc < 0) continue;
    const body = s.slice(bo + 1, bc);
    if (!/\bprisma\./.test(body)) continue;
    s = s.slice(0, bo + 1) + "\n  const db = await getTenantDb();" + s.slice(bo + 1);
    injected++;
  }
  if (injected === 0) { console.log("aucune fonction à cloisonner:", fp); continue; }

  s = s.replace(/import\s*\{\s*prisma\s*\}\s*from\s*"@\/lib\/prisma";?/,
    'import { getTenantDb } from "@/lib/tenant";');
  s = s.replace(/\bprisma\./g, "db.");
  fs.writeFileSync(fp, s);
  console.log("OK", fp.replace(/.*actions./, "actions/"), "(" + injected + " fn)");
  total++;
}
console.log("Fichiers convertis:", total);
