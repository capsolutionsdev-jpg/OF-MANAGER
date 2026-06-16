const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();
(async () => {
  const email = "infocap.comp+dev@gmail.com";
  const password = "CapDev2026!";
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
    console.log("SUPERADMIN créé:", email, "/ mdp provisoire:", password);
  }
  await p.$disconnect();
})();
