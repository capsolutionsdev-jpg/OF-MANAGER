import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1) Compte administrateur réel
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "CapCap2026", 10);
  const adminEmail = process.env.ADMIN_EMAIL ?? "infocap.comp@gmail.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: hash, role: Role.ADMIN, isActive: true },
    create: {
      email: adminEmail,
      name: "Administrateur",
      role: Role.ADMIN,
      passwordHash: hash,
    },
  });
  // Supprimer l'ancien compte de démo
  await prisma.user.deleteMany({ where: { email: "admin@cap.fr" } });

  // 2) Nettoyage des données de démonstration
  const demoCandidats = await prisma.candidat.findMany({
    where: { email: { contains: "example.com" } },
    select: { id: true },
  });
  const candidatIds = demoCandidats.map((c) => c.id);
  const apprenants = await prisma.apprenant.findMany({
    where: { candidatId: { in: candidatIds } },
    select: { id: true },
  });
  const apprenantIds = apprenants.map((a) => a.id);
  const demoSessions = await prisma.session.findMany({
    where: { reference: "SES-DEMO-01" },
    select: { id: true },
  });
  const sessionIds = demoSessions.map((s) => s.id);
  const seances = await prisma.seance.findMany({
    where: { sessionId: { in: sessionIds } },
    select: { id: true },
  });
  const seanceIds = seances.map((s) => s.id);
  const inscriptions = await prisma.inscription.findMany({
    where: {
      OR: [{ candidatId: { in: candidatIds } }, { sessionId: { in: sessionIds } }],
    },
    select: { id: true },
  });
  const inscriptionIds = inscriptions.map((i) => i.id);

  await prisma.presence.deleteMany({
    where: {
      OR: [{ seanceId: { in: seanceIds } }, { apprenantId: { in: apprenantIds } }],
    },
  });
  await prisma.signatureRequest.deleteMany({
    where: { OR: [{ inscriptionId: { in: inscriptionIds } }, { inscriptionId: null }] },
  });
  await prisma.documentGenere.deleteMany({
    where: {
      OR: [
        { inscriptionId: { in: inscriptionIds } },
        { sessionId: { in: sessionIds } },
        { apprenantId: { in: apprenantIds } },
      ],
    },
  });
  await prisma.facture.deleteMany({ where: { inscriptionId: { in: inscriptionIds } } });
  await prisma.contrat.deleteMany({ where: { inscriptionId: { in: inscriptionIds } } });
  await prisma.convention.deleteMany({
    where: {
      OR: [{ inscriptionId: { in: inscriptionIds } }, { sessionId: { in: sessionIds } }],
    },
  });
  await prisma.evaluationResultat.deleteMany({
    where: { apprenantId: { in: apprenantIds } },
  });
  await prisma.inscription.deleteMany({ where: { id: { in: inscriptionIds } } });
  await prisma.seance.deleteMany({ where: { id: { in: seanceIds } } });
  await prisma.emailLog.deleteMany({ where: { sessionId: { in: sessionIds } } });
  await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });
  await prisma.consentement.deleteMany({ where: { candidatId: { in: candidatIds } } });
  await prisma.apprenant.deleteMany({ where: { id: { in: apprenantIds } } });
  await prisma.candidat.deleteMany({ where: { id: { in: candidatIds } } });
  await prisma.formateur.deleteMany({ where: { email: "julie.demo@cap.fr" } });

  console.log("✅ Finalisation V1 effectuée.");
  console.log(`   Admin : ${adminEmail}`);
  console.log(
    `   Restant — utilisateurs: ${await prisma.user.count()}, candidats: ${await prisma.candidat.count()}, sessions: ${await prisma.session.count()}, formateurs: ${await prisma.formateur.count()}, formations: ${await prisma.formation.count()}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
