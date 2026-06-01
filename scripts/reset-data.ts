import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Remet à zéro les données opérationnelles (démo) en conservant :
//   - le catalogue de formations
//   - les indicateurs Qualiopi
//   - les comptes utilisateurs (dont l'admin)
async function main() {
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
