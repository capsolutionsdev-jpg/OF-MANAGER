// Seed du TENANT QA (base dev partagée). Crée un organisme isolé « [QA] … »
// + un ADMIN, un FORMATEUR (profil Formateur) et un APPRENANT (Candidat+Apprenant).
// 100 % idempotent (upsert / findFirst), AUCUNE suppression. Toutes les données
// sont préfixées « [QA] » pour être repérables et ne jamais polluer le métier réel.
//
//   node scripts/seed-qa.cjs
//
const fs = require("fs");
const path = require("path");
for (const f of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();

const PWD = "Qa1234!!";
const SOUS_DOMAINE = "qa-test";

async function upsertUser({ email, name, role, organismeId, mustChange = false }) {
  const passwordHash = await bcrypt.hash(PWD, 10);
  return p.user.upsert({
    where: { email },
    update: { organismeId, role, isActive: true, name },
    create: { email, name, passwordHash, role, isActive: true, organismeId, mustChangePassword: mustChange },
  });
}

(async () => {
  // 1) Organisme QA isolé
  const org = await p.organisme.upsert({
    where: { sousDomaine: SOUS_DOMAINE },
    update: {},
    create: {
      nom: "[QA] Organisme Test",
      sousDomaine: SOUS_DOMAINE,
      statut: "ACTIF",
      design: "defaut",
      couleurPrimaire: "#7C3AED",
      representant: "[QA] Testeur",
      email: "qa-admin@test.local",
      // Toutes les fonctionnalités actives pour pouvoir tout tester
      fonctionnalites: [
        "crm", "candidats", "clients-pro", "formations", "sessions",
        "suivi-pedagogique", "formateurs", "planning", "salles", "documents",
        "signatures", "automatisations", "elearning", "comptabilite", "facturation",
        "qualiopi", "bpf", "rgpd", "kanban", "taches", "notifications",
        "devis-signature", "leads-multicanal", "sms", "portail-client", "rapports",
        "scoring", "ia", "site-vitrine", "blog", "diplomes", "jurys", "support",
      ],
    },
  });
  console.log("Organisme QA:", org.nom, org.id);

  // 2) ADMIN
  const admin = await upsertUser({
    email: "qa-admin@test.local", name: "[QA] Admin", role: "ADMIN", organismeId: org.id,
  });
  console.log("  ADMIN     :", admin.email, "/", PWD);

  // 3) FORMATEUR (User + profil Formateur)
  const formUser = await upsertUser({
    email: "qa-formateur@test.local", name: "[QA] Formateur", role: "FORMATEUR", organismeId: org.id,
  });
  const formExisting = await p.formateur.findFirst({ where: { userId: formUser.id } });
  if (!formExisting) {
    await p.formateur.create({
      data: {
        organismeId: org.id, userId: formUser.id,
        nom: "Testeur", prenom: "[QA] Formateur", email: formUser.email,
        specialites: "SST, SSIAP", experienceAnnees: 5,
      },
    });
  }
  console.log("  FORMATEUR :", formUser.email, "/", PWD);

  // 4) APPRENANT (Candidat + Apprenant + User)
  const apprUser = await upsertUser({
    email: "qa-apprenant@test.local", name: "[QA] Apprenant", role: "APPRENANT", organismeId: org.id, mustChange: false,
  });
  let cand = await p.candidat.findFirst({ where: { organismeId: org.id, email: "qa-apprenant@test.local" } });
  if (!cand) {
    cand = await p.candidat.create({
      data: { organismeId: org.id, nom: "Testeur", prenom: "[QA] Apprenant", email: "qa-apprenant@test.local" },
    });
  }
  const apprExisting = await p.apprenant.findFirst({ where: { candidatId: cand.id } });
  if (!apprExisting) {
    await p.apprenant.create({
      data: { organismeId: org.id, candidatId: cand.id, userId: apprUser.id },
    });
  }
  console.log("  APPRENANT :", apprUser.email, "/", PWD);

  console.log("\n✅ Tenant QA prêt. organismeId =", org.id);
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
