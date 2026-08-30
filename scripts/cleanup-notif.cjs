const { PrismaClient } = require("@prisma/client");
require("./_guard.cjs").assertSafeDb({ label: "cleanup-notif" });
const p = new PrismaClient();
(async () => {
  const r = await p.tache.deleteMany({ where: { titre: { startsWith: "SMOKE NOTIF" } } });
  console.log("Tâches smoke supprimées:", r.count);
  await p.$disconnect();
})();
