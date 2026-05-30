import { PrismaClient, Modalite, SessionStatut } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const f = await prisma.formation.findFirst({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
  });
  if (!f) {
    console.log("Aucune formation en base.");
    return;
  }

  let session = await prisma.session.findFirst({
    where: { reference: "SES-DEMO-01" },
  });
  if (!session) {
    const now = new Date();
    const plus = (d: number) => new Date(now.getTime() + d * 86400000);
    session = await prisma.session.create({
      data: {
        formationId: f.id,
        reference: "SES-DEMO-01",
        dateDebut: plus(15),
        dateFin: plus(18),
        horaires: "9h-12h30 / 13h30-17h",
        lieu: "Les Lilas (93) + en ligne",
        modalite: Modalite.MIXTE,
        nbPlaces: 10,
        statut: SessionStatut.OUVERTE,
      },
    });
  }

  const candidat = await prisma.candidat.findFirst({ orderBy: { nom: "asc" } });

  console.log(`SESSION_ID=${session.id}`);
  console.log(`CANDIDAT_ID=${candidat?.id ?? ""}`);
  console.log(`FORMATION=${f.titre}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
