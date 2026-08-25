import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Remet à zéro les données opérationnelles (démo) en conservant :
//   - le catalogue de formations
//   - les indicateurs Qualiopi
//   - les comptes utilisateurs (dont l'admin)
async function main() {
  // ⛔ Garde anti-catastrophe (PC-LIV-02) : ce script SUPPRIME toutes les données
  // opérationnelles (paiements, factures, inscriptions, candidats…) de TOUS les
  // organismes. Il n'est PAS scopé par tenant et, la base de dev pointant aujourd'hui
  // la prod, une exécution accidentelle serait catastrophique. On exige donc une
  // confirmation EXPLICITE, et on affiche la base ciblée.
  const dbHost = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").host || "(inconnue)";
    } catch {
      return "(inconnue)";
    }
  })();
  if (process.env.CONFIRM_DESTRUCTIVE !== "RESET_DATA") {
    console.error(
      "\n⛔ reset-data ANNULÉ.\n" +
        "   Ce script supprime TOUTES les données opérationnelles de TOUS les organismes.\n" +
        `   Base ciblée : ${dbHost}\n` +
        "   Pour confirmer volontairement :\n" +
        "     CONFIRM_DESTRUCTIVE=RESET_DATA npx tsx scripts/reset-data.ts\n",
    );
    process.exit(1);
  }
  console.warn(`⚠️  reset-data CONFIRMÉ sur ${dbHost} — suppression en cours…\n`);

  await prisma.presence.deleteMany({});
  await prisma.evaluationResultat.deleteMany({});
  await prisma.evaluation.deleteMany({});
  await prisma.signatureRequest.deleteMany({});
  await prisma.documentGenere.deleteMany({});
  await prisma.paiement.deleteMany({});
  await prisma.facture.deleteMany({});
  await prisma.contrat.deleteMany({});
  await prisma.convention.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.inscription.deleteMany({});
  await prisma.seance.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.crmInteraction.deleteMany({});
  await prisma.devis.deleteMany({});
  await prisma.dataRequest.deleteMany({});
  await prisma.consentement.deleteMany({});
  await prisma.apprenant.deleteMany({});
  await prisma.pieceJointe.deleteMany({});
  await prisma.candidat.deleteMany({});
  await prisma.entreprise.deleteMany({});
  await prisma.formateur.deleteMany({});

  console.log("✅ Données de démo supprimées.");
  console.log(
    `   Conservés — utilisateurs: ${await prisma.user.count()}, formations: ${await prisma.formation.count()}, indicateurs Qualiopi: ${await prisma.qualiopiIndicateur.count()}`,
  );
  console.log(
    `   Vidés — candidats: ${await prisma.candidat.count()}, sessions: ${await prisma.session.count()}, formateurs: ${await prisma.formateur.count()}, inscriptions: ${await prisma.inscription.count()}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
