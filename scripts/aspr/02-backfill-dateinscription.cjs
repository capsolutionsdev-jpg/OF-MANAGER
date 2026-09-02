/**
 * CHANTIER 02 — LOT 2 : DATES D'INSCRIPTION RÉELLES (dossiers CPF/EDOF)
 *
 * Remet la VRAIE date d'inscription de chaque dossier depuis la colonne
 * DATE_INSCRIPTION des exports EDOF (sessions réelles, pas inventées).
 * - Ne remplit QUE les dateInscription VIDES (préserve vos saisies manuelles).
 * - Cible le lot EDOF : Inscription.source commençant par "EDOF <n°> — …".
 * - Mettre à jour dateInscription bumpe updatedAt → le PDF du dossier se
 *   régénère automatiquement avec la bonne date (cf. pdf-cache.ts).
 *
 *   node scripts/aspr/02-backfill-dateinscription.cjs           → SIMULATION (aucune écriture)
 *   node scripts/aspr/02-backfill-dateinscription.cjs --commit  → écriture réelle
 */
const fs = require("fs");
const path = require("path");

// — Chargement .env (préférer DIRECT_URL pour un backfill en masse) —
try {
  for (const l of fs.readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
  }
} catch { /* .env absent : on utilise l'environnement */ }
process.env.DATABASE_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

const TENANTS = [
  { org: "cmsrj9dyw0000l7041hv7dm86", nom: "ASPR Herblay", csv: "C:/Users/GPSP/Downloads/controle edof aspr/Export_Tous les dossiers_89306974000023_20260831.csv" },
  { org: "cmtijd7350000jo0454cobb25", nom: "ASPR Neuilly", csv: "C:/Users/GPSP/Downloads/Export_Tous les dossiers_89306974000015_20260901.csv" },
];

const COL_NUM = 0, COL_DATE_INSC = 32; // NUMERO_DOSSIER ; DATE_INSCRIPTION (jj/mm/aaaa)
const toDate = (fr) => { const m = String(fr || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null; };

async function main() {
  console.log(`=== LOT 2 : dates d'inscription EDOF ${COMMIT ? "(ÉCRITURE)" : "(SIMULATION)"} ===\n`);
  let totalUp = 0;
  for (const t of TENANTS) {
    if (!fs.existsSync(t.csv)) { console.log(`⚠ ${t.nom} : CSV introuvable (${t.csv}) — ignoré`); continue; }
    const rows = fs.readFileSync(t.csv, "utf8").replace(/\r/g, "").split("\n").filter(Boolean).slice(1).map((l) => l.split(";"));
    const dateByNum = new Map();
    for (const r of rows) {
      const num = String(r[COL_NUM] || "").trim();
      const d = toDate(r[COL_DATE_INSC]);
      if (num && d) dateByNum.set(num, d);
    }

    const insc = await p.inscription.findMany({
      where: { organismeId: t.org, source: { startsWith: "EDOF " }, dateInscription: null },
      select: { id: true, source: true },
    });
    let up = 0, noNum = 0, noDate = 0;
    for (const i of insc) {
      const num = (i.source || "").match(/^EDOF\s+(\S+)/)?.[1];
      if (!num) { noNum++; continue; }
      const d = dateByNum.get(num);
      if (!d) { noDate++; continue; }
      if (COMMIT) await p.inscription.update({ where: { id: i.id }, data: { dateInscription: d } });
      up++;
    }
    totalUp += up;
    console.log(`${t.nom} : ${insc.length} dossier(s) sans date | ${COMMIT ? "MIS À JOUR" : "à mettre à jour"} : ${up} | sans n° : ${noNum} | date EDOF absente : ${noDate}`);
  }
  console.log(`\n${COMMIT ? "✅ Écrit" : "SIMULATION"} — total ${COMMIT ? "mis à jour" : "à mettre à jour"} : ${totalUp}`);
  if (!COMMIT) console.log("→ Relancer avec --commit pour écrire réellement.");
}
main().catch((e) => { console.error("ERREUR", e.message); process.exit(1); }).finally(() => p.$disconnect());
