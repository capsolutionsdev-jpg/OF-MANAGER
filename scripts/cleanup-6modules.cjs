const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const lead = await p.candidat.deleteMany({ where: { nom: { startsWith: "SMOKE6 Lead" } } });
  const sms = await p.smsLog.deleteMany({ where: { body: { contains: "SMOKE6" } } });
  // Jetons portail créés pendant le smoke (le champ portalToken est neuf : tout était null avant).
  const portal = await p.entreprise.updateMany({ where: { portalToken: { not: null } }, data: { portalToken: null } });
  console.log(`Leads démo: ${lead.count} · SMS test: ${sms.count} · jetons portail réinitialisés: ${portal.count}`);
  await p.$disconnect();
})();
