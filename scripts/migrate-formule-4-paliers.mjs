// Migration idempotente : enum FormuleAbonnement 3 → 4 paliers (plan de lancement).
//
//   BASIQUE  → INDEPENDANT     MEDIUM → PRO     COMPLET → CROISSANCE     (+ RESEAU)
//
// Utilise ALTER TYPE ... RENAME VALUE : les lignes existantes (Organisme,
// PlanTarif, ContratPrestation, FactureEditeur) suivent le renommage SANS perte
// et SANS UPDATE. Le tenant démo est basculé sur RESEAU pour tout montrer.
//
// ⚠️ À lancer UNE FOIS contre la base, EN COORDINATION avec le déploiement du
// code (le client Prisma déployé doit connaître les nouvelles valeurs). Sur le
// fork, la base = Neon PROD → geste manuel volontaire.
//
//   node scripts/migrate-formule-4-paliers.mjs
//
// Idempotent : relançable sans effet de bord (ne renomme que ce qui existe encore).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RENAMES = [
  ["BASIQUE", "INDEPENDANT"],
  ["MEDIUM", "PRO"],
  ["COMPLET", "CROISSANCE"],
];

async function currentLabels() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT e.enumlabel AS label
       FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'FormuleAbonnement'`,
  );
  return new Set(rows.map((r) => r.label));
}

async function main() {
  let labels = await currentLabels();
  console.log("Labels actuels :", [...labels].join(", ") || "(aucun)");

  // 1) Renommages en place (préservent les données).
  for (const [oldN, newN] of RENAMES) {
    if (labels.has(oldN) && !labels.has(newN)) {
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "FormuleAbonnement" RENAME VALUE '${oldN}' TO '${newN}'`,
      );
      console.log(`  ✓ renommé ${oldN} → ${newN}`);
      labels.delete(oldN);
      labels.add(newN);
    } else {
      console.log(`  · ${oldN} → ${newN} : rien à faire`);
    }
  }

  // 2) Ajout du 4e palier (commit autonome, hors transaction).
  if (!labels.has("RESEAU")) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "FormuleAbonnement" ADD VALUE IF NOT EXISTS 'RESEAU'`,
    );
    console.log("  ✓ ajouté RESEAU");
  } else {
    console.log("  · RESEAU : déjà présent");
  }

  // 3) Tenant(s) démo → RESEAU (montre tout). Séparé : utilise la valeur
  //    fraîchement ajoutée dans une commande distincte.
  const demo = await prisma.$executeRawUnsafe(
    `UPDATE "Organisme" SET "formule" = 'RESEAU' WHERE "isDemo" = true`,
  );
  console.log(`  ✓ tenant(s) démo → RESEAU : ${demo} ligne(s)`);

  console.log("\n✅ Migration FormuleAbonnement 4 paliers terminée.");
}

main()
  .catch((e) => {
    console.error("❌ Échec migration :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
