const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const MODELS = ["candidat","candidatInteraction","pieceJointe","formation","session","formateur","apprenant","inscription","documentTemplate","documentGenere","automationSettings","evaluation","evaluationResultat","convention","contrat","qualiopiIndicateur","qualiopiPreuve","audit","entreprise","crmInteraction","devis","facture","paiement","workflowRule","emailLog","signatureRequest","consentement","dataRequest","auditLog","cours","coursModule","lecon","progressionLecon","quizResultat","coursApprenant","reclamation","veilleEntree","partenaire","seance","presence","emargementSignature"];
(async () => {
  const org = await p.organisme.findFirst({ where: { nom: "CAP Compétences" } });
  if (!org) throw new Error("Tenant CAP introuvable");
  let total = 0;
  for (const mdl of MODELS) {
    try {
      const r = await p[mdl].updateMany({ where: { organismeId: null }, data: { organismeId: org.id } });
      if (r.count > 0) console.log(`  ${mdl}: ${r.count}`);
      total += r.count;
    } catch (e) {
      console.log(`  ${mdl}: ERREUR ${e.message.split("\n")[0]}`);
    }
  }
  console.log("Total lignes backfillées:", total);
  await p.$disconnect();
})();
