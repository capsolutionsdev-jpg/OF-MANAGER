const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const design = process.argv[2] || null; // "" → null
const color = process.argv[3] || null;
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Tenant CAP introuvable");
  await p.organisme.update({
    where: { id: org.id },
    data: { design: design === "" ? null : design, ...(color ? { couleurPrimaire: color } : {}) },
  });
  console.log(`CAP design = ${design || "(défaut)"}${color ? " · " + color : ""}`);
  await p.$disconnect();
})();
