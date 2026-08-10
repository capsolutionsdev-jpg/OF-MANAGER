// QA — crée un candidat de démonstration T3P (clairement étiqueté) avec un
// parcours VTC réaliste, pour la revue visuelle. Nettoyage : node scripts/qa-t3p-seed.cjs --clean
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG = "cmqc20ql20000uv5wlclphbg8"; // CAP Compétences
const EMAIL = "qa-t3p-demo@capacademy.fr";

async function clean() {
  const c = await p.candidat.findFirst({ where: { organismeId: ORG, email: EMAIL }, select: { id: true } });
  if (c) {
    await p.candidat.delete({ where: { id: c.id } }); // cascade → parcours + épreuves
    console.log("Candidat QA supprimé.");
  } else console.log("Rien à nettoyer.");
}

async function seed() {
  await clean();
  const cand = await p.candidat.create({
    data: {
      organismeId: ORG, nom: "[QA T3P] Martin", prenom: "Léa", email: EMAIL,
      telephone: "0600000000", statut: "INSCRIT",
      objectifsFormation: "Reconversion — devenir chauffeur VTC",
      financementType: "CPF",
    },
  });
  const permis = new Date(); permis.setFullYear(permis.getFullYear() - 5); // 5 ans → éligible
  const adm = new Date(); adm.setMonth(adm.getMonth() - 1); // admissibilité il y a 1 mois
  const parc = await p.parcoursT3P.create({
    data: {
      organismeId: ORG, candidatId: cand.id, metier: "VTC", fraisMontant: 241,
      permisBDate: permis, permisVerifieLe: new Date(), casierVerifieLe: new Date(),
      medicalDate: new Date(), medicalVerifieLe: new Date(), dossierCompletLe: new Date(),
      cmaDepartement: "CMA Île-de-France", cmaNumeroDossier: "IDF-2026-0421", cmaInscritLe: new Date(),
      fraisPayesLe: new Date(), formationTheoriqueFaiteLe: new Date(), admissibiliteLe: adm,
    },
  });
  await p.t3PEpreuve.create({
    data: { organismeId: ORG, parcoursId: parc.id, type: "THEORIE", tentative: 1,
      convocationRecueLe: new Date(), date: adm, resultat: "ADMIS", resultatLe: adm, note: "14/20" },
  });
  await p.t3PEpreuve.create({
    data: { organismeId: ORG, parcoursId: parc.id, type: "PRATIQUE", tentative: 1,
      convocationRecueLe: new Date(), resultat: "EN_ATTENTE" },
  });
  console.log("Candidat QA:", cand.id, "— parcours VTC:", parc.id);
}

(process.argv.includes("--clean") ? clean() : seed())
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
