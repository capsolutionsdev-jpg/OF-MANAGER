import { PrismaClient, Academy } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const f = await prisma.formateur.findFirst({ where: { email: "julie.demo@cap.fr" } });
  const formation = await prisma.formation.findFirst({ where: { academy: Academy.SAFETY } });
  if (f) {
    await prisma.formateur.update({
      where: { id: f.id },
      data: {
        academies: [Academy.SAFETY],
        formations: formation ? { connect: { id: formation.id } } : undefined,
      },
    });
    console.log("FORMATEUR_ID=" + f.id);
  } else {
    console.log("FORMATEUR_ID=");
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
