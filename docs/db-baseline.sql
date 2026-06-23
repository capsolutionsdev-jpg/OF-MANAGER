-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ADMIN', 'RESPONSABLE_FORMATION', 'ASSISTANT', 'FORMATEUR', 'APPRENANT');

-- CreateEnum
CREATE TYPE "OrganismeStatut" AS ENUM ('ESSAI', 'ACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "FormuleAbonnement" AS ENUM ('BASIQUE', 'MEDIUM', 'COMPLET');

-- CreateEnum
CREATE TYPE "SupportPriorite" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "SupportStatut" AS ENUM ('OUVERT', 'EN_COURS', 'RESOLU');

-- CreateEnum
CREATE TYPE "Modalite" AS ENUM ('PRESENTIEL', 'DISTANCIEL', 'MIXTE');

-- CreateEnum
CREATE TYPE "Academy" AS ENUM ('DIGITAL', 'SAFETY', 'TRANSPORT', 'LANGUE');

-- CreateEnum
CREATE TYPE "FinancementType" AS ENUM ('CPF', 'OPCO', 'FRANCE_TRAVAIL', 'AUTOFINANCEMENT', 'ENTREPRISE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CandidatStatut" AS ENUM ('NOUVEAU', 'EN_TRAITEMENT', 'INSCRIT', 'REFUSE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "CnapsStatut" AS ENUM ('NON_FAIT', 'EN_COURS', 'COMPLETEMENT_DOSSIER', 'ACCEPTE', 'REFUSE');

-- CreateEnum
CREATE TYPE "SessionStatut" AS ENUM ('PLANIFIEE', 'OUVERTE', 'COMPLETE', 'EN_COURS', 'TERMINEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "InscriptionStatut" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'SUSPENDUE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PaiementStatut" AS ENUM ('EN_ATTENTE', 'ACOMPTE', 'PAYE', 'REMBOURSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "CertificationResultat" AS ENUM ('NON_EVALUE', 'CERTIFIE', 'AJOURNE', 'ABANDON');

-- CreateEnum
CREATE TYPE "SeanceType" AS ENUM ('JOURNEE', 'MATIN', 'APRES_MIDI');

-- CreateEnum
CREATE TYPE "PresenceStatut" AS ENUM ('PRESENT', 'ABSENT', 'RETARD', 'EXCUSE');

-- CreateEnum
CREATE TYPE "DemiJournee" AS ENUM ('MATIN', 'APRES_MIDI');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('POSITIONNEMENT', 'ACQUIS', 'SATISFACTION_CHAUD', 'SATISFACTION_FROID', 'BILAN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FICHE_INSCRIPTION', 'CONTRAT_FORMATION', 'CONVENTION_FORMATION', 'CONVOCATION', 'CONVOCATION_EXAMEN', 'PROGRAMME', 'ATTESTATION_ENTREE', 'ATTESTATION_FIN', 'ATTESTATION_REUSSITE', 'CERTIFICAT_REALISATION', 'QUESTIONNAIRE_POSITIONNEMENT', 'QUESTIONNAIRE_SATISFACTION', 'EVALUATION_CHAUD', 'EVALUATION_FROID', 'BILAN_INDIVIDUEL', 'RELEVE_PRESENCE', 'COMPTE_RENDU_PEDAGOGIQUE', 'SUIVI_6MOIS', 'DOCUMENT_CPF', 'DOCUMENT_OPCO', 'AUTRE');

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
CREATE TYPE "FactureFormateurStatut" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'PAYEE', 'REJETEE');

-- CreateEnum
CREATE TYPE "PieceStatut" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "MessageAuteur" AS ENUM ('OF', 'CANDIDAT', 'FORMATEUR');

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

-- CreateEnum
CREATE TYPE "ReclamationOrigine" AS ENUM ('STAGIAIRE', 'FORMATEUR', 'ENTREPRISE', 'FINANCEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "ReclamationStatut" AS ENUM ('NOUVELLE', 'ACCUSE_RECEPTION', 'EN_TRAITEMENT', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "VeilleType" AS ENUM ('LEGALE', 'METIERS', 'PEDAGOGIQUE');

-- CreateEnum
CREATE TYPE "LeadStatut" AS ENUM ('NOUVEAU', 'A_RAPPELER', 'RAPPELE', 'CONVERTI', 'PERDU');

-- CreateTable
CREATE TABLE "Organisme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "raisonSociale" TEXT,
    "representant" TEXT,
    "representantQualite" TEXT,
    "siret" TEXT,
    "nda" TEXT,
    "numeroTva" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "certificateur" TEXT,
    "qualiopiNumero" TEXT,
    "assujettiTva" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "cachetUrl" TEXT,
    "signatureUrl" TEXT,
    "faviconUrl" TEXT,
    "couleurPrimaire" TEXT DEFAULT '#1A5FD4',
    "couleurSecondaire" TEXT,
    "theme" TEXT,
    "design" TEXT,
    "appUrl" TEXT,
    "version" TEXT,
    "emailExpediteurNom" TEXT,
    "emailExpediteur" TEXT,
    "brevoApiKey" TEXT,
    "sousDomaine" TEXT,
    "anthropicApiKey" TEXT,
    "yousignApiKey" TEXT,
    "automationsConfig" JSONB,
    "maxSmsMois" INTEGER,
    "fonctionnalites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentsConfig" JSONB,
    "statut" "OrganismeStatut" NOT NULL DEFAULT 'ESSAI',
    "formule" "FormuleAbonnement",
    "maxUtilisateurs" INTEGER,
    "notes" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "abonnementJusquau" TIMESTAMP(3),
    "dureeConservationMois" INTEGER NOT NULL DEFAULT 36,
    "referentHandicapNom" TEXT,
    "referentHandicapContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ASSISTANT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organismeId" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notificationsSeenAt" TIMESTAMP(3),
    "activeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidat" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "paysNaissance" TEXT,
    "telephone" TEXT,
    "email" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "pays" TEXT DEFAULT 'France',
    "situationPro" TEXT,
    "employeur" TEXT,
    "posteOccupe" TEXT,
    "dernierDiplome" TEXT,
    "photoUrl" TEXT,
    "sourceConnaissance" TEXT,
    "financementType" "FinancementType",
    "entrepriseId" TEXT,
    "formationSouhaiteeId" TEXT,
    "statut" "CandidatStatut" NOT NULL DEFAULT 'NOUVEAU',
    "crmStage" "CrmStage" NOT NULL DEFAULT 'NOUVEAU',
    "tags" TEXT[],
    "valeurEstimee" DECIMAL(10,2),
    "relanceDate" TIMESTAMP(3),
    "assignedToId" TEXT,
    "cnapsStatut" "CnapsStatut",
    "carteProNumero" TEXT,
    "carteProValidite" TIMESTAMP(3),
    "ssiapNiveau" INTEGER,
    "ssiapDiplomeNumero" TEXT,
    "ssiapDiplomeDate" TIMESTAMP(3),
    "situationHandicap" BOOLEAN NOT NULL DEFAULT false,
    "besoinsAdaptation" TEXT,
    "anonymiseLe" TIMESTAMP(3),
    "prospectToken" TEXT,
    "prospectFormSentAt" TIMESTAMP(3),
    "prospectFormCompletedAt" TIMESTAMP(3),
    "prospectSignatureUrl" TEXT,
    "prospectSignatureIp" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidatInteraction" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "candidatId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sujet" TEXT,
    "contenu" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidatInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PieceJointe" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "candidatId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "categorie" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "taille" INTEGER,
    "statut" "PieceStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "motifRefus" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PieceJointe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "titre" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "objectifs" TEXT,
    "programme" TEXT,
    "duree" TEXT,
    "dureeHeures" INTEGER,
    "tarif" DECIMAL(10,2),
    "modalite" "Modalite" NOT NULL DEFAULT 'MIXTE',
    "academy" "Academy",
    "prerequis" TEXT,
    "publicVise" TEXT,
    "methodesPedagogiques" TEXT,
    "modalitesEvaluation" TEXT,
    "positionnementQuestions" JSONB,
    "certification" TEXT,
    "conditionsAcces" TEXT,
    "delaiAcces" TEXT,
    "piecesAttendues" TEXT[],
    "examen" BOOLEAN NOT NULL DEFAULT false,
    "grilleInrs" TEXT,
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
    "organismeId" TEXT,
    "formationId" TEXT NOT NULL,
    "reference" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "horaires" TEXT,
    "lieu" TEXT,
    "dateExamen" TIMESTAMP(3),
    "lieuExamen" TEXT,
    "resultatsDeclaresAt" TIMESTAMP(3),
    "modalite" "Modalite" NOT NULL DEFAULT 'MIXTE',
    "nbPlaces" INTEGER NOT NULL DEFAULT 10,
    "statut" "SessionStatut" NOT NULL DEFAULT 'PLANIFIEE',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "salleId" TEXT,
    "tarifFormateurJour" DECIMAL(10,2),
    "contratFormateurToken" TEXT,
    "contratFormateurSentAt" TIMESTAMP(3),
    "contratFormateurSignedAt" TIMESTAMP(3),
    "contratFormateurSignatureUrl" TEXT,
    "crFormateurToken" TEXT,
    "crFormateurSentAt" TIMESTAMP(3),
    "crFormateurJson" JSONB,
    "crFormateurCompletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salle" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER,
    "lieu" TEXT,
    "equipements" TEXT,
    "couleur" TEXT DEFAULT '#1A5FD4',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formateur" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT,
    "telephone" TEXT,
    "specialites" TEXT,
    "bio" TEXT,
    "cvUrl" TEXT,
    "experienceAnnees" INTEGER,
    "academies" "Academy"[],
    "adresse" TEXT,
    "siret" TEXT,
    "tarifJournalier" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apprenant" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "candidatId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "candidatId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "apprenantId" TEXT,
    "entrepriseId" TEXT,
    "financementType" "FinancementType",
    "statut" "InscriptionStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "montant" DECIMAL(10,2),
    "modePaiement" TEXT,
    "paiementStatut" "PaiementStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "resultatCertification" "CertificationResultat" NOT NULL DEFAULT 'NON_EVALUE',
    "certificationDate" TIMESTAMP(3),
    "convocationExamenSentAt" TIMESTAMP(3),
    "piecesRecues" TEXT[],
    "accessToken" TEXT,
    "formCompletedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureIp" TEXT,
    "signatureDataUrl" TEXT,
    "docsCopieSentAt" TIMESTAMP(3),
    "convocationSentAt" TIMESTAMP(3),
    "rappelSentAt" TIMESTAMP(3),
    "attestationReussiteSentAt" TIMESTAMP(3),
    "attestationEntreeSentAt" TIMESTAMP(3),
    "satisfactionToken" TEXT,
    "satisfactionSentAt" TIMESTAMP(3),
    "satisfactionJson" JSONB,
    "satisfactionCompletedAt" TIMESTAMP(3),
    "positionnementToken" TEXT,
    "positionnementSentAt" TIMESTAMP(3),
    "positionnementJson" JSONB,
    "positionnementCompletedAt" TIMESTAMP(3),
    "positionnementSignature" TEXT,
    "satisfactionEntrepriseToken" TEXT,
    "satisfactionEntrepriseSentAt" TIMESTAMP(3),
    "satisfactionEntrepriseJson" JSONB,
    "satisfactionEntrepriseCompletedAt" TIMESTAMP(3),
    "docsFinSentAt" TIMESTAMP(3),
    "suivi6moisToken" TEXT,
    "suivi6moisSentAt" TIMESTAMP(3),
    "suivi6moisJson" JSONB,
    "suivi6moisCompletedAt" TIMESTAMP(3),
    "suivi6moisSignature" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "seanceId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "statut" "PresenceStatut" NOT NULL DEFAULT 'PRESENT',
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "commentaire" TEXT,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmargementSignature" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "sessionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "demi" "DemiJournee" NOT NULL,
    "role" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "candidatId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signatureIp" TEXT,
    "signatureDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmargementSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "organismeId" TEXT,
    "convocationActive" BOOLEAN NOT NULL DEFAULT true,
    "convocationJMoins" INTEGER NOT NULL DEFAULT 7,
    "attestationEntreeActive" BOOLEAN NOT NULL DEFAULT true,
    "satisfactionActive" BOOLEAN NOT NULL DEFAULT true,
    "docsFinActive" BOOLEAN NOT NULL DEFAULT true,
    "compteRenduActive" BOOLEAN NOT NULL DEFAULT true,
    "emargementActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "indicateurId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fileUrl" TEXT,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualiopiPreuve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "contactNom" TEXT,
    "contactEmail" TEXT,
    "contactTel" TEXT,
    "representant" TEXT,
    "fonction" TEXT,
    "numeroTva" TEXT,
    "opco" TEXT,
    "stage" "CrmStage" NOT NULL DEFAULT 'NOUVEAU',
    "notes" TEXT,
    "portalToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmInteraction" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "reference" TEXT NOT NULL,
    "entrepriseId" TEXT,
    "clientNom" TEXT,
    "clientEmail" TEXT,
    "objet" TEXT,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "montantHT" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tva" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "montantTTC" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lignesJson" JSONB,
    "statut" "FactureStatut" NOT NULL DEFAULT 'BROUILLON',
    "acceptToken" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "signataire" TEXT,
    "signatureUrl" TEXT,
    "signatureIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tache" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "done" BOOLEAN NOT NULL DEFAULT false,
    "candidatId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "destinataire" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "candidatId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "providerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "factureId" TEXT,
    "inscriptionId" TEXT,
    "montant" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT,
    "reference" TEXT,
    "enregistreParId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactureFormateur" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "formateurId" TEXT NOT NULL,
    "sessionId" TEXT,
    "reference" TEXT,
    "montant" DECIMAL(10,2) NOT NULL,
    "fichierUrl" TEXT,
    "commentaire" TEXT,
    "statut" "FactureFormateurStatut" NOT NULL DEFAULT 'EN_ATTENTE',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactureFormateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disponibilite" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "formateurId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "demi" "DemiJournee",
    "dispo" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "sujet" TEXT,
    "candidatId" TEXT,
    "formateurId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "conversationId" TEXT NOT NULL,
    "auteur" "MessageAuteur" NOT NULL,
    "auteurUserId" TEXT,
    "corps" TEXT NOT NULL,
    "luParOf" BOOLEAN NOT NULL DEFAULT false,
    "luParClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
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
    "organismeId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changesJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cours" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "academy" "Academy" NOT NULL,
    "formationId" TEXT,
    "niveau" TEXT,
    "imageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursModule" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "coursId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CoursModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecon" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "moduleId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "contenu" TEXT,
    "videoUrl" TEXT,
    "imagesJson" JSONB,
    "dureeMin" INTEGER,
    "ressourcesJson" JSONB,
    "quizJson" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lecon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionLecon" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "apprenantId" TEXT NOT NULL,
    "leconId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressionLecon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResultat" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "apprenantId" TEXT NOT NULL,
    "leconId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizResultat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursApprenant" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "coursId" TEXT NOT NULL,
    "apprenantId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursApprenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reclamation" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origine" "ReclamationOrigine" NOT NULL DEFAULT 'STAGIAIRE',
    "declarant" TEXT NOT NULL,
    "contact" TEXT,
    "formation" TEXT,
    "objet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "gravite" INTEGER NOT NULL DEFAULT 1,
    "statut" "ReclamationStatut" NOT NULL DEFAULT 'NOUVELLE',
    "arDate" TIMESTAMP(3),
    "analyse" TEXT,
    "actions" TEXT,
    "reponseDate" TIMESTAMP(3),
    "clotureDate" TIMESTAMP(3),
    "signatureDataUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reclamation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VeilleEntree" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "type" "VeilleType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "resume" TEXT,
    "action" TEXT,
    "lien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VeilleEntree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "objet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "organismeId" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "priorite" "SupportPriorite" NOT NULL DEFAULT 'NORMALE',
    "statut" "SupportStatut" NOT NULL DEFAULT 'OUVERT',
    "demandeurNom" TEXT,
    "demandeurEmail" TEXT,
    "nonLuSupport" BOOLEAN NOT NULL DEFAULT true,
    "nonLuClient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "corps" TEXT NOT NULL,
    "parSupport" BOOLEAN NOT NULL DEFAULT false,
    "auteurNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "organisme" TEXT,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "message" TEXT,
    "source" TEXT,
    "hebergement" TEXT,
    "formations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statut" "LeadStatut" NOT NULL DEFAULT 'NOUVEAU',
    "notes" TEXT,
    "rappeleAt" TIMESTAMP(3),
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTarif" (
    "id" TEXT NOT NULL,
    "formule" "FormuleAbonnement" NOT NULL,
    "nom" TEXT,
    "prix" INTEGER NOT NULL,
    "tagline" TEXT NOT NULL,
    "supportLevel" TEXT NOT NULL,
    "comptesInclus" INTEGER,
    "fonctionnalites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "populaire" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanTarif_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SessionFormateurs" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SessionFormateurs_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_FormateurToFormation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FormateurToFormation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisme_sousDomaine_key" ON "Organisme"("sousDomaine");

-- CreateIndex
CREATE INDEX "Organisme_statut_idx" ON "Organisme"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Candidat_prospectToken_key" ON "Candidat"("prospectToken");

-- CreateIndex
CREATE INDEX "Candidat_statut_idx" ON "Candidat"("statut");

-- CreateIndex
CREATE INDEX "Candidat_email_idx" ON "Candidat"("email");

-- CreateIndex
CREATE INDEX "Candidat_crmStage_idx" ON "Candidat"("crmStage");

-- CreateIndex
CREATE INDEX "Candidat_assignedToId_idx" ON "Candidat"("assignedToId");

-- CreateIndex
CREATE INDEX "Candidat_organismeId_idx" ON "Candidat"("organismeId");

-- CreateIndex
CREATE INDEX "CandidatInteraction_candidatId_idx" ON "CandidatInteraction"("candidatId");

-- CreateIndex
CREATE INDEX "CandidatInteraction_organismeId_idx" ON "CandidatInteraction"("organismeId");

-- CreateIndex
CREATE INDEX "PieceJointe_candidatId_idx" ON "PieceJointe"("candidatId");

-- CreateIndex
CREATE INDEX "PieceJointe_organismeId_idx" ON "PieceJointe"("organismeId");

-- CreateIndex
CREATE INDEX "Formation_isArchived_idx" ON "Formation"("isArchived");

-- CreateIndex
CREATE INDEX "Formation_organismeId_idx" ON "Formation"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Formation_organismeId_reference_key" ON "Formation"("organismeId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Session_contratFormateurToken_key" ON "Session"("contratFormateurToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_crFormateurToken_key" ON "Session"("crFormateurToken");

-- CreateIndex
CREATE INDEX "Session_statut_idx" ON "Session"("statut");

-- CreateIndex
CREATE INDEX "Session_dateDebut_idx" ON "Session"("dateDebut");

-- CreateIndex
CREATE INDEX "Session_organismeId_idx" ON "Session"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_organismeId_reference_key" ON "Session"("organismeId", "reference");

-- CreateIndex
CREATE INDEX "Salle_organismeId_idx" ON "Salle"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Formateur_userId_key" ON "Formateur"("userId");

-- CreateIndex
CREATE INDEX "Formateur_organismeId_idx" ON "Formateur"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_candidatId_key" ON "Apprenant"("candidatId");

-- CreateIndex
CREATE UNIQUE INDEX "Apprenant_userId_key" ON "Apprenant"("userId");

-- CreateIndex
CREATE INDEX "Apprenant_organismeId_idx" ON "Apprenant"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_accessToken_key" ON "Inscription"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_satisfactionToken_key" ON "Inscription"("satisfactionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_positionnementToken_key" ON "Inscription"("positionnementToken");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_satisfactionEntrepriseToken_key" ON "Inscription"("satisfactionEntrepriseToken");

-- CreateIndex
CREATE INDEX "Inscription_statut_idx" ON "Inscription"("statut");

-- CreateIndex
CREATE INDEX "Inscription_organismeId_idx" ON "Inscription"("organismeId");

-- CreateIndex
CREATE INDEX "Inscription_suivi6moisToken_idx" ON "Inscription"("suivi6moisToken");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_candidatId_sessionId_key" ON "Inscription"("candidatId", "sessionId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_organismeId_idx" ON "DocumentTemplate"("organismeId");

-- CreateIndex
CREATE INDEX "DocumentGenere_type_idx" ON "DocumentGenere"("type");

-- CreateIndex
CREATE INDEX "DocumentGenere_inscriptionId_idx" ON "DocumentGenere"("inscriptionId");

-- CreateIndex
CREATE INDEX "DocumentGenere_organismeId_idx" ON "DocumentGenere"("organismeId");

-- CreateIndex
CREATE INDEX "Seance_sessionId_idx" ON "Seance"("sessionId");

-- CreateIndex
CREATE INDEX "Seance_organismeId_idx" ON "Seance"("organismeId");

-- CreateIndex
CREATE INDEX "Presence_organismeId_idx" ON "Presence"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_seanceId_apprenantId_key" ON "Presence"("seanceId", "apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EmargementSignature_token_key" ON "EmargementSignature"("token");

-- CreateIndex
CREATE INDEX "EmargementSignature_sessionId_idx" ON "EmargementSignature"("sessionId");

-- CreateIndex
CREATE INDEX "EmargementSignature_organismeId_idx" ON "EmargementSignature"("organismeId");

-- CreateIndex
CREATE INDEX "AutomationSettings_organismeId_idx" ON "AutomationSettings"("organismeId");

-- CreateIndex
CREATE INDEX "Evaluation_organismeId_idx" ON "Evaluation"("organismeId");

-- CreateIndex
CREATE INDEX "EvaluationResultat_organismeId_idx" ON "EvaluationResultat"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResultat_evaluationId_apprenantId_key" ON "EvaluationResultat"("evaluationId", "apprenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_inscriptionId_key" ON "Convention"("inscriptionId");

-- CreateIndex
CREATE INDEX "Convention_organismeId_idx" ON "Convention"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Convention_organismeId_reference_key" ON "Convention"("organismeId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_inscriptionId_key" ON "Contrat"("inscriptionId");

-- CreateIndex
CREATE INDEX "Contrat_organismeId_idx" ON "Contrat"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Contrat_organismeId_reference_key" ON "Contrat"("organismeId", "reference");

-- CreateIndex
CREATE INDEX "QualiopiIndicateur_organismeId_idx" ON "QualiopiIndicateur"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "QualiopiIndicateur_organismeId_numero_key" ON "QualiopiIndicateur"("organismeId", "numero");

-- CreateIndex
CREATE INDEX "QualiopiPreuve_indicateurId_idx" ON "QualiopiPreuve"("indicateurId");

-- CreateIndex
CREATE INDEX "QualiopiPreuve_organismeId_idx" ON "QualiopiPreuve"("organismeId");

-- CreateIndex
CREATE INDEX "Audit_organismeId_idx" ON "Audit"("organismeId");

-- CreateIndex
CREATE INDEX "Entreprise_stage_idx" ON "Entreprise"("stage");

-- CreateIndex
CREATE INDEX "Entreprise_organismeId_idx" ON "Entreprise"("organismeId");

-- CreateIndex
CREATE INDEX "Entreprise_portalToken_idx" ON "Entreprise"("portalToken");

-- CreateIndex
CREATE INDEX "CrmInteraction_entrepriseId_idx" ON "CrmInteraction"("entrepriseId");

-- CreateIndex
CREATE INDEX "CrmInteraction_organismeId_idx" ON "CrmInteraction"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_acceptToken_key" ON "Devis"("acceptToken");

-- CreateIndex
CREATE INDEX "Devis_organismeId_idx" ON "Devis"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_organismeId_reference_key" ON "Devis"("organismeId", "reference");

-- CreateIndex
CREATE INDEX "Tache_organismeId_idx" ON "Tache"("organismeId");

-- CreateIndex
CREATE INDEX "Tache_done_idx" ON "Tache"("done");

-- CreateIndex
CREATE INDEX "SmsLog_organismeId_idx" ON "SmsLog"("organismeId");

-- CreateIndex
CREATE INDEX "Facture_statut_idx" ON "Facture"("statut");

-- CreateIndex
CREATE INDEX "Facture_organismeId_idx" ON "Facture"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_organismeId_reference_key" ON "Facture"("organismeId", "reference");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_inscriptionId_idx" ON "Paiement"("inscriptionId");

-- CreateIndex
CREATE INDEX "Paiement_enregistreParId_idx" ON "Paiement"("enregistreParId");

-- CreateIndex
CREATE INDEX "Paiement_organismeId_idx" ON "Paiement"("organismeId");

-- CreateIndex
CREATE INDEX "FactureFormateur_organismeId_idx" ON "FactureFormateur"("organismeId");

-- CreateIndex
CREATE INDEX "FactureFormateur_formateurId_idx" ON "FactureFormateur"("formateurId");

-- CreateIndex
CREATE INDEX "FactureFormateur_statut_idx" ON "FactureFormateur"("statut");

-- CreateIndex
CREATE INDEX "Disponibilite_organismeId_idx" ON "Disponibilite"("organismeId");

-- CreateIndex
CREATE INDEX "Disponibilite_formateurId_idx" ON "Disponibilite"("formateurId");

-- CreateIndex
CREATE INDEX "Disponibilite_date_idx" ON "Disponibilite"("date");

-- CreateIndex
CREATE INDEX "Conversation_organismeId_idx" ON "Conversation"("organismeId");

-- CreateIndex
CREATE INDEX "Conversation_candidatId_idx" ON "Conversation"("candidatId");

-- CreateIndex
CREATE INDEX "Conversation_formateurId_idx" ON "Conversation"("formateurId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_organismeId_idx" ON "Message"("organismeId");

-- CreateIndex
CREATE INDEX "WorkflowRule_organismeId_idx" ON "WorkflowRule"("organismeId");

-- CreateIndex
CREATE INDEX "EmailLog_statut_idx" ON "EmailLog"("statut");

-- CreateIndex
CREATE INDEX "EmailLog_organismeId_idx" ON "EmailLog"("organismeId");

-- CreateIndex
CREATE INDEX "SignatureRequest_statut_idx" ON "SignatureRequest"("statut");

-- CreateIndex
CREATE INDEX "SignatureRequest_organismeId_idx" ON "SignatureRequest"("organismeId");

-- CreateIndex
CREATE INDEX "Consentement_candidatId_idx" ON "Consentement"("candidatId");

-- CreateIndex
CREATE INDEX "Consentement_organismeId_idx" ON "Consentement"("organismeId");

-- CreateIndex
CREATE INDEX "DataRequest_organismeId_idx" ON "DataRequest"("organismeId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organismeId_idx" ON "AuditLog"("organismeId");

-- CreateIndex
CREATE INDEX "Cours_academy_idx" ON "Cours"("academy");

-- CreateIndex
CREATE INDEX "Cours_formationId_idx" ON "Cours"("formationId");

-- CreateIndex
CREATE INDEX "Cours_organismeId_idx" ON "Cours"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "Cours_organismeId_slug_key" ON "Cours"("organismeId", "slug");

-- CreateIndex
CREATE INDEX "CoursModule_coursId_idx" ON "CoursModule"("coursId");

-- CreateIndex
CREATE INDEX "CoursModule_organismeId_idx" ON "CoursModule"("organismeId");

-- CreateIndex
CREATE INDEX "Lecon_moduleId_idx" ON "Lecon"("moduleId");

-- CreateIndex
CREATE INDEX "Lecon_organismeId_idx" ON "Lecon"("organismeId");

-- CreateIndex
CREATE INDEX "ProgressionLecon_apprenantId_idx" ON "ProgressionLecon"("apprenantId");

-- CreateIndex
CREATE INDEX "ProgressionLecon_organismeId_idx" ON "ProgressionLecon"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionLecon_apprenantId_leconId_key" ON "ProgressionLecon"("apprenantId", "leconId");

-- CreateIndex
CREATE INDEX "QuizResultat_apprenantId_idx" ON "QuizResultat"("apprenantId");

-- CreateIndex
CREATE INDEX "QuizResultat_organismeId_idx" ON "QuizResultat"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResultat_apprenantId_leconId_key" ON "QuizResultat"("apprenantId", "leconId");

-- CreateIndex
CREATE INDEX "CoursApprenant_apprenantId_idx" ON "CoursApprenant"("apprenantId");

-- CreateIndex
CREATE INDEX "CoursApprenant_coursId_idx" ON "CoursApprenant"("coursId");

-- CreateIndex
CREATE INDEX "CoursApprenant_organismeId_idx" ON "CoursApprenant"("organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursApprenant_coursId_apprenantId_key" ON "CoursApprenant"("coursId", "apprenantId");

-- CreateIndex
CREATE INDEX "Reclamation_statut_idx" ON "Reclamation"("statut");

-- CreateIndex
CREATE INDEX "Reclamation_organismeId_idx" ON "Reclamation"("organismeId");

-- CreateIndex
CREATE INDEX "VeilleEntree_type_idx" ON "VeilleEntree"("type");

-- CreateIndex
CREATE INDEX "VeilleEntree_organismeId_idx" ON "VeilleEntree"("organismeId");

-- CreateIndex
CREATE INDEX "Partenaire_organismeId_idx" ON "Partenaire"("organismeId");

-- CreateIndex
CREATE INDEX "SupportTicket_organismeId_idx" ON "SupportTicket"("organismeId");

-- CreateIndex
CREATE INDEX "SupportTicket_statut_idx" ON "SupportTicket"("statut");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "Lead_statut_idx" ON "Lead"("statut");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTarif_formule_key" ON "PlanTarif"("formule");

-- CreateIndex
CREATE INDEX "_SessionFormateurs_B_index" ON "_SessionFormateurs"("B");

-- CreateIndex
CREATE INDEX "_FormateurToFormation_B_index" ON "_FormateurToFormation"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "Organisme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_formationSouhaiteeId_fkey" FOREIGN KEY ("formationSouhaiteeId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidat" ADD CONSTRAINT "Candidat_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatInteraction" ADD CONSTRAINT "CandidatInteraction_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatInteraction" ADD CONSTRAINT "CandidatInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PieceJointe" ADD CONSTRAINT "PieceJointe_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_salleId_fkey" FOREIGN KEY ("salleId") REFERENCES "Salle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "EmargementSignature" ADD CONSTRAINT "EmargementSignature_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_enregistreParId_fkey" FOREIGN KEY ("enregistreParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureFormateur" ADD CONSTRAINT "FactureFormateur_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactureFormateur" ADD CONSTRAINT "FactureFormateur_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilite" ADD CONSTRAINT "Disponibilite_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "Candidat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_formateurId_fkey" FOREIGN KEY ("formateurId") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "Cours" ADD CONSTRAINT "Cours_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursModule" ADD CONSTRAINT "CoursModule_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lecon" ADD CONSTRAINT "Lecon_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CoursModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionLecon" ADD CONSTRAINT "ProgressionLecon_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionLecon" ADD CONSTRAINT "ProgressionLecon_leconId_fkey" FOREIGN KEY ("leconId") REFERENCES "Lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResultat" ADD CONSTRAINT "QuizResultat_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResultat" ADD CONSTRAINT "QuizResultat_leconId_fkey" FOREIGN KEY ("leconId") REFERENCES "Lecon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursApprenant" ADD CONSTRAINT "CoursApprenant_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursApprenant" ADD CONSTRAINT "CoursApprenant_apprenantId_fkey" FOREIGN KEY ("apprenantId") REFERENCES "Apprenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "Organisme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionFormateurs" ADD CONSTRAINT "_SessionFormateurs_A_fkey" FOREIGN KEY ("A") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SessionFormateurs" ADD CONSTRAINT "_SessionFormateurs_B_fkey" FOREIGN KEY ("B") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormateurToFormation" ADD CONSTRAINT "_FormateurToFormation_A_fkey" FOREIGN KEY ("A") REFERENCES "Formateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormateurToFormation" ADD CONSTRAINT "_FormateurToFormation_B_fkey" FOREIGN KEY ("B") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

