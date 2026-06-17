const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "ASPR Manager" } });
  const where = { organismeId: org.id };
  const [cand, form, sess, insc, users] = await Promise.all([
    p.candidat.count({ where }),
    p.formation.count({ where }),
    p.session.count({ where }),
    p.inscription.count({ where }),
    p.user.count({ where }),
  ]);
  console.log(`ASPR tenant ${org.id}`);
  console.log(`  candidats=${cand} formations=${form} sessions=${sess} inscriptions=${insc} users=${users}`);
  const admin = await p.user.findUnique({ where: { email: "admin@aspr.fr" }, select: { organismeId: true, role: true } });
  console.log("  admin@aspr.fr ->", JSON.stringify(admin));
  // Sous-domaine d'accès + favoriser la marque ASPR
  if (!org.sousDomaine) {
    await p.organisme.update({ where: { id: org.id }, data: { sousDomaine: "aspr" } });
    console.log("  sousDomaine = aspr (configuré)");
  } else {
    console.log("  sousDomaine déjà:", org.sousDomaine);
  }
  await p.$disconnect();
})();
