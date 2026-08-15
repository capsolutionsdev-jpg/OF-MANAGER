// Provisionne le COMPTE CONSOLE de gestion du SITE VITRINE (capacademy.fr) :
//   - un utilisateur ADMIN rattaché à l'organisme « CAP Compétences »
//   - les formations du catalogue vitrine visibles (référence = slug),
//     marquées PUBLIEE, pour que la console pilote réellement l'affichage.
//
// PRÉREQUIS : le champ Formation.vitrineStatut doit exister en base
//   → lancer d'abord `prisma db push`.
// Idempotent : relançable sans doublon.
//
// Usage : node scripts/seed-cap-vitrine-admin.cjs
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { seedPassword } = require("./_seed-secret.cjs");
const p = new PrismaClient();

// Identifiants du compte console vitrine (à changer après 1re connexion).
const ADMIN_EMAIL = process.env.VITRINE_ADMIN_EMAIL || "vitrine@capacademy.fr";
// Correctif audit P1-1 : mot de passe fourni par l'environnement (jamais en dur).
const ADMIN_PASSWORD = seedPassword("VITRINE_ADMIN_PASSWORD", { required: true, label: "ADMIN vitrine" });

// Catalogue vitrine PUBLIÉ (référence = slug de la fiche vitrine).
// SAFETY = domaine « Prévention & Sécurité », TRANSPORT = « Transport ».
const FORMATIONS = [
  // --- Sécurité : secourisme / risques ---
  ["sst-sauveteur-secouriste-travail", "SST", "SAFETY"],
  ["mac-sst-recyclage", "MAC SST", "SAFETY"],
  ["habilitation-electrique-h0b0", "Habilitation H0B0", "SAFETY"],
  ["habilitation-electrique-bs-be-manoeuvre", "Habilitation BS / BE Manœuvre", "SAFETY"],
  ["aipr", "AIPR", "SAFETY"],
  ["securite-incendie", "Sécurité incendie", "SAFETY"],
  ["defibrillateur-gestes-qui-sauvent", "Défibrillateur (DAE)", "SAFETY"],
  // --- Sécurité privée (CNAPS) ---
  ["tfp-aps-agent-prevention-securite", "TFP APS", "SAFETY"],
  ["mac-aps-recyclage", "MAC APS", "SAFETY"],
  ["dirigeant-societe-securite-privee-initiale", "Dirigeant sécurité privée", "SAFETY"],
  ["dirigeant-societe-securite-privee-vae", "Dirigeant sécurité privée (VAE)", "SAFETY"],
  ["a3p-agent-protection-physique-personnes-initiale", "A3P — Protection des personnes", "SAFETY"],
  ["a3p-agent-protection-physique-personnes-vae", "A3P — Protection des personnes (VAE)", "SAFETY"],
  ["operateur-videoprotection-initiale", "Opérateur vidéoprotection", "SAFETY"],
  ["operateur-videoprotection-vae", "Opérateur vidéoprotection (VAE)", "SAFETY"],
  // --- Sécurité incendie (SSIAP) ---
  ["ssiap-1-initial", "SSIAP 1 initial", "SAFETY"],
  ["ssiap-1-recyclage", "SSIAP 1 recyclage", "SAFETY"],
  ["ssiap-1-remise-a-niveau", "SSIAP 1 remise à niveau", "SAFETY"],
  ["ssiap-2-initial", "SSIAP 2 initial", "SAFETY"],
  ["ssiap-2-recyclage", "SSIAP 2 recyclage", "SAFETY"],
  ["ssiap-2-remise-a-niveau", "SSIAP 2 remise à niveau", "SAFETY"],
  ["ssiap-3-initial", "SSIAP 3 initial", "SAFETY"],
  ["ssiap-3-recyclage", "SSIAP 3 recyclage", "SAFETY"],
  ["ssiap-3-remise-a-niveau", "SSIAP 3 remise à niveau", "SAFETY"],
  // --- Transport de personnes ---
  ["vtc-chauffeur-prive", "VTC", "TRANSPORT"],
  ["taxi-conducteur", "Taxi", "TRANSPORT"],
  ["passerelle-taxi-vtc", "Passerelle Taxi vers VTC", "TRANSPORT"],
  ["passerelle-vtc-taxi", "Passerelle VTC vers Taxi", "TRANSPORT"],
  ["tpmr-transport-personnes-mobilite-reduite", "TPMR", "TRANSPORT"],
  ["capacite-transport-marchandises", "Transport de marchandises", "TRANSPORT"],
];

(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Organisme « CAP Compétences » introuvable dans le manager.");
  console.log("Organisme :", org.nom, org.id);

  // 1) Compte ADMIN du vitrine
  const existing = await p.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    await p.user.update({
      where: { email: ADMIN_EMAIL },
      data: { role: "ADMIN", isActive: true, organismeId: org.id },
    });
    console.log("Admin vitrine mis à jour :", ADMIN_EMAIL);
  } else {
    await p.user.create({
      data: {
        name: "Admin site vitrine",
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: "ADMIN",
        isActive: true,
        organismeId: org.id,
      },
    });
    console.log("Admin vitrine créé :", ADMIN_EMAIL, "/ mdp :", ADMIN_PASSWORD);
  }

  // 2) Formations du catalogue vitrine (référence = slug) → PUBLIEE
  let created = 0;
  let updated = 0;
  for (const [reference, titre, academy] of FORMATIONS) {
    const found = await p.formation.findFirst({
      where: { organismeId: org.id, reference },
    });
    if (found) {
      await p.formation.update({
        where: { id: found.id },
        data: { vitrineStatut: "PUBLIEE", titre, academy },
      });
      updated++;
    } else {
      await p.formation.create({
        data: { organismeId: org.id, reference, titre, academy, vitrineStatut: "PUBLIEE" },
      });
      created++;
    }
  }
  console.log(`Formations vitrine : ${created} créées, ${updated} mises à jour (PUBLIEE).`);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
