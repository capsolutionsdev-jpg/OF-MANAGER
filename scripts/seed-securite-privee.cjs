// Compte de DÉMO pour un OF spécialisé en sécurité privée + ses 4 formations.
// Idempotent : repérage par sousDomaine "securite-privee" et références DEMO-SP-*.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

const ID = ["CNI / Passeport / Carte de séjour"];
const APS_COMMUN = [
  "2 photos d'identité (fond gris)",
  "Justificatif de domicile",
  "Casier judiciaire (du pays d'origine pour les étrangers)",
  "Attestation de niveau de langue B1 minimum ou diplôme équivalent (étrangers)",
];

const FORMATIONS = [
  { reference: "DEMO-SP-SST", titre: "SST — Sauveteur Secouriste du Travail (initial)", dureeHeures: 14,
    prerequis: "Aucun prérequis.", certification: "SST INRS",
    piecesAttendues: [...ID] },
  { reference: "DEMO-SP-MACSST", titre: "MAC SST — Maintien et Actualisation des Compétences SST", dureeHeures: 7,
    prerequis: "Être titulaire du certificat SST.", certification: "SST INRS",
    piecesAttendues: [...ID] },
  { reference: "DEMO-SP-TFPAPS", titre: "TFP APS — Agent de Prévention et de Sécurité", dureeHeures: 175,
    prerequis: "Autorisation préalable du CNAPS obligatoire.", certification: "RNCP — TFP APS",
    examen: true, // seule formation soumise à examen → convocation d'examen
    piecesAttendues: [...ID, "Autorisation préalable CNAPS", ...APS_COMMUN] },
  { reference: "DEMO-SP-MACAPS", titre: "MAC APS — Maintien et Actualisation des Compétences APS", dureeHeures: 31,
    prerequis: "Carte professionnelle valide OU autorisation préalable du CNAPS.", certification: "RNCP — MAC APS",
    piecesAttendues: [...ID, "Carte professionnelle valide OU autorisation préalable CNAPS", ...APS_COMMUN] },
];

(async () => {
  let org = await p.organisme.findUnique({ where: { sousDomaine: "securite-privee" } });
  if (!org) {
    org = await p.organisme.create({
      data: {
        nom: "Sécurité Privée Démo",
        raisonSociale: "OF Sécurité Privée (démo)",
        sousDomaine: "securite-privee",
        statut: "ACTIF",
        formule: "COMPLET",
        fonctionnalites: [], // [] = toutes les fonctionnalités visibles (démo complète)
        couleurPrimaire: "#0D1B3E",
        design: "enterprise",
      },
    });
    console.log("Organisme créé:", org.nom, org.id);
  } else {
    console.log("Organisme déjà présent:", org.nom, org.id);
  }

  const email = "demo-secu@cap.fr";
  const existingUser = await p.user.findUnique({ where: { email } });
  if (!existingUser) {
    await p.user.create({
      data: {
        name: "Gérant Sécurité Privée",
        email,
        passwordHash: await bcrypt.hash("CapSecu2026!", 10),
        role: "ADMIN",
        isActive: true,
        organismeId: org.id,
      },
    });
    console.log("Gérant créé:", email, "/ CapSecu2026!");
  } else {
    console.log("Gérant déjà présent:", email);
  }

  for (const f of FORMATIONS) {
    const exists = await p.formation.findUnique({ where: { reference: f.reference } });
    if (exists) {
      await p.formation.update({ where: { reference: f.reference }, data: { examen: f.examen ?? false, piecesAttendues: f.piecesAttendues } });
      console.log("Formation mise à jour (examen/pièces):", f.reference);
      continue;
    }
    await p.formation.create({
      data: {
        organismeId: org.id,
        titre: f.titre,
        reference: f.reference,
        dureeHeures: f.dureeHeures,
        duree: `${f.dureeHeures} h`,
        prerequis: f.prerequis,
        certification: f.certification,
        examen: f.examen ?? false,
        publicVise: "Agents et futurs agents de sécurité privée.",
        piecesAttendues: f.piecesAttendues,
      },
    });
    console.log("Formation créée:", f.reference, `(${f.piecesAttendues.length} pièces)`);
  }

  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
