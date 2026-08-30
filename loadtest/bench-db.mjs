/**
 * CHRONOMÈTRE DE REQUÊTES — Audit 07 (performance / charge).
 * Rejoue, sur la base de TEST remplie par seed-loadtest.mjs, les requêtes réelles
 * des écrans les plus lourds d'OFMANAGER, et mesure p50 / p95 / max (ms).
 * En plus : EXPLAIN ANALYZE sur la requête comptabilité (détecte les Seq Scan).
 *
 * Lecture seule (SELECT). N'écrit rien. Utilise LOADTEST_DATABASE_URL uniquement.
 * Usage :  node loadtest/bench-db.mjs
 */
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.loadtest")) {
  for (const l of readFileSync(".env.loadtest", "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); if (!process.env[m[1]]) process.env[m[1]] = v; }
  }
}
const URL = process.env.LOADTEST_DATABASE_URL;
if (!URL) { console.error("✋ LOADTEST_DATABASE_URL manquant (.env.loadtest)."); process.exit(1); }

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient({ datasourceUrl: URL });

const org = await prisma.organisme.findFirst({ where: { sousDomaine: "loadtest" }, select: { id: true } });
if (!org) { console.error("✋ Aucun tenant « loadtest ». Lance d'abord : node loadtest/seed-loadtest.mjs"); process.exit(1); }
const OID = org.id;

// Volumétrie de contexte
const counts = {
  inscriptions: await prisma.inscription.count({ where: { organismeId: OID } }),
  candidats: await prisma.candidat.count({ where: { organismeId: OID } }),
  emargements: await prisma.emargementSignature.count({ where: { organismeId: OID } }),
  factures: await prisma.facture.count({ where: { organismeId: OID } }),
  paiements: await prisma.paiement.count({ where: { organismeId: OID } }),
};
console.log("Volume du tenant loadtest :", JSON.stringify(counts));
console.log("Seuils cibles : liste back-office < 800 ms ·  API lecture p95 < 500 ms.\n");

// ── Scénarios = requêtes réelles des écrans lourds ──
const scenarios = [
  {
    name: "Comptabilité (charge TOUTES les inscriptions non annulées)",
    // Réplique fidèle de src/app/(app)/comptabilite/page.tsx:55
    run: () => prisma.inscription.findMany({
      where: { organismeId: OID, statut: { not: "ANNULEE" } },
      include: {
        candidat: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
        session: { select: { dateDebut: true, dateFin: true, formation: { select: { titre: true } } } },
        factures: { select: { montantTTC: true, datePaiement: true, paiements: { select: { montant: true, date: true } } } },
        paiements: { select: { id: true, montant: true, date: true, mode: true, enregistrePar: { select: { name: true } } }, orderBy: { date: "desc" } },
      },
    }),
  },
  {
    name: "Liste candidats (findMany + inscriptions)",
    run: () => prisma.candidat.findMany({ where: { organismeId: OID }, include: { inscriptions: { select: { id: true, statut: true } } } }),
  },
  {
    name: "Émargements du tenant (findMany global)",
    run: () => prisma.emargementSignature.findMany({ where: { organismeId: OID } }),
  },
  {
    name: "Inscriptions (liste + candidat + session)",
    run: () => prisma.inscription.findMany({ where: { organismeId: OID }, include: { candidat: { select: { nom: true, prenom: true } }, session: { select: { reference: true, formation: { select: { titre: true } } } } } }),
  },
  {
    name: "Factures (liste + inscription/candidat)",
    run: () => prisma.facture.findMany({ where: { organismeId: OID }, include: { inscription: { select: { candidat: { select: { nom: true } } } } } }),
  },
  {
    name: "Signatures (inscriptions non annulées + candidat/session)",
    // Réplique de src/app/(app)/signatures/page.tsx:26
    run: () => prisma.inscription.findMany({ where: { organismeId: OID, statut: { not: "ANNULEE" } }, include: { candidat: { select: { nom: true, prenom: true } }, session: { select: { formation: { select: { titre: true } } } } }, orderBy: { createdAt: "desc" } }),
  },
  {
    name: "Contrôle de places à l'inscription (count par sessionId — index manquant)",
    // Réplique de src/lib/actions/inscription-actions.ts:506 — teste l'absence d'index sessionId
    run: async () => {
      const s = await prisma.session.findFirst({ where: { organismeId: OID }, select: { id: true } });
      return s ? prisma.inscription.count({ where: { organismeId: OID, sessionId: s.id, statut: { not: "ANNULEE" } } }) : 0;
    },
  },
];

async function bench(name, fn, iters = 12) {
  let n = 0;
  try { const r = await fn(); n = Array.isArray(r) ? r.length : 1; } catch (e) { return { name, err: String(e).slice(0, 120) }; }
  const ts = [];
  for (let i = 0; i < iters; i++) {
    const s = process.hrtime.bigint();
    await fn();
    ts.push(Number(process.hrtime.bigint() - s) / 1e6);
  }
  ts.sort((a, b) => a - b);
  const q = (p) => ts[Math.min(ts.length - 1, Math.floor(p * ts.length))];
  return { name, rows: n, p50: q(0.5), p95: q(0.95), max: ts[ts.length - 1] };
}

const rows = [];
for (const sc of scenarios) rows.push(await bench(sc.name, sc.run));

console.log("Résultats (ms) — plus c'est haut, plus c'est lent :\n");
console.log("p50    p95    max    lignes  requête");
console.log("─────────────────────────────────────────────");
for (const r of rows) {
  if (r.err) { console.log(`ERREUR  ${r.name} → ${r.err}`); continue; }
  const f = (x) => String(Math.round(x)).padStart(5);
  const flag = r.p95 > 800 ? "  🔴 >800ms" : r.p95 > 500 ? "  🟠 >500ms" : "  🟢";
  console.log(`${f(r.p50)}  ${f(r.p95)}  ${f(r.max)}  ${String(r.rows).padStart(6)}  ${r.name}${flag}`);
}

// ── EXPLAIN ANALYZE sur la requête comptabilité (racine) ──
console.log("\nEXPLAIN ANALYZE — Inscription (comptabilité) :");
try {
  const plan = await prisma.$queryRawUnsafe(
    `EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM "Inscription" WHERE "organismeId" = $1 AND "statut" <> 'ANNULEE'::"InscriptionStatut"`,
    OID,
  );
  const text = plan.map((p) => Object.values(p)[0]).join("\n");
  console.log(text);
  if (/Seq Scan on "?Inscription"?/i.test(text)) console.log("\n⚠️  Seq Scan détecté sur Inscription → index sur (organismeId, statut) à envisager.");
} catch (e) { console.log("EXPLAIN indisponible :", String(e).slice(0, 160)); }

await prisma.$disconnect();
