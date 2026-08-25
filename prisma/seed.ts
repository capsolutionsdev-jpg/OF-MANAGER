import { PrismaClient, Role, CandidatStatut, FinancementType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed en cours…");

  // -------- Compte unique : Administrateur --------
  // Modifiable via les variables d'environnement ADMIN_EMAIL / ADMIN_PASSWORD.
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@cap.fr";
  // Garde anti-catastrophe (PC-LIV-02) : plus jamais de mot de passe par défaut faible.
  const explicitPassword = process.env.ADMIN_PASSWORD;
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (!existingAdmin) {
    // Nouvel admin : mot de passe = ADMIN_PASSWORD si fourni, sinon un secret aléatoire
    // fort, affiché une seule fois (jamais « password123 »).
    let pwd = explicitPassword;
    if (!pwd) {
      pwd = randomBytes(12).toString("base64url");
      console.warn(
        `\n⚠️  ADMIN_PASSWORD non défini → mot de passe ALÉATOIRE généré pour ${adminEmail} :\n` +
          `      ${pwd}\n` +
          "   Notez-le maintenant : il ne sera pas réaffiché.\n",
      );
    }
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Administrateur",
        role: Role.ADMIN,
        passwordHash: await bcrypt.hash(pwd, 10),
      },
    });
  } else {
    // Admin déjà présent : on garantit role/actif, et on ne (ré)écrit le mot de passe
    // QUE si un ADMIN_PASSWORD explicite est fourni (pas de mot de passe « fantôme »).
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: Role.ADMIN,
        isActive: true,
        ...(explicitPassword
          ? { passwordHash: await bcrypt.hash(explicitPassword, 10) }
          : {}),
      },
    });
  }

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

  // -------- Candidats de démo (opt-in explicite uniquement) --------
  // Garde anti-catastrophe (PC-LIV-02) : ne JAMAIS injecter de candidats fictifs dans
  // une base réelle. On exige SEED_DEMO=1 (à poser uniquement en dev).
  const candidatCount = await prisma.candidat.count();
  if (process.env.SEED_DEMO === "1" && candidatCount === 0) {
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
