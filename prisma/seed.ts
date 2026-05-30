import { PrismaClient, Role, CandidatStatut, FinancementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed en cours…");

  // -------- Compte unique : Administrateur --------
  // Modifiable via les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD.
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@cap.fr";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      email: adminEmail,
      name: "Administrateur",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  // -------- Nettoyage : on retire les anciens comptes de démo --------
  const demoEmails = [
    "responsable@cap.fr",
    "assistant@cap.fr",
    "formateur@cap.fr",
    "apprenant@cap.fr",
  ].filter((e) => e !== adminEmail);

  await prisma.formateur.deleteMany({ where: { email: { in: demoEmails } } });
  await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });

  // -------- Catalogue de formations --------
  // Les formations réelles sont importées depuis le site vitrine via :
  //   npx tsx prisma/import-academies.ts
  // (Aucune formation de démo créée ici pour éviter les doublons.)

  // -------- Candidats de démo (seulement si aucun) --------
  const candidatCount = await prisma.candidat.count();
  if (candidatCount === 0) {
    await prisma.candidat.createMany({
      data: [
        {
          nom: "Diallo",
          prenom: "Fatou",
          email: "fatou.diallo@example.com",
          telephone: "06 12 34 56 78",
          ville: "Paris",
          codePostal: "75011",
          situationPro: "Demandeuse d'emploi",
          financementType: FinancementType.CPF,
          statut: CandidatStatut.NOUVEAU,
        },
        {
          nom: "Bernard",
          prenom: "Thomas",
          email: "thomas.bernard@example.com",
          telephone: "06 98 76 54 32",
          ville: "Montreuil",
          codePostal: "93100",
          situationPro: "Salarié",
          employeur: "Agence Pixel",
          financementType: FinancementType.OPCO,
          statut: CandidatStatut.EN_TRAITEMENT,
        },
        {
          nom: "Nguyen",
          prenom: "Linh",
          email: "linh.nguyen@example.com",
          ville: "Les Lilas",
          codePostal: "93260",
          situationPro: "Indépendante",
          financementType: FinancementType.AUTOFINANCEMENT,
          statut: CandidatStatut.INSCRIT,
        },
      ],
    });
  }

  const total = await prisma.user.count();
  console.log("✅ Seed terminé.");
  console.log(`   Compte administrateur : ${adminEmail}`);
  console.log(`   Comptes en base : ${total}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
