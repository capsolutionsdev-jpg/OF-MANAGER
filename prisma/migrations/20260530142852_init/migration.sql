-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RESPONSABLE_FORMATION', 'ASSISTANT', 'FORMATEUR', 'APPRENANT');

-- CreateEnum
CREATE TYPE "Modalite" AS ENUM ('PRESENTIEL', 'DISTANCIEL', 'MIXTE');

-- CreateEnum
CREATE TYPE "FinancementType" AS ENUM ('CPF', 'OPCO', 'FRANCE_TRAVAIL', 'AUTOFINANCEMENT', 'ENTREPRISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CandidatStatut" AS ENUM ('NOUVEAU', 'EN_TRAITEMENT', 'INSCRIT', 'REFUSE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "SessionStatut" AS ENUM ('PLANIFIEE', 'OUVERTE', 'COMPLETE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "InscriptionStatut" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "SeanceType" AS ENUM ('JOURNEE', 'MATIN', 'APRES_MIDI');

-- CreateEnum
CREATE TYPE "PresenceStatut" AS ENUM ('PRESENT', 'ABSENT', 'RETARD', 'EXCUSE');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('POSITIONNEMENT', 'ACQUIS', 'SATISFACTION_CHAUD', 'SATISFACTION_FROID', 'BILAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FICHE_INSCRIPTION', 'CONTRAT_FORMATION', 'CONVENTION_FORMATION', 'CONVOCATION', 'PROGRAMME', 'ATTESTATION_ENTREE', 'ATTESTATION_FIN', 'ATTESTATION_REUSSITE', 'CERTIFICAT_REALISATION', 'QUESTIONNAIRE_POSITIONNEMENT', 'QUESTIONNAIRE_SATISFACTION', 'EVALUATION_CHAUD', 'EVALUATION_FROID', 'BILAN_INDIVIDUEL', 'RELEVE_PRESENCE', 'COMPTE_RENDU_PEDAGOGIQUE', 'DOCUMENT_CPF', 'DOCUMENT_OPCO', 'AUTRE');

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('YOUSIGN', 'UNIVERSIGN', 'DOCUSIGN', 'INTERNE');

-- CreateEnum
CREATE TYPE "SignatureStatut" AS ENUM ('EN_ATTENTE', 'ENVOYEE', 'SIGNEE', 'REFUSEE', 'EXPIREE');

-- CreateEnum
CREATE TYPE "CrmStage" AS ENUM ('NOUVEAU', 'QUALIFIE', 'PROPOSITION', 'NEGOCIATION', 'GAGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('APPEL', 'EMAIL', 'RDV', 'NOTE');

-- CreateEnum
CREATE TYPE "FactureStatut" AS ENUM ('BROUILLON', 'ENVOYEE', 'PAYEE', 'PARTIELLE', 'ANNULEE', 'AVOIR');

-- CreateEnum
CREATE TYPE "QualiopiStatut" AS ENUM ('CONFORME', 'NON_CONFORME', 'EN_COURS', 'NON_APPLICABLE');

-- CreateEnum
CREATE TYPE "AuditType" AS ENUM ('INTERNE', 'EXTERNE', 'SURVEILLANCE');

-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('AVANT_SESSION', 'DEBUT_SESSION', 'PENDANT_SESSION', 'FIN_SESSION', 'APRES_SESSION');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('ENVOI_CONVOCATION', 'RAPPEL', 'ENVOI_EMARGEMENT', 'ENVOI_ATTESTATION', 'ENVOI_CERTIFICAT', 'ENVOI_QUESTIONNAIRE_SATISFACTION', 'EMAIL_PERSONNALISE');

-- CreateEnum
CREATE TYPE "EmailStatut" AS ENUM ('EN_ATTENTE', 'ENVOYE', 'ECHEC');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'SUPPRESSION');

-- CreateEnum
CREATE TYPE "DataRequestStatut" AS ENUM ('RECUE', 'EN_COURS', 'TRAITEE', 'REFUSEE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ASSISTANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidat" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "telephone" TEXT,
    "email" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "pays" TEXT DEFAULT 'France',
    "situationPro" TEXT,
    "employeur" TEXT,
    "posteOccupe" TEXT,
    "financementType" "FinancementType",
    "entrepriseId" TEXT,
    "statut" "CandidatStatut" NOT NULL DEFAULT 'NOUVEAU',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointe" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "categorie" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "taille" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceJointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "objectifs" TEXT,
    "programme" TEXT,
    "duree" TEXT,
    "dureeHeures" INTEGER,
    "tarif" DECIMAL(10,2),
    "modalite" "Modalite" NOT NULL DEFAULT 'MIXTE',
    "prerequis" TEXT,
    "publicVise" TEXT,
    "methodesPedagogiques" TEXT,
    "modalitesEvaluation" TEXT,
    "certification" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "reference" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "horaires" TEXT,
    "lieu" TEXT,
    "modalite" "Modalite" NOT NULL DEFAULT 'MIXTE',
    "nbPlaces" INTEGER NOT NULL DEFAULT 10,
    "statut" "SessionStatut" NOT NULL DEFAULT 'PLANIFIEE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formateur" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "specialites" TEXT,
    "bio" TEXT,
    "cvUrl" TEXT,
    "experienceAnnees" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "apprenantId" TEXT,
    "entrepriseId" TEXT,
    "financementType" "FinancementType",
    "statut" "InscriptionStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "montant" DECIMAL(10,2),
    "consentementRgpd" BOOLEAN NOT NULL DEFAULT false,
    "consentementDate" TIMESTAMP(3),
    "signatureStatut" "SignatureStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT,
    "contenu" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGenere" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "templateId" TEXT,
    "inscriptionId" TEXT,
    "sessionId" TEXT,
    "apprenantId" TEXT,
    "fileUrl" TEXT,
    "variablesJson" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentGenere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "SeanceType" NOT NULL DEFAULT 'JOURNEE',
    "heureDebut" TEXT,
    "heureFin" TEXT,
    "formateurId" TEXT,
    "formateurSignatureUrl" TEXT,

    CONSTRAINT "Seance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "seanceId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "statut" "PresenceStatut" NOT NULL DEFAULT 'PRESENT',
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "commentaire" TEXT,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "formationId" TEXT,
    "sessionId" TEXT,
    "questionsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResultat" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "reponsesJson" JSONB,
    "score" DOUBLE PRECISION,
    "note" DOUBLE PRECISION,
    "commentaire" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationResultat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convention" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "inscriptionId" TEXT,
    "sessionId" TEXT,
    "entrepriseId" TEXT,
    "montant" DECIMAL(10,2),
    "dateSignature" TIMESTAMP(3),
    "signatureStatut" "SignatureStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "montant" DECIMAL(10,2),
    "dateSignature" TIMESTAMP(3),
    "signatureStatut" "SignatureStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualiopiIndicateur" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "description" TEXT,
    "statut" "QualiopiStatut" NOT NULL DEFAULT 'EN_COURS',
    "responsableId" TEXT,
    "commentaire" TEXT,
    "dateMaj" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualiopiIndicateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualiopiPreuve" (
    "id" TEXT NOT NULL,
    "indicateurId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualiopiPreuve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "type" "AuditType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "auditeur" TEXT,
    "organismeAudit" TEXT,
    "conformiteGlobale" "QualiopiStatut" NOT NULL DEFAULT 'EN_COURS',
    "rapportUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "contactNom" TEXT,
    "contactEmail" TEXT,
    "contactTel" TEXT,
    "stage" "CrmStage" NOT NULL DEFAULT 'NOUVEAU',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInteraction" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sujet" TEXT,
    "contenu" TEXT,
    "userId" TEXT,

    CONSTRAINT "CrmInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "montantHT" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "montantTTC" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lignesJson" JSONB,
    "statut" "FactureStatut" NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "inscriptionId" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montantHT" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "montantTTC" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lignesJson" JSONB,
    "statut" "FactureStatut" NOT NULL DEFAULT 'BROUILLON',
    "datePaiement" TIMESTAMP(3),
    "financementType" "FinancementType",
    "avoirParentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT,
    "reference" TEXT,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "trigger" "WorkflowTrigger" NOT NULL,
    "offsetDays" INTEGER NOT NULL DEFAULT 0,
    "action" "WorkflowAction" NOT NULL,
    "templateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "corps" TEXT,
    "statut" "EmailStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "sentAt" TIMESTAMP(3),
    "sessionId" TEXT,
    "workflowRuleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRequest" (
    "id" TEXT NOT NULL,
    "provider" "SignatureProvider" NOT NULL DEFAULT 'INTERNE',
    "documentGenereId" TEXT,
    "inscriptionId" TEXT,
    "statut" "SignatureStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "signataires" JSONB,
    "externalId" TEXT,
    "signedFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signedAt" TIMESTAMP(3),

    CONSTRAINT "SignatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consentement" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT,
    "type" TEXT NOT NULL,
    "accepte" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT,
    "ip" TEXT,
    "accepteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retireLe" TIMESTAMP(3),

    CONSTRAINT "Consentement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRequest" (
    "id" TEXT NOT NULL,
    "subjectEmail" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "statut" "DataRequestStatut" NOT NULL DEFAULT 'RECUE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "DataRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SessionFormateurs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SessionFormateurs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Candidat_statut_idx" ON "Candidat"("statut");

-- CreateIndex
CREATE INDEX "Candidat_email_idx" ON "Candidat"("email");

-- CreateIndex
CREATE INDEX "PieceJointe_candidatId_idx" ON "PieceJointe"("candidatId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_reference_key" ON "Formation"("reference");

-- CreateIndex
CREATE INDEX "Formation_isArchived_idx" ON "Formation"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Session_reference_key" ON "Session"("reference");

-- CreateIndex
CREATE INDEX "Session_statut_idx" ON "Session"("statut");

-- CreateIndex
CREATE INDEX "Session_dateDebut_idx" ON "Session"("dateDebut");

-- CreateIndex
CREATE UNIQUE INDEX "Formateur_userId_key" ON "Formateur"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_candidatId_key" ON "Apprenant"("candidatId");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_userId_key" ON "Apprenant"("userId");

-- CreateIndex
CREATE INDEX "Inscription_statut_idx" ON "Inscription"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_candidatId_sessionId_key" ON "Inscription"("candidatId", "sessionId");

-- CreateIndex
CREATE INDEX "DocumentGenere_type_idx" ON "DocumentGenere"("type");

-- CreateIndex
CREATE INDEX "DocumentGenere_inscriptionId_idx" ON "DocumentGenere"("inscriptionId");

-- CreateIndex
CREATE INDEX "Seance_sessionId_idx" ON "Seance"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_seanceId_apprenantId_key" ON "Presence"("seanceId", "apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResultat_evaluationId_apprenantId_key" ON "EvaluationResultat"("evaluationId", "apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_reference_key" ON "Convention"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_inscriptionId_key" ON "Convention"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_reference_key" ON "Contrat"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_inscriptionId_key" ON "Contrat"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "QualiopiIndicateur_numero_key" ON "QualiopiIndicateur"("numero");

-- CreateIndex
CREATE INDEX "QualiopiPreuve_indicateurId_idx" ON "QualiopiPreuve"("indicateurId");

-- CreateIndex
CREATE INDEX "Entreprise_stage_idx" ON "Entreprise"("stage");

-- CreateIndex
CREATE INDEX "CrmInteraction_entrepriseId_idx" ON "CrmInteraction"("entrepriseId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_reference_key" ON "Devis"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_reference_key" ON "Facture"("reference");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "EmailLog_statut_idx" ON "EmailLog"("statut");

-- CreateIndex
CREATE INDEX "SignatureRequest_statut_idx" ON "SignatureRequest"("statut");

-- CreateIndex
CREATE INDEX "Consentement_candidatId_idx" ON "Consentement"("candidatId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "_SessionFormateurs_B_index" ON "_SessionFormateurs"("B");

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formateur" ADD CONSTRAINT "Formateur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apprenant" ADD CONSTRAINT "Apprenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenere" ADD CONSTRAINT "DocumentGenere_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seance" ADD CONSTRAINT "Seance_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_seanceId_fkey" FOREIGN KEY ("seanceId") REFERENCES "Seance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResultat" ADD CONSTRAINT "EvaluationResultat_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResultat" ADD CONSTRAINT "EvaluationResultat_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Convention" ADD CONSTRAINT "Convention_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualiopiIndicateur" ADD CONSTRAINT "QualiopiIndicateur_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualiopiPreuve" ADD CONSTRAINT "QualiopiPreuve_indicateurId_fkey" FOREIGN KEY ("indicateurId") REFERENCES "QualiopiIndicateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmInteraction" ADD CONSTRAINT "CrmInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devis" ADD CONSTRAINT "Devis_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_avoirParentId_fkey" FOREIGN KEY ("avoirParentId") REFERENCES "Facture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_workflowRuleId_fkey" FOREIGN KEY ("workflowRuleId") REFERENCES "WorkflowRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_documentGenereId_fkey" FOREIGN KEY ("documentGenereId") REFERENCES "DocumentGenere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consentement" ADD CONSTRAINT "Consentement_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRequest" ADD CONSTRAINT "DataRequest_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionFormateurs" ADD CONSTRAINT "_SessionFormateurs_A_fkey" FOREIGN KEY ("A") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionFormateurs" ADD CONSTRAINT "_SessionFormateurs_B_fkey" FOREIGN KEY ("B") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
