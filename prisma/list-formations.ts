import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const fs = await prisma.formation.findMany({
    where: { isArchived: false },
    orderBy: { titre: "asc" },
    select: { titre: true, reference: true, certification: true },
  });
  for (const f of fs) {
    console.log(`- ${f.titre} (réf. ${f.reference}${f.certification ? ", " + f.certification : ""})`);
  }
  console.log(`TOTAL: ${fs.length}`);
}

main().finally(() => prisma.$disconnect());
