import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let f = await prisma.formateur.findFirst({ where: { email: "julie.demo@cap.fr" } });
  if (!f) {
    f = await prisma.formateur.create({
      data: {
        nom: "Martin",
        prenom: "Julie",
        email: "julie.demo@cap.fr",
        specialites: "Sécurité, SST, prévention",
        experienceAnnees: 8,
      },
    });
  }
  const s = await prisma.session.findFirst({ where: { reference: "SES-DEMO-01" } });
  if (s) {
    await prisma.session.update({
      where: { id: s.id },
      data: { formateurs: { connect: { id: f.id } } },
    });
  }
  console.log("FORMATEUR_ID=" + f.id);
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
