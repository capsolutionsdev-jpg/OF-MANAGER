/**
 * PURGE DÉMO — AGUYSE FORMATION.
 * Supprime UNIQUEMENT les données de démo taguées (créées par seed-aguyse-demo.cjs)
 * de l'organisme AGUYSE. Ne touche NI aux 15 formations, NI à l'admin, NI à l'org.
 *
 * Marqueurs : sessions « DEMO- » · candidats/formateurs « @demo.aguyse.local »
 *             · salles « DÉMO · » · factures « DEMO-FAC- ».
 *
 * DRY-RUN par défaut (n'efface rien). Pour exécuter :
 *   node scripts/clean-aguyse-demo.cjs --write
 */
const { readFileSync } = require("node:fs");
const path = require("node:path");

const env = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch { /* .env absent */ }
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;
require("./_guard.cjs").assertSafeDb({ label: "clean-aguyse-demo" });

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const NOM = "AGUYSE FORMATION";
const DOMAIN = "demo.aguyse.local";
const SALLE_PREFIX = "DÉMO · ";
const SESSION_PREFIX = "DEMO-";
const WRITE = process.argv.includes("--write");

(async () => {
  const org = await p.organisme.findFirst({ where: { nom: NOM }, select: { id: true } });
  if (!org) { console.error(`STOP : organisme « ${NOM} » introuvable.`); process.exit(1); }
  const OID = org.id;

  const sessions = await p.session.findMany({ where: { organismeId: OID, reference: { startsWith: SESSION_PREFIX } }, select: { id: true } });
  const sIds = sessions.map((s) => s.id);
  const cands = await p.candidat.findMany({ where: { organismeId: OID, email: { endsWith: "@" + DOMAIN } }, select: { id: true } });
  const cIds = cands.map((c) => c.id);
  const formateurs = await p.formateur.findMany({ where: { organismeId: OID, email: { endsWith: "@" + DOMAIN } }, select: { id: true } });
  const salles = await p.salle.findMany({ where: { organismeId: OID, nom: { startsWith: SALLE_PREFIX } }, select: { id: true } });
  const inscr = await p.inscription.findMany({ where: { OR: [{ sessionId: { in: sIds } }, { candidatId: { in: cIds } }] }, select: { id: true } });
  const iIds = inscr.map((i) => i.id);
  const nbFac = await p.facture.count({ where: { inscriptionId: { in: iIds } } });

  console.log(`Organisme AGUYSE : ${OID}`);
  console.log("À supprimer (démo taguée uniquement) :");
  console.log(`  sessions=${sIds.length} · inscriptions=${iIds.length} · factures=${nbFac}`);
  console.log(`  candidats=${cIds.length} · formateurs=${formateurs.length} · salles=${salles.length}`);

  if (!WRITE) {
    console.log("\n[DRY-RUN] Rien supprimé. Relancer avec --write pour exécuter.");
    await p.$disconnect();
    return;
  }

  const del = async (model, where) => { try { const r = await p[model].deleteMany({ where }); return r.count; } catch { return 0; } };
  await p.$transaction(async (tx) => {
    const dm = async (model, where) => { try { await tx[model].deleteMany({ where }); } catch { /* table absente / vide */ } };
    for (const m of ["facture","documentGenere","signatureRequest","consentement","pieceJointe","emailLog"]) await dm(m, { inscriptionId: { in: iIds } });
    await dm("inscription", { id: { in: iIds } });
    await dm("session", { id: { in: sIds }, organismeId: OID });
    for (const m of ["candidatInteraction","candidatMessage","pieceJointe","consentement","reclamation"]) await dm(m, { candidatId: { in: cIds } });
    await dm("candidat", { id: { in: cIds }, organismeId: OID });
    await dm("formateur", { organismeId: OID, email: { endsWith: "@" + DOMAIN } });
    await dm("salle", { organismeId: OID, nom: { startsWith: SALLE_PREFIX } });
  });
  console.log("\n✅ Données de démo supprimées. Formations / admin / organisme intacts.");
  await p.$disconnect();
})().catch(async (e) => { console.error("ERREUR :", e); try { await p.$disconnect(); } catch {} process.exit(1); });
