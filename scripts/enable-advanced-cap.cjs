const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ADD = [
  "kanban", "taches", "devis-signature", "notifications",
  "leads-multicanal", "scoring", "sms", "ia", "rapports", "portail-client",
];
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Tenant CAP introuvable");
  const current = org.fonctionnalites ?? [];
  const next = Array.from(new Set([...current, ...ADD]));
  await p.organisme.update({ where: { id: org.id }, data: { fonctionnalites: next } });
  console.log("Fonctionnalités CAP:", next.join(", "));
  await p.$disconnect();
})();
