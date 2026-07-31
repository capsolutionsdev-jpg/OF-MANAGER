/**
 * Applique le catalogue de référence sécurité à un organisme, en ligne de
 * commande (même logique que lib/actions/catalogue-actions.ts).
 *
 *   npx tsx scripts/import-catalogue-securite.mts "CAP Compétences"          # simulation
 *   npx tsx scripts/import-catalogue-securite.mts "CAP Compétences" --write  # écriture
 *
 * Sûreté : ne remplace jamais une donnée saisie — complète les champs vides,
 * crée les formations absentes.
 */
import { PrismaClient } from "@prisma/client";
import { CATALOGUE_SECURITE, normaliserTitre } from "../src/lib/catalogue-securite";

const p = new PrismaClient();
const nomOrg = process.argv[2];
const write = process.argv.includes("--write");

const CHAMPS = [
  "dureeHeures", "duree", "objectifs", "prerequis", "programme",
  "publicVise", "methodesPedagogiques", "modalitesEvaluation", "certification",
] as const;

const vide = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");

(async () => {
  if (!nomOrg) {
    console.error('Usage : npx tsx scripts/import-catalogue-securite.mts "<nom organisme>" [--write]');
    process.exit(1);
  }
  const org = await p.organisme.findFirst({ where: { nom: nomOrg } });
  if (!org) {
    console.error(`Organisme introuvable : ${nomOrg}`);
    process.exit(1);
  }
  console.log(`Organisme : ${org.nom} — mode ${write ? "ÉCRITURE" : "SIMULATION"}\n`);

  const existantes = await p.formation.findMany({
    where: { organismeId: org.id, isArchived: false },
  });
  const parTitre = new Map(existantes.map((f) => [normaliserTitre(f.titre), f]));

  let creees = 0, completees = 0, inchangees = 0;

  for (const m of CATALOGUE_SECURITE) {
    const cibles = [m.titre, ...m.alias].map(normaliserTitre);
    const f = cibles.map((t) => parTitre.get(t)).find(Boolean);

    const modele: Record<string, unknown> = {
      dureeHeures: m.dureeHeures, duree: m.duree, objectifs: m.objectifs,
      prerequis: m.prerequis, programme: m.programme, publicVise: m.publicVise,
      methodesPedagogiques: m.methodesPedagogiques,
      modalitesEvaluation: m.modalitesEvaluation, certification: m.certification,
    };

    if (!f) {
      let reference = m.reference;
      for (let n = 2; await p.formation.findFirst({ where: { reference } }); n++) {
        reference = `${m.reference}-${n}`;
      }
      if (write) {
        await p.formation.create({
          data: {
            organismeId: org.id, titre: m.titre, reference,
            ...(modele as object), modalite: "PRESENTIEL",
            examen: m.examen, soumisJury: m.soumisJury,
            grilleInrs: m.grilleInrs ?? null, piecesAttendues: m.piecesAttendues,
            delaiAcces: "Inscription jusqu'à 48 h avant le démarrage de la session.",
          } as never,
        });
      }
      creees++;
      console.log(`CRÉÉE      | ${m.titre} (réf. ${reference})`);
      continue;
    }

    const maj: Record<string, unknown> = {};
    const champs: string[] = [];
    for (const c of CHAMPS) {
      if (vide((f as Record<string, unknown>)[c])) { maj[c] = modele[c]; champs.push(c); }
    }
    if (m.examen && !f.examen) { maj.examen = true; champs.push("examen"); }
    if (m.soumisJury && !f.soumisJury) { maj.soumisJury = true; champs.push("soumisJury"); }
    if (m.grilleInrs && !f.grilleInrs) { maj.grilleInrs = m.grilleInrs; champs.push("grilleInrs"); }
    if (f.piecesAttendues.length === 0 && m.piecesAttendues.length > 0) {
      maj.piecesAttendues = m.piecesAttendues; champs.push("piecesAttendues");
    }

    if (champs.length === 0) { inchangees++; console.log(`INCHANGÉE  | ${f.titre}`); continue; }
    if (write) await p.formation.update({ where: { id: f.id }, data: maj as never });
    completees++;
    console.log(`COMPLÉTÉE  | ${f.titre} → ${champs.join(", ")}`);
  }

  console.log(`\nBilan : ${creees} créée(s), ${completees} complétée(s), ${inchangees} inchangée(s).`);
  if (!write) console.log("(simulation — relancer avec --write pour appliquer)");
})()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
