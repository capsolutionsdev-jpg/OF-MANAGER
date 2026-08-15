/**
 * Provisionne ASPR FORMATION avec l'INTÉGRALITÉ du catalogue de référence
 * (21 modèles sécurité + transport, dont SSIAP 2/3 Recyclage & Remise à niveau
 * qui avaient été manqués car la réparation précédente tournait sur un catalogue
 * périmé de 16 commits). Idempotent : ne crée que les formations absentes
 * (rapprochement par titre normalisé), puis fixe la configuration sur les 21 clés.
 *
 *   npx tsx scripts/provision-aspr-full.mts            # simulation
 *   npx tsx scripts/provision-aspr-full.mts --write    # écriture réelle
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
const { BIBLIOTHEQUE_FORMATIONS } = await import("../src/lib/formations-catalog");
const { normaliserTitre } = await import("../src/lib/catalogue-securite");

const write = process.argv.includes("--write");
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organisme.findFirst({ where: { nom: "ASPR FORMATION" }, select: { id: true, nom: true } });
  if (!org) { console.error("STOP : ASPR FORMATION introuvable."); process.exit(1); }

  const existantes = await prisma.formation.findMany({
    where: { organismeId: org.id, isArchived: false },
    select: { titre: true, reference: true },
  });
  const titres = new Set(existantes.map((f) => normaliserTitre(f.titre)));
  const refs = new Set(existantes.map((f) => f.reference));

  console.log(`Mode : ${write ? "ÉCRITURE" : "SIMULATION"}  | ASPR FORMATION a ${existantes.length} formations`);
  const creer: { cle: string; titre: string }[] = [];

  for (const m of BIBLIOTHEQUE_FORMATIONS) {
    const dejaLa = [m.titre, ...m.alias].some((t) => titres.has(normaliserTitre(t)));
    if (dejaLa) continue;
    creer.push({ cle: m.cle, titre: m.titre });
    if (!write) continue;

    let reference = m.reference;
    for (let n = 2; refs.has(reference); n++) reference = `${m.reference}-${n}`;
    await prisma.formation.create({
      data: {
        organismeId: org.id,
        titre: m.titre,
        dureeHeures: m.dureeHeures,
        dureeJours: Math.max(1, Math.ceil(m.dureeHeures / 7)),
        duree: m.duree,
        objectifs: m.objectifs,
        prerequis: m.prerequis,
        programme: m.programme,
        publicVise: m.publicVise,
        methodesPedagogiques: m.methodesPedagogiques,
        modalitesEvaluation: m.modalitesEvaluation,
        certification: m.certification,
        reference,
        modalite: "PRESENTIEL",
        examen: m.examen,
        soumisJury: m.soumisJury,
        nbJury: m.soumisJury ? (m.nbJury ?? null) : null,
        grilleInrs: m.grilleInrs ?? null,
        piecesAttendues: m.piecesAttendues,
        delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
      },
    });
    refs.add(reference);
    titres.add(normaliserTitre(m.titre));
  }

  console.log(`\n${creer.length} formation(s) ${write ? "créée(s)" : "à créer"} :`);
  for (const c of creer) console.log(`  - ${c.titre} (${c.cle})`);

  const toutesCles = BIBLIOTHEQUE_FORMATIONS.map((m) => m.cle);
  if (write) {
    await prisma.organisme.update({ where: { id: org.id }, data: { configurationsFormations: toutesCles } });
    console.log(`\n✅ Config fixée sur ${toutesCles.length} clés. Total formations : ${existantes.length + creer.length}`);
  } else {
    console.log(`\nConfig serait fixée sur ${toutesCles.length} clés. Relancer avec --write.`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
