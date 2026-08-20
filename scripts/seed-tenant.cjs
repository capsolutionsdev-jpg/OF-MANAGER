// Gabarit — ne pas exécuter tel quel sur le fork commercial.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  // Gabarit d'organisme neutre — renseigner les valeurs réelles avant exécution.
  const existing = await p.organisme.findFirst({ where: { nom: "Organisme de formation" } });
  const org = existing
    ? existing
    : await p.organisme.create({
        data: {
          nom: "Organisme de formation",
          representant: "",
          representantQualite: "Gérant",
          siret: "",
          nda: "",
          adresse: "",
          codePostal: "",
          ville: "",
          email: "contact@ofmanager.fr",
          telephone: "",
          certificateur: "",
          qualiopiNumero: "Certifié Qualiopi (Actions de formation)",
          couleurPrimaire: "#1A5FD4",
          emailExpediteurNom: "OFManager",
          emailExpediteur: "contact@ofmanager.fr",
          statut: "ACTIF",
          fonctionnalites: [
            "crm", "candidats", "clients-pro", "formations", "sessions",
            "elearning", "signatures", "automatisations", "formateurs",
            "comptabilite", "bpf", "qualiopi", "rgpd", "documents", "salles",
          ],
        },
      });
  console.log("Organisme:", org.nom, org.id, existing ? "(existant)" : "(créé)");

  // Rattacher tous les comptes sans tenant à cet organisme
  const users = await p.user.findMany({ where: { organismeId: null }, select: { id: true, email: true } });
  for (const u of users) {
    await p.user.update({ where: { id: u.id }, data: { organismeId: org.id } });
    console.log("  rattaché:", u.email);
  }
  console.log("Total users rattachés:", users.length);
  await p.$disconnect();
})();
