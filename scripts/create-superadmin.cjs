const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedPassword } = require("./_seed-secret.cjs");
const p = new PrismaClient();
(async () => {
  const email = process.env.SUPERADMIN_EMAIL || "infocap.comp+dev@gmail.com";
  // Correctif audit P1-1 : mot de passe fourni par l'environnement (jamais en dur).
  const password = seedPassword("SUPERADMIN_PASSWORD", { required: true, label: "SUPERADMIN" });
  const existing = await p.user.findUnique({ where: { email } });
  if (existing) {
    await p.user.update({ where: { email }, data: { role: "SUPERADMIN", isActive: true, organismeId: null } });
    console.log("SUPERADMIN mis à jour:", email);
  } else {
    await p.user.create({
      data: {
        name: "Éditeur (console)",
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: "SUPERADMIN",
        isActive: true,
        organismeId: null,
      },
    });
    console.log("SUPERADMIN créé:", email, "(mot de passe = valeur de SUPERADMIN_PASSWORD)");
  }
  await p.$disconnect();
})();
