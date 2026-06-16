const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const r = await p.user.updateMany({
    where: { email: "infocap.comp@gmail.com" },
    data: { notificationsSeenAt: null },
  });
  console.log("notificationsSeenAt réinitialisé:", r.count);
  await p.$disconnect();
})();
