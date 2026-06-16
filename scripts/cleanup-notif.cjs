const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const r = await p.tache.deleteMany({ where: { titre: { startsWith: "SMOKE NOTIF" } } });
  console.log("Tâches smoke supprimées:", r.count);
  await p.$disconnect();
})();
