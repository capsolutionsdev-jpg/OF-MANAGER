/**
 * RÉPARATION — configurations de formations orphelines / non provisionnées.
 *
 * Contexte : la refonte du système de configuration a renommé les `cle` des
 * modèles. Les organismes configurés AVANT la refonte ont des
 * `configurationsFormations` pointant sur d'anciens identifiants, et certains
 * n'ont jamais eu leurs formations provisionnées dans leur catalogue → la page
 * /formations du client filtre sur une config orpheline et n'affiche rien.
 *
 * Ce script, pour CHAQUE organisme ayant une config non vide :
 *   1. MIGRE les identifiants (alias anciens → clés actuelles) ;
 *   2. PROVISIONNE les formations retenues absentes du catalogue (création depuis
 *      les modèles réglementaires — programme, examen, jury, grille INRS, pièces) ;
 *   3. NORMALISE `configurationsFormations` sur les clés actuelles.
 *
 * Réutilise EXACTEMENT la logique de la console (lib/formations/provision) :
 * aucune duplication, aucun risque de divergence. Idempotent, création seule
 * (ne supprime ni ne modifie aucune formation existante).
 *
 *   npx tsx scripts/repair-formations-config.mts            # simulation (dry-run)
 *   npx tsx scripts/repair-formations-config.mts --write    # écriture réelle
 *   npx tsx scripts/repair-formations-config.mts --write "ASPR FORMATION"  # 1 org
 */
import { readFileSync } from "node:fs";
import path from "node:path";

// Charge .env AVANT d'instancier Prisma (DIRECT_URL = connexion directe Neon).
const env: Record<string, string> = {};
try {
  for (const l of readFileSync(path.join(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[m[1]] = v;
    }
  }
} catch {
  /* .env absent : on garde l'environnement courant */
}
process.env.DATABASE_URL = env.DIRECT_URL || env.DATABASE_URL || process.env.DATABASE_URL;

const { PrismaClient } = await import("@prisma/client");
const { provisionnerFormations } = await import("../src/lib/formations/provision");
const { migrerSlugs } = await import("../src/lib/formations-catalog");

const write = process.argv.includes("--write");
const nomFiltre = process.argv.slice(2).find((a) => !a.startsWith("--"));

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organisme.findMany({
    where: nomFiltre ? { nom: nomFiltre } : {},
    select: { id: true, nom: true, configurationsFormations: true },
    orderBy: { nom: "asc" },
  });

  console.log(`Mode : ${write ? "ÉCRITURE RÉELLE" : "SIMULATION (dry-run)"}`);
  console.log(`Organismes analysés : ${orgs.length}\n`);

  let totalCreees = 0;
  let orgsTouches = 0;

  for (const o of orgs) {
    const cfg = o.configurationsFormations ?? [];
    if (cfg.length === 0) continue; // config vide = aucune restriction, rien à réparer

    const migres = migrerSlugs(cfg);
    const nbForm = await prisma.formation.count({
      where: { organismeId: o.id, isArchived: false },
    });

    const orphelins = cfg.filter((c) => !migrerSlugs([c]).length);
    const configChange = JSON.stringify(cfg) !== JSON.stringify(migres);

    console.log(`• ${o.nom}`);
    console.log(`  config: ${cfg.length} → ${migres.length} (retenues après migration)`);
    if (orphelins.length) console.log(`  orphelins ignorés (${orphelins.length}): ${orphelins.join(", ")}`);
    console.log(`  formations en base: ${nbForm}`);

    if (!write) {
      // En simulation, on annonce ce qui SERAIT provisionné (comparaison par titre).
      console.log(`  → ${configChange ? "config à normaliser" : "config déjà normalisée"} ; provisionnement à exécuter avec --write\n`);
      continue;
    }

    const res = await provisionnerFormations(prisma, o.id, cfg);
    totalCreees += res.creees.length;
    if (res.creees.length || configChange) orgsTouches++;
    console.log(`  ✅ créées: ${res.creees.length}${res.creees.length ? " — " + res.creees.join(", ") : ""}`);
    console.log(`  ✅ config normalisée: [${res.retenues.join(", ")}]\n`);
  }

  if (write) {
    console.log(`=== TERMINÉ : ${totalCreees} formation(s) créée(s), ${orgsTouches} organisme(s) mis à jour ===`);
  } else {
    console.log("=== Simulation terminée. Relancer avec --write pour appliquer. ===");
  }
}

main()
  .catch((e) => {
    console.error("ERREUR :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
