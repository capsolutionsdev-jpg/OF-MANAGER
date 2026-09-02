/**
 * CHANTIER 02 — LOT 1 : PRÉ-REMPLISSAGE DES AUDITS (Annexe 2 « à justifier »)
 *
 * Crée, par site ASPR, UN audit par session (périmètre SESSION → la rubrique
 * « Documents de la session » s'affiche dans /audit/[id]), contenant les
 * dossiers cités à l'Annexe 2 du courrier CDC.
 *
 * - Résout les tenants PAR organismeId (2 homonymes).
 * - Joint les n° de dossier CDC à Inscription.source « EDOF <n°> — … ».
 * - Idempotent : ne recrée pas un audit au même titre ; @@unique(auditId,inscriptionId).
 * - Signale les n° CDC INTROUVABLES en base (dossiers cités mais non importés).
 *
 *   npx tsx scripts/aspr/01-seed-audits-annexe2.mts           → SIMULATION
 *   npx tsx scripts/aspr/01-seed-audits-annexe2.mts --commit  → écriture réelle
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const env: Record<string, string> = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) { let v = m[2].trim(); if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1); env[m[1]] = v; }
  }
} catch { /* .env absent */ }
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

// Dossiers cités — Annexe 2 « à justifier » du courrier CDC (colonne A des .xlsx).
const SITES: { org: string; nom: string; numeros: string[] }[] = [
  {
    org: "cmsrj9dyw0000l7041hv7dm86", nom: "ASPR Herblay",
    numeros: ["381466950431","391405001627","391453360024","391475895619","391476953615","391481223012","391481329439","401444862542","401468453418","421348109412","421424171229","421444479248","421445994211","421446967216","421448681211","421448688828","421449817830","421451021610","421455620011","421457225397","421462216225","421464928462","421466109020","421467040067","421476062011"],
  },
  {
    org: "cmtijd7350000jo0454cobb25", nom: "ASPR Neuilly",
    numeros: ["381465891909","391443522568","391457209912","391457409611","391457642062","391465899621","391467110621","391468030828","391468152416","391475980437","401422385839","401427564222","401440842423","401445987611","401448721611","401464872512","401466112271","401467242416","401469168833","401472053444","401472610417","401472731825","401477049231","421422140424","421430168813","421433941018","421441151824","421443814262","421447760412","421450252646","421453313411","421454180629","421455492825","421455716140","421457166864","421460614819","421465921813","421468363062","421468446305","421469089013","421473669420","421473675237","421476028418","421476734817","421483403026","431425050414","431428708265","431455654879","431455667715","431468262074"],
  },
];

const numFromSource = (src: string | null) => (src || "").match(/^EDOF\s+(\S+)/)?.[1] ?? null;
const dfr = (d: Date) => d.toLocaleDateString("fr-FR");

async function main() {
  console.log(`=== LOT 1 : pré-remplissage audits Annexe 2 ${COMMIT ? "(ÉCRITURE)" : "(SIMULATION)"} ===\n`);
  let totalAudits = 0, totalDossiers = 0;

  for (const site of SITES) {
    const wanted = new Set(site.numeros);
    const insc = await prisma.inscription.findMany({
      where: { organismeId: site.org, source: { startsWith: "EDOF " } },
      select: {
        id: true, sessionId: true, source: true,
        candidat: { select: { nom: true, prenom: true } },
        session: { select: { reference: true, dateDebut: true, formation: { select: { titre: true } } } },
      },
    });

    // Filtre aux dossiers cités + groupe par session.
    const matched = insc.filter((i) => { const n = numFromSource(i.source); return n && wanted.has(n); });
    const foundNums = new Set(matched.map((i) => numFromSource(i.source)!));
    const missing = site.numeros.filter((n) => !foundNums.has(n));

    const bySession = new Map<string, typeof matched>();
    for (const i of matched) {
      if (!i.sessionId) continue;
      let arr = bySession.get(i.sessionId);
      if (!arr) { arr = []; bySession.set(i.sessionId, arr); }
      arr.push(i);
    }

    console.log(`— ${site.nom} : ${matched.length}/${site.numeros.length} dossiers trouvés · ${bySession.size} session(s)`);
    if (missing.length) console.log(`   ⚠️ ${missing.length} n° CDC introuvable(s) en base : ${missing.join(", ")}`);

    for (const [sessionId, dossiers] of bySession) {
      const s = dossiers[0].session!;
      const titreBase = `Contrôle CDC — Annexe 2 — ${s.formation.titre} — ${dfr(s.dateDebut)}`;
      const titre = titreBase.slice(0, 200);

      const exists = await prisma.auditControle.findFirst({ where: { organismeId: site.org, titre }, select: { id: true } });
      if (exists) { console.log(`   = déjà présent : ${titre} (${dossiers.length} dossier(s))`); continue; }

      console.log(`   + audit : ${titre} — ${dossiers.length} dossier(s)`);
      totalAudits++; totalDossiers += dossiers.length;
      if (COMMIT) {
        await prisma.auditControle.create({
          data: {
            organismeId: site.org, type: "CONTROLE", perimetre: "SESSION", sessionId,
            titre, responsableNom: "Contrôle CDC",
            dossiers: { create: dossiers.map((d) => ({ organismeId: site.org, inscriptionId: d.id })) },
          },
        });
      }
    }
    console.log("");
  }

  console.log(`${COMMIT ? "✅ Écrit" : "SIMULATION"} — ${totalAudits} audit(s) · ${totalDossiers} dossier(s) rattaché(s)`);
  if (!COMMIT) console.log("→ Relancer avec --commit pour écrire réellement.");
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error("ERREUR", e); await prisma.$disconnect(); process.exit(1); });
