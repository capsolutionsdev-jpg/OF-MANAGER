// Active les fonctionnalités « site-vitrine » et « blog » sur l'organisme du
// compte console vitrine (CAP Compétences). Idempotent.
// Usage : node scripts/enable-vitrine-cap.cjs
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const NEW = ["site-vitrine", "blog"];
const ADMIN_EMAIL = "vitrine@capacademy.fr";

(async () => {
  const u = await p.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { email: true, role: true, isActive: true, organismeId: true },
  });
  if (!u) throw new Error(`Compte ${ADMIN_EMAIL} introuvable.`);
  console.log("Compte :", u.email, "| rôle:", u.role, "| actif:", u.isActive, "| org:", u.organismeId);

  const org = await p.organisme.findUnique({
    where: { id: u.organismeId },
    select: { id: true, nom: true, fonctionnalites: true },
  });
  console.log("Org :", org.id, org.nom);
  console.log("AVANT (" + org.fonctionnalites.length + ") :", org.fonctionnalites.join(", "));

  const merged = Array.from(new Set([...org.fonctionnalites, ...NEW]));
  await p.organisme.update({
    where: { id: org.id },
    data: { fonctionnalites: merged },
  });
  console.log("APRÈS (" + merged.length + ") :", merged.join(", "));
  console.log("site-vitrine + blog activés :", NEW.every((k) => merged.includes(k)));

  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
