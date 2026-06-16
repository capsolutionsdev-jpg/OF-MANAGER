const fs = require("fs");
const path = require("path");
const ROOT = "src/app/(app)";
const results = { converted: [], manual: [] };

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else if (e.name === "page.tsx") processFile(fp);
  }
}

function injectAfterFnBody(s, marker) {
  const mi = s.indexOf(marker);
  if (mi < 0) return null;
  const pOpen = s.indexOf("(", mi);
  if (pOpen < 0) return null;
  let depth = 0, pClose = -1;
  for (let i = pOpen; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) { pClose = i; break; } }
  }
  if (pClose < 0) return null;
  const bodyOpen = s.indexOf("{", pClose);
  if (bodyOpen < 0) return null;
  return s.slice(0, bodyOpen + 1) + "\n  const db = await getTenantDb();" + s.slice(bodyOpen + 1);
}

function processFile(fp) {
  let s = fs.readFileSync(fp, "utf8");
  if (!s.includes('from "@/lib/prisma"')) return;
  s = s.replace(/import\s*\{\s*prisma\s*\}\s*from\s*"@\/lib\/prisma";?/,
    'import { getTenantDb } from "@/lib/tenant";');
  const injected = injectAfterFnBody(s, "export default async function");
  if (!injected) { results.manual.push(fp); return; }
  s = injected;
  s = s.replace(/\bprisma\./g, "db.");
  fs.writeFileSync(fp, s);
  results.converted.push(fp);
}

walk(ROOT);
console.log("CONVERTIS (" + results.converted.length + "):");
results.converted.forEach((f) => console.log("  " + f));
if (results.manual.length) {
  console.log("\nA TRAITER MANUELLEMENT (" + results.manual.length + "):");
  results.manual.forEach((f) => console.log("  " + f));
}
