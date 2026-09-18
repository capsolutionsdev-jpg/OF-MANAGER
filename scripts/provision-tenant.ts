/**
 * Provisionne un nouvel Organisme (tenant) + son administrateur sur la base CIBLE
 * (commerciale). Convergence CAP + ASPR — cf. docs/convergence/PROVISIONING.md.
 *
 * Usage :
 *   npx tsx scripts/provision-tenant.ts \
 *     --nom "ASPR Formation" --sous-domaine aspr \
 *     --admin-email admin@aspr.fr --admin-nom "Admin ASPR" --formule RESEAU [--dry-run]
 *
 * - DATABASE_URL doit pointer sur la base cible (JAMAIS la prod sans validation).
 * - --dry-run : valide + affiche le plan, N'ÉCRIT RIEN et ne se connecte pas.
 * - Pré-vol : refuse si l'e-mail admin (User.email unique GLOBAL) ou le
 *   sous-domaine est déjà pris.
 */
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  validateTenantInput,
  buildOrganismeCreateData,
  ALL_TENANT_FEATURES,
  type TenantProvisionInput,
} from "../src/lib/convergence/provision-tenant";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** Mot de passe temporaire fort (12 caractères URL-safe). */
function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"]);

  const raw: Partial<TenantProvisionInput> = {
    nom: args["nom"] as string,
    sousDomaine: (args["sous-domaine"] as string) ?? (args["nom"] as string),
    adminEmail: args["admin-email"] as string,
    adminNom: args["admin-nom"] as string,
    formule: args["formule"] as TenantProvisionInput["formule"],
  };

  const v = validateTenantInput(raw);
  if (!v.ok) {
    console.error("❌ Entrée invalide :\n - " + v.errors.join("\n - "));
    console.error(
      "\nExemple : npx tsx scripts/provision-tenant.ts --nom \"ASPR Formation\" --sous-domaine aspr --admin-email admin@aspr.fr --admin-nom \"Admin ASPR\" --formule RESEAU --dry-run",
    );
    process.exit(1);
  }
  const input = v.input;
  const fonctionnalites = ALL_TENANT_FEATURES;
  const orgData = buildOrganismeCreateData(input, fonctionnalites);

  console.log("Organisme à créer :");
  console.log(JSON.stringify({ ...orgData, fonctionnalites: `${fonctionnalites.length} fonctionnalités` }, null, 2));
  console.log(`Administrateur : ${input.adminNom} <${input.adminEmail}> (rôle ADMIN, changement de mot de passe imposé)`);
  console.log(`URL du tenant : https://${input.sousDomaine}.ofmanager.info`);

  if (dryRun) {
    console.log("\n🧪 --dry-run : aucune écriture, aucune connexion. Vérifiez le plan ci-dessus,");
    console.log("   puis relancez SANS --dry-run avec DATABASE_URL pointant sur la base cible.");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient();
  try {
    // ── Pré-vol : collisions bloquantes (unicité globale) ──
    const emailTaken = await prisma.user.findUnique({ where: { email: input.adminEmail }, select: { id: true } });
    if (emailTaken) {
      throw new Error(
        `e-mail administrateur déjà utilisé : ${input.adminEmail} (User.email est unique GLOBALEMENT). ` +
          "Choisissez un e-mail distinct pour ce tenant.",
      );
    }
    const subTaken = await prisma.organisme.findUnique({ where: { sousDomaine: input.sousDomaine }, select: { id: true } });
    if (subTaken) throw new Error(`sous-domaine déjà pris : ${input.sousDomaine}`);

    const password = genPassword();
    const org = await prisma.organisme.create({
      data: orgData as unknown as Prisma.OrganismeCreateInput,
      select: { id: true },
    });
    await prisma.user.create({
      data: {
        email: input.adminEmail,
        name: input.adminNom,
        role: "ADMIN",
        organismeId: org.id,
        isActive: true,
        mustChangePassword: true,
        passwordHash: bcrypt.hashSync(password, 12),
      },
    });

    console.log(`\n✅ Organisme créé : ${org.id}`);
    console.log(`   Administrateur : ${input.adminEmail}`);
    console.log(`   Mot de passe temporaire (à transmettre — changement imposé à la 1ʳᵉ connexion) : ${password}`);
    console.log(`   Sous-domaine : https://${input.sousDomaine}.ofmanager.info`);
    console.log("\nÉtape suivante : import des données du tenant (Lot 5).");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
