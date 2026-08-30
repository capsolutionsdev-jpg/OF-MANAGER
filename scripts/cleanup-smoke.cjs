const { PrismaClient } = require("@prisma/client");
require("./_guard.cjs").assertSafeDb({ label: "cleanup-smoke" });
const p = new PrismaClient();
(async () => {
  const t = await p.tache.deleteMany({
    where: { titre: { startsWith: "Relancer devis client démo" } },
  });
  const d = await p.devis.updateMany({
    where: { signataire: "Jean Client — Gérant" },
    data: {
      acceptedAt: null,
      signataire: null,
      signatureUrl: null,
      signatureIp: null,
      acceptToken: null,
      statut: "BROUILLON",
    },
  });
  console.log(`Tâches démo supprimées: ${t.count} · devis réinitialisés: ${d.count}`);
  await p.$disconnect();
})();
