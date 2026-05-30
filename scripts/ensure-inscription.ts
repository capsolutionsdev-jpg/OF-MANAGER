import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    where: { reference: "SES-DEMO-01" },
  });
  const candidat = await prisma.candidat.findFirst({ orderBy: { nom: "asc" } });
  if (!session || !candidat) {
    console.log("MISSING_DATA");
    return;
  }

  let insc = await prisma.inscription.findFirst({
    where: { sessionId: session.id, candidatId: candidat.id },
  });
  if (!insc) {
    insc = await prisma.inscription.create({
      data: {
        candidatId: candidat.id,
        sessionId: session.id,
        statut: "VALIDEE",
        financementType: "CPF",
        source: "manuel",
      },
    });
  }
  console.log(`INSCRIPTION_ID=${insc.id}`);
  console.log(`CANDIDAT=${candidat.prenom} ${candidat.nom}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
