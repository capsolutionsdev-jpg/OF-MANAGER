const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const fs = await p.formation.findMany({ select: { id: true, titre: true, grilleInrs: true } });
  let n = 0;
  for (const f of fs) {
    const t = f.titre.toUpperCase();
    let g = null;
    if (t.includes("SST")) g = (t.includes("MAC") || t.includes("MAINTIEN") || t.includes("ACTUALISATION")) ? "MAC_SST" : "SST";
    if (g && f.grilleInrs !== g) {
      await p.formation.update({ where: { id: f.id }, data: { grilleInrs: g } });
      console.log(`  ${f.titre} -> ${g}`); n++;
    }
  }
  console.log("Formations mises à jour:", n);
  await p.$disconnect();
})();
