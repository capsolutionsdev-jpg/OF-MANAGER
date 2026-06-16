const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// Fonctionnalités « Cœur » (cf. src/lib/features.ts CORE_FEATURE_KEYS).
const CORE = [
  "crm", "candidats", "clients-pro", "formations", "sessions",
  "suivi-pedagogique", "formateurs", "planning", "salles", "documents",
  "signatures", "automatisations", "elearning", "comptabilite",
  "facturation", "qualiopi", "bpf", "rgpd",
];

(async () => {
  const data = {
    nom: "ASPR Manager",
    raisonSociale: "ASPR Formation",
    statut: "ACTIF",
    appUrl: "https://aspr-formation-manager.vercel.app",
    siteWeb: "https://aspr-formation-manager.vercel.app",
    version: "Autonome (mono-locataire) — base dédiée",
    couleurPrimaire: "#1A5FD4",
    fonctionnalites: CORE,
  };
  const existing = await p.organisme.findFirst({ where: { nom: "ASPR Manager" } });
  let org;
  if (existing) {
    org = await p.organisme.update({ where: { id: existing.id }, data });
    console.log("ASPR Manager mis à jour:", org.id);
  } else {
    org = await p.organisme.create({ data });
    console.log("ASPR Manager créé:", org.id);
  }
  console.log("→ /console/" + org.id);
  await p.$disconnect();
})();
