const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();
const EMAIL = "admin@aspr.fr";
const NEWPASS = "Aspr2026!"; // temporaire — à changer après connexion (/mon-compte)
(async () => {
  const u = await p.user.findUnique({ where: { email: EMAIL }, select: { id: true, organismeId: true, role: true } });
  if (!u) { console.log("Compte introuvable:", EMAIL); process.exit(1); }
  await p.user.update({ where: { email: EMAIL }, data: { passwordHash: await bcrypt.hash(NEWPASS, 10), isActive: true } });
  console.log(`Mot de passe réinitialisé pour ${EMAIL}`);
  console.log(`  rôle=${u.role} organismeId=${u.organismeId}`);
  console.log(`  nouveau mot de passe (temporaire): ${NEWPASS}`);
  await p.$disconnect();
})();
