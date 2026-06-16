const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Tenant CAP introuvable");
  const past = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const t = await p.tache.create({
    data: {
      organismeId: org.id,
      titre: "SMOKE NOTIF — tâche en retard",
      dueDate: past,
      done: false,
    },
  });
  console.log("Tâche en retard créée:", t.id);
  await p.$disconnect();
})();
