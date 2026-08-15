// Provisionne le CLIENT « AGUYSE FORMATION » dans la console :
//   1. l'organisme (identité, légal, couleurs de marque)
//   2. les fonctionnalités activées (dont le pilotage du site vitrine et les
//      modules de captation / relance de prospects)
//   3. un compte ADMIN rattaché à cet organisme
//   4. les 15 formations du catalogue vitrine (référence = slug) en PUBLIEE
//
// Idempotent : relançable sans créer de doublon.
//
// Usage :
//   node scripts/seed-aguyse.cjs
//   AGUYSE_ADMIN_EMAIL=... AGUYSE_ADMIN_PASSWORD=... node scripts/seed-aguyse.cjs
//
// ⚠️ À l'issue du script, NOTER L'ID DE L'ORGANISME affiché : il doit être
//    reporté dans le tenant du site vitrine (lib/tenants/aguyse.ts → organismeId)
//    et, si le vitrine est déployé seul, dans l'env VITRINE_ORGANISME_ID.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedPassword } = require("./_seed-secret.cjs");
const p = new PrismaClient();

const NOM = "AGUYSE FORMATION";

// Compte ADMIN du client (surchargeable par variables d'environnement).
// Le mot de passe est à changer à la première connexion.
const ADMIN_EMAIL = process.env.AGUYSE_ADMIN_EMAIL || "contact@aguyse.com";
// Correctif audit P1-1 : mot de passe depuis l'env (AGUYSE_ADMIN_PASSWORD) ou généré.
const ADMIN_PASSWORD = seedPassword("AGUYSE_ADMIN_PASSWORD", { label: "ADMIN AGUYSE" });
const ADMIN_NAME = process.env.AGUYSE_ADMIN_NAME || "Administrateur AGUYSE";

// Identité de l'organisme — informations publiques relevées sur aguyse.com.
// Les champs laissés vides (représentant, Qualiopi, référent handicap) sont à
// compléter dans la console avec les données fournies par le client
// (cf. docs/onboarding/collecte-client.md du site vitrine).
const IDENTITE = {
  nom: NOM,
  raisonSociale: NOM,
  siret: "942 168 196 00015",
  nda: "11 92 28907 92",
  adresse: "7 rue de Port Galand",
  codePostal: "92220",
  ville: "Bagneux",
  telephone: "06 33 80 57 73",
  email: "contact@aguyse.com",
  siteWeb: "https://aguyse.com",
  // Charte AGUYSE (or métallique + bleu pétrole), cf. logo du client.
  couleurPrimaire: "#9A6E22",
  couleurSecondaire: "#142530",
  // Abonnement vendu : formule Medium, client payant (contrat signé).
  statut: "ACTIF",
  formule: "MEDIUM",
};

// Fonctionnalités : socle « Cœur » + pilotage du site vitrine + modules de
// CAPTATION / RELANCE des prospects (l'équivalent CAPTIF natif de la console).
// NB : "sms" n'est PAS activé ici (option facturée au volume) — à cocher dans
// la console si le client la souscrit.
// Socle « Cœur » — miroir du groupe "Cœur" de src/lib/features.ts (source de
// vérité) + "support", inclus dans toutes les formules.
const CORE_FEATURE_KEYS = [
  "crm", "candidats", "clients-pro", "formations", "sessions",
  "suivi-pedagogique", "formateurs", "planning", "salles", "documents",
  "signatures", "automatisations", "elearning", "comptabilite", "facturation",
  "qualiopi", "bpf", "rgpd", "support",
];
const MODULES_VITRINE = ["site-vitrine", "blog"];
const MODULES_CAPTATION = ["leads-multicanal", "taches", "notifications", "scoring"];

// Catalogue vitrine AGUYSE (référence = slug de la fiche vitrine).
// Doit rester aligné avec lib/tenants/aguyse.ts → aguyseCatalogue.slugs.
const FORMATIONS = [
  ["tfp-aps-agent-prevention-securite", "TFP APS"],
  ["mac-aps-recyclage", "MAC APS"],
  ["sst-sauveteur-secouriste-travail", "SST"],
  ["mac-sst-recyclage", "MAC SST"],
  ["habilitation-electrique-h0b0", "Habilitation H0B0"],
  ["habilitation-electrique-bs-be-manoeuvre", "Habilitation BS / BE Manœuvre"],
  ["ssiap-1-initial", "SSIAP 1 initial"],
  ["ssiap-1-remise-a-niveau", "SSIAP 1 remise à niveau"],
  ["ssiap-1-recyclage", "SSIAP 1 recyclage"],
  ["ssiap-2-initial", "SSIAP 2 initial"],
  ["ssiap-2-remise-a-niveau", "SSIAP 2 remise à niveau"],
  ["ssiap-2-recyclage", "SSIAP 2 recyclage"],
  ["ssiap-3-initial", "SSIAP 3 initial"],
  ["ssiap-3-remise-a-niveau", "SSIAP 3 remise à niveau"],
  ["ssiap-3-recyclage", "SSIAP 3 recyclage"],
];

(async () => {
  // 1) Organisme -------------------------------------------------------------
  let org = await p.organisme.findFirst({ where: { nom: NOM } });
  if (org) {
    org = await p.organisme.update({ where: { id: org.id }, data: IDENTITE });
    console.log("Organisme mis à jour :", org.nom, org.id);
  } else {
    org = await p.organisme.create({ data: IDENTITE });
    console.log("Organisme créé :", org.nom, org.id);
  }

  // 2) Fonctionnalités -------------------------------------------------------
  const voulues = [...CORE_FEATURE_KEYS, ...MODULES_VITRINE, ...MODULES_CAPTATION];
  const merged = Array.from(new Set([...(org.fonctionnalites || []), ...voulues]));
  await p.organisme.update({ where: { id: org.id }, data: { fonctionnalites: merged } });
  console.log(`Fonctionnalités (${merged.length}) :`, merged.join(", "));

  // 3) Compte ADMIN du client -----------------------------------------------
  const existing = await p.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await p.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: "ADMIN", isActive: true, organismeId: org.id },
    });
    console.log("Compte ADMIN mis à jour :", ADMIN_EMAIL, "(mot de passe inchangé)");
  } else {
    await p.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: "ADMIN",
        isActive: true,
        organismeId: org.id,
      },
    });
    console.log("Compte ADMIN créé :", ADMIN_EMAIL, "(mot de passe = AGUYSE_ADMIN_PASSWORD ou valeur générée ci-dessus)");
    console.log("  → à communiquer au client et à changer à la 1re connexion.");
  }

  // 4) Catalogue vitrine -----------------------------------------------------
  let created = 0;
  let updated = 0;
  for (const [reference, titre] of FORMATIONS) {
    const found = await p.formation.findFirst({ where: { organismeId: org.id, reference } });
    if (found) {
      await p.formation.update({
        where: { id: found.id },
        data: { vitrineStatut: "PUBLIEE", titre, academy: "SAFETY" },
      });
      updated++;
    } else {
      await p.formation.create({
        data: {
          organismeId: org.id,
          reference,
          titre,
          academy: "SAFETY",
          vitrineStatut: "PUBLIEE",
        },
      });
      created++;
    }
  }
  console.log(`Formations vitrine : ${created} créées, ${updated} mises à jour (PUBLIEE).`);

  console.log("\n──────────────────────────────────────────────");
  console.log("ORGANISME_ID =", org.id);
  console.log("→ reporter dans lib/tenants/aguyse.ts (organismeId)");
  console.log("──────────────────────────────────────────────");
  console.log("À compléter ensuite dans la console : représentant légal (nom +");
  console.log("qualité), certificat Qualiopi et référent handicap.");

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
