// Harmonisation des dossiers administratifs (Formation.piecesAttendues) selon les
// corrections métier, + archivage des templates VIDES en doublon.
// SÛR : garde-fou anti-orphelin (n'archive jamais une fiche ayant des inscrits).
//   node scripts/update-dossiers-formations.mjs           # DRY-RUN
//   node scripts/update-dossiers-formations.mjs --commit  # écrit en base

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

// ── Dossiers corrigés (source de vérité métier) ──────────────────────────────
const CNAPS = [
  "CNI / Passeport / Carte de séjour",
  "1 photo d'identité (facultative)",
  "Casier judiciaire (du pays d'origine pour les étrangers)",
  "Attestation de niveau B1 (étrangers) ou diplôme",
  "Autorisation préalable CNAPS (ou carte professionnelle valide)",
];
const DIRIGEANT = [
  "CNI / Passeport / Carte de séjour",
  "Justificatif de domicile",
  "1 photo d'identité",
  "Casier judiciaire (extrait bulletin n°3)",
  "Preuve de nationalité (français ou UE/EEE)",
  "Diplôme niveau BAC ou SSIAP 3 ou justificatif d'expérience professionnelle",
];
const SST = ["CNI / Passeport / Carte de séjour", "Justificatif de domicile", "1 photo d'identité"];
const MAC_SST = [...SST, "Ancienne carte SST"];
const SSIAP_BASE = [
  "CNI / Passeport / Carte de séjour",
  "Attestation SST (secourisme) en cours de validité",
  "Certificat d'aptitude médicale (moins de 3 mois)",
];
const SSIAP1_INIT = [...SSIAP_BASE];
const SSIAP2_INIT = [...SSIAP_BASE, "Diplôme SSIAP 1", "Attestation de travail de 1607 h comme SSIAP 1"];
const SSIAP3_INIT = [...SSIAP_BASE, "Diplôme BAC ou équivalent OU attestation de travail de +3 ans comme SSIAP 2"];
const ssiapRec = (n) => [
  "CNI / Passeport / Carte de séjour",
  "Attestation SST (secourisme) en cours de validité",
  `Copie du diplôme SSIAP ${n}`,
  "Attestation du dernier recyclage ou remise à niveau",
];
const HABELEC = ["CNI / Passeport / Carte de séjour"];

// Réf → dossier (fiches CONSERVÉES ; celles absentes ici ne sont pas touchées).
const DOSSIERS = {
  "F-TFPAPS": CNAPS, "A3P": CNAPS, "OP-VIDEO": CNAPS, "F-MACAPS": CNAPS,
  "dirigeant-societe-securite-privee-initiale": DIRIGEANT,
  "F-SST": SST,
  "F-MACSST": MAC_SST,
  "F-SSIAP1": SSIAP1_INIT,
  "F-SSIAP2": SSIAP2_INIT,
  "F-SSIAP3": SSIAP3_INIT,
  "F-RSSIAP1": ssiapRec(1), "SSIAP1-REC": ssiapRec(1), "SSIAP1-RAN": ssiapRec(1),
  "SSIAP2-REC": ssiapRec(2), "SSIAP2-RAN": ssiapRec(2),
  "SSIAP3-REC": ssiapRec(3), "SSIAP3-RAN": ssiapRec(3),
  "F-HABELEC": HABELEC,
};

// Templates VIDES en doublon d'une fiche en service → à archiver (si 0 inscrit).
const ARCHIVE = ["MAC-APS", "TFP-APS", "SST", "MAC-SST", "SSIAP2", "SSIAP3"];

async function main() {
  console.log(`Mode ${COMMIT ? "COMMIT" : "DRY-RUN"}\n`);
  const forms = await prisma.formation.findMany({ select: { id: true, reference: true, titre: true, isArchived: true } });
  const byRef = new Map(forms.filter((f) => f.reference).map((f) => [f.reference, f]));

  // 1) Dossiers.
  console.log("── Dossiers à appliquer ──");
  let maj = 0;
  for (const [ref, pieces] of Object.entries(DOSSIERS)) {
    const f = byRef.get(ref);
    if (!f) { console.log(`  ⚠️  ${ref} introuvable — ignoré`); continue; }
    console.log(`  ${ref.padEnd(34)} → ${pieces.length} pièces`);
    if (COMMIT) { await prisma.formation.update({ where: { id: f.id }, data: { piecesAttendues: pieces } }); maj++; }
  }

  // 2) Archivage sécurisé.
  console.log("\n── Archivage (templates vides en doublon) ──");
  let arch = 0;
  for (const ref of ARCHIVE) {
    const f = byRef.get(ref);
    if (!f) { console.log(`  ⚠️  ${ref} introuvable`); continue; }
    const nInsc = await prisma.inscription.count({ where: { session: { formationId: f.id } } });
    if (nInsc > 0) { console.log(`  ⛔ ${ref} a ${nInsc} inscrit(s) → NON archivé (garde-fou)`); continue; }
    console.log(`  🗄️  ${ref} (0 inscrit) → archivé`);
    if (COMMIT && !f.isArchived) { await prisma.formation.update({ where: { id: f.id }, data: { isArchived: true } }); arch++; }
  }

  console.log(`\n${COMMIT ? `✅ ${maj} dossiers mis à jour · ${arch} fiches archivées.` : "ℹ️  DRY-RUN — rien écrit."}`);
}
main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
