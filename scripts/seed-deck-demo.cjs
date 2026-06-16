const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Tenant CAP introuvable");
  const day = 86400000;
  await p.tache.createMany({
    data: [
      { organismeId: org.id, titre: "DECKDEMO Rappeler M. Dupont (devis Webmarketing)", dueDate: new Date(Date.now() - 2 * day), done: false },
      { organismeId: org.id, titre: "DECKDEMO Envoyer la convention à AKTO", dueDate: new Date(Date.now() + 1 * day), done: false },
      { organismeId: org.id, titre: "DECKDEMO Préparer la session SST de juin", dueDate: new Date(Date.now() + 3 * day), done: false },
    ],
  });
  console.log("Tâches démo deck créées.");
  await p.$disconnect();
})();
