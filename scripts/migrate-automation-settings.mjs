// Migration de données : AutomationSettings singleton PLATEFORME → 1 ligne PAR ORGANISME.
//
// À lancer UNE FOIS, APRÈS `prisma db push` du nouveau schéma (organismeId @unique).
// Idempotent (re-lançable sans dommage).
//
//   1) lit les valeurs du singleton (organismeId NULL / id="singleton") ;
//   2) crée pour chaque organisme sa propre ligne de réglages avec CES valeurs
//      (préserve le comportement actuel — pas de reset aux défauts) ;
//   3) supprime la ligne singleton résiduelle.
//
// Usage : node scripts/migrate-automation-settings.mjs   (via DATABASE_URL courant)
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
const p = new PrismaClient();

const FIELDS = [
  "convocationActive",
  "convocationJMoins",
  "attestationEntreeActive",
  "satisfactionActive",
  "docsFinActive",
  "compteRenduActive",
  "emargementActive",
];

async function main() {
  // 1) valeurs du singleton (organismeId NULL), sinon défauts du schéma.
  const singleton =
    (await p.automationSettings.findFirst({ where: { organismeId: null } })) ??
    (await p.automationSettings.findUnique({ where: { id: "singleton" } }).catch(() => null));

  const vals = {};
  for (const f of FIELDS) vals[f] = singleton ? singleton[f] : undefined;
  // (undefined → Prisma applique le @default du schéma à la création)

  // 2) une ligne par organisme, avec les valeurs héritées.
  const orgs = await p.organisme.findMany({ select: { id: true } });
  let created = 0;
  for (const o of orgs) {
    const existing = await p.automationSettings.findUnique({ where: { organismeId: o.id } });
    if (existing) continue; // déjà migré → ne pas écraser
    await p.automationSettings.create({ data: { organismeId: o.id, ...vals } });
    created++;
  }
  console.log(`Réglages d'automatismes créés pour ${created}/${orgs.length} organisme(s).`);

  // 3) suppression du singleton résiduel (organismeId NULL).
  const del = await p.automationSettings.deleteMany({ where: { organismeId: null } });
  console.log(`Singleton résiduel supprimé : ${del.count} ligne(s).`);

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
