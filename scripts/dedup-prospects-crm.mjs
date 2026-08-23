// Dédoublonnage des prospects de prospection sortante : conserve la fiche la
// plus ANCIENNE par (source, organisme, siret, codePostal), supprime les autres.
// Sûr : ne touche qu'aux sources sortantes.
//   node scripts/dedup-prospects-crm.mjs          # DRY-RUN
//   node scripts/dedup-prospects-crm.mjs --commit # supprime

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");
const OUTBOUND = ["prospection-securite", "prospection-transport", "manuel"];

async function main() {
  const leads = await prisma.lead.findMany({
    where: { source: { in: OUTBOUND } },
    select: { id: true, source: true, organisme: true, siret: true, codePostal: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const seen = new Map();
  const toDelete = [];
  for (const l of leads) {
    const key = [l.source, l.organisme ?? "", l.siret ?? "", l.codePostal ?? ""].join("|");
    if (seen.has(key)) toDelete.push(l.id);
    else seen.set(key, l.id);
  }
  console.log(`${leads.length} prospects sortants · ${toDelete.length} doublon(s) à supprimer · mode ${COMMIT ? "COMMIT" : "DRY-RUN"}`);
  if (COMMIT && toDelete.length) {
    const r = await prisma.lead.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`✅ ${r.count} doublon(s) supprimé(s).`);
    console.log("Total leads en base :", await prisma.lead.count());
  } else if (!COMMIT) {
    console.log("ℹ️  DRY-RUN : rien supprimé.");
  }
}
main().catch((e) => { console.error("❌", e); process.exit(1); }).finally(() => prisma.$disconnect());
