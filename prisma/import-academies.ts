/**
 * Import des formations réelles des 4 académies (site vitrine CAP Compétences)
 * vers la base du CRM. Idempotent (upsert par référence).
 *
 * Lance : npx tsx prisma/import-academies.ts
 */
import { PrismaClient, Modalite, Academy } from "@prisma/client";
import { pathToFileURL } from "node:url";

const prisma = new PrismaClient();

const ACADEMY_BY_PREFIX: Record<string, Academy> = {
  DIG: Academy.DIGITAL,
  SAF: Academy.SAFETY,
  TRA: Academy.TRANSPORT,
  LAN: Academy.LANGUE,
};

// Dossier des données du site vitrine.
const BASE =
  "C:/Users/GPSP/Downloads/cap-digital-academy/cap-digital-academy/data";

type AnyFormation = {
  slug: string;
  title: string;
  shortTitle?: string;
  rs?: string;
  certification?: string;
  duree?: string;
  objectifs?: string[];
  competences?: string[];
  programme?: string[];
  public?: string;
  prerequis?: string;
  modalites?: string;
  evaluation?: string;
  tarif?: string;
  modalitesPedagogiques?: string;
};

const join = (a?: string[]) => (a && a.length ? a.join("\n") : null);

function hours(duree?: string): number | null {
  if (!duree) return null;
  const m = duree.match(/(\d+)\s*h/i);
  return m ? parseInt(m[1], 10) : null;
}

function tarifNum(tarif?: string): number | null {
  if (!tarif) return null;
  const m = tarif.replace(/ /g, " ").match(/(\d[\d\s.]*)\s*€/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/[\s.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

async function importAcademy(
  file: string,
  exportName: string,
  prefix: string,
  modalite: Modalite,
): Promise<number> {
  const mod = await import(pathToFileURL(`${BASE}/${file}`).href);
  const list = (mod[exportName] ?? []) as AnyFormation[];
  let count = 0;

  for (const f of list) {
    const reference = `${prefix}-${f.slug}`.toUpperCase();
    const competences =
      f.competences && f.competences.length
        ? `Compétences visées :\n${f.competences.join("\n")}`
        : null;
    const objectifsFull =
      [join(f.objectifs), competences].filter(Boolean).join("\n\n") || null;

    const data = {
      titre: f.title,
      certification: f.rs ?? f.certification ?? null,
      duree: f.duree ?? null,
      dureeHeures: hours(f.duree),
      tarif: tarifNum(f.tarif),
      modalite,
      academy: ACADEMY_BY_PREFIX[prefix] ?? null,
      objectifs: objectifsFull,
      programme: join(f.programme),
      prerequis: f.prerequis ?? null,
      publicVise: f.public ?? null,
      methodesPedagogiques: f.modalitesPedagogiques ?? f.modalites ?? null,
      modalitesEvaluation: f.evaluation ?? null,
    };

    await prisma.formation.upsert({
      where: { reference },
      update: data,
      create: { reference, ...data },
    });
    count++;
  }

  console.log(`  • ${prefix} : ${count} formations`);
  return count;
}

async function main() {
  console.log("📥 Import des formations des académies…");
  let total = 0;
  total += await importAcademy("formations.ts", "formations", "DIG", Modalite.MIXTE);
  total += await importAcademy(
    "safety-formations.ts",
    "safetyFormations",
    "SAF",
    Modalite.PRESENTIEL,
  );
  total += await importAcademy(
    "transport-formations.ts",
    "transportFormations",
    "TRA",
    Modalite.MIXTE,
  );
  total += await importAcademy(
    "language-formations.ts",
    "languageFormations",
    "LAN",
    Modalite.MIXTE,
  );

  // Nettoyage : retirer les formations de démo (remplacées par les vraies).
  const demoRefs = ["WEB-001", "SEO-001", "CM-001"];
  const demos = await prisma.formation.findMany({
    where: { reference: { in: demoRefs } },
    select: { id: true },
  });
  if (demos.length) {
    const ids = demos.map((d) => d.id);
    await prisma.session.deleteMany({ where: { formationId: { in: ids } } });
    await prisma.formation.deleteMany({ where: { id: { in: ids } } });
    console.log(`  🧹 ${ids.length} formations de démo supprimées (+ leurs sessions).`);
  }

  console.log(`✅ ${total} formations importées depuis les académies.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
