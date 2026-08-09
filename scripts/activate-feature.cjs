// Active une fonctionnalité opt-in (Organisme.fonctionnalites) sur un organisme.
// Idempotent : relançable sans doublon.
//
// Usage : node scripts/activate-feature.cjs <feature> [organismeId]
//   - sans organismeId : utilise VITRINE_ORGANISME_ID (.env), sinon liste les
//     organismes et s'arrête (aucune écriture).
// Exemple : node scripts/activate-feature.cjs parcours-t3p
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  const feature = process.argv[2];
  if (!feature) {
    console.error("Usage : node scripts/activate-feature.cjs <feature> [organismeId]");
    process.exit(1);
  }
  let orgId = process.argv[3] || process.env.VITRINE_ORGANISME_ID || null;

  if (!orgId) {
    const orgs = await p.organisme.findMany({ select: { id: true, nom: true, fonctionnalites: true } });
    console.log("Aucun organismeId fourni (arg ou VITRINE_ORGANISME_ID). Organismes :");
    for (const o of orgs) {
      console.log(`  ${o.id}  ${o.nom}  [${(o.fonctionnalites || []).length} fonctionnalités]`);
    }
    console.log(`Relancer : node scripts/activate-feature.cjs ${feature} <organismeId>`);
    return;
  }

  const org = await p.organisme.findUnique({
    where: { id: orgId },
    select: { id: true, nom: true, fonctionnalites: true },
  });
  if (!org) {
    console.error(`Organisme introuvable : ${orgId}`);
    process.exit(1);
  }
  const fns = org.fonctionnalites || [];
  if (fns.includes(feature)) {
    console.log(`« ${feature} » déjà active sur ${org.nom} (${org.id}) — rien à faire.`);
    return;
  }
  await p.organisme.update({
    where: { id: org.id },
    data: { fonctionnalites: { set: [...fns, feature] } },
  });
  console.log(`« ${feature} » activée sur ${org.nom} (${org.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
