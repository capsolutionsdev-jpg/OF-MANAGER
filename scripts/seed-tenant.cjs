const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  // 1er tenant = CAP Compétences (valeurs reprises de lib/org-config.ts)
  const existing = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  const org = existing
    ? existing
    : await p.organisme.create({
        data: {
          nom: "CAP Compétences",
          representant: "Moussa HAMOUMI",
          representantQualite: "Gérant",
          siret: "991 407 198 00019",
          nda: "11 93 12064 93",
          adresse: "145 rue de Noisy-le-Sec, 93260 Les Lilas",
          codePostal: "93260",
          ville: "Les Lilas",
          email: "infocap.comp@gmail.com",
          telephone: "+33 6 26 42 63 25",
          certificateur: "Up&Co'm Certification — Webmarketing & co'm",
          qualiopiNumero: "Certifié Qualiopi (Actions de formation)",
          couleurPrimaire: "#1A5FD4",
          emailExpediteurNom: "CAP Compétences",
          emailExpediteur: "contact@cap-competences.fr",
          statut: "ACTIF",
          fonctionnalites: [
            "crm", "candidats", "clients-pro", "formations", "sessions",
            "elearning", "signatures", "automatisations", "formateurs",
            "comptabilite", "bpf", "qualiopi", "rgpd", "documents", "salles",
          ],
        },
      });
  console.log("Organisme:", org.nom, org.id, existing ? "(existant)" : "(créé)");

  // Rattacher tous les comptes sans tenant à CAP
  const users = await p.user.findMany({ where: { organismeId: null }, select: { id: true, email: true } });
  for (const u of users) {
    await p.user.update({ where: { id: u.id }, data: { organismeId: org.id } });
    console.log("  rattaché:", u.email);
  }
  console.log("Total users rattachés:", users.length);
  await p.$disconnect();
})();
