-- ============================================================
-- RLS (Row Level Security) — isolation multi-tenant OFManager
-- GÉNÉRÉ par scripts/gen-rls-sql.mjs — NE PAS ÉDITER À LA MAIN.
-- 63 tables tenant. Colonne de cloisonnement : "organismeId".
--
-- Inerte tant que l'application se connecte avec le rôle PROPRIÉTAIRE des tables
-- (le propriétaire bypasse la RLS). Enforcement réel = rôle non-owner `app_rls`
-- + bascule de DATABASE_URL + RLS_ENABLED=true. Voir docs/RLS-ACTIVATION.md.
-- ============================================================

-- Apprenant
ALTER TABLE "Apprenant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Apprenant";
CREATE POLICY tenant_isolation ON "Apprenant"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Audit
ALTER TABLE "Audit" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Audit";
CREATE POLICY tenant_isolation ON "Audit"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- AuditLog
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- AutomationSettings
ALTER TABLE "AutomationSettings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AutomationSettings";
CREATE POLICY tenant_isolation ON "AutomationSettings"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Candidat
ALTER TABLE "Candidat" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Candidat";
CREATE POLICY tenant_isolation ON "Candidat"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CandidatInteraction
ALTER TABLE "CandidatInteraction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CandidatInteraction";
CREATE POLICY tenant_isolation ON "CandidatInteraction"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicAssessment
ALTER TABLE "CivicAssessment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicAssessment";
CREATE POLICY tenant_isolation ON "CivicAssessment"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicFacture
ALTER TABLE "CivicFacture" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicFacture";
CREATE POLICY tenant_isolation ON "CivicFacture"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicMockExam
ALTER TABLE "CivicMockExam" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicMockExam";
CREATE POLICY tenant_isolation ON "CivicMockExam"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicPaiement
ALTER TABLE "CivicPaiement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicPaiement";
CREATE POLICY tenant_isolation ON "CivicPaiement"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicProgress
ALTER TABLE "CivicProgress" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicProgress";
CREATE POLICY tenant_isolation ON "CivicProgress"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicTarif
ALTER TABLE "CivicTarif" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicTarif";
CREATE POLICY tenant_isolation ON "CivicTarif"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CivicWeakness
ALTER TABLE "CivicWeakness" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CivicWeakness";
CREATE POLICY tenant_isolation ON "CivicWeakness"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Consentement
ALTER TABLE "Consentement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Consentement";
CREATE POLICY tenant_isolation ON "Consentement"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Contrat
ALTER TABLE "Contrat" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Contrat";
CREATE POLICY tenant_isolation ON "Contrat"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Convention
ALTER TABLE "Convention" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Convention";
CREATE POLICY tenant_isolation ON "Convention"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Conversation
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Conversation";
CREATE POLICY tenant_isolation ON "Conversation"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Cours
ALTER TABLE "Cours" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Cours";
CREATE POLICY tenant_isolation ON "Cours"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CoursApprenant
ALTER TABLE "CoursApprenant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CoursApprenant";
CREATE POLICY tenant_isolation ON "CoursApprenant"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CoursModule
ALTER TABLE "CoursModule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CoursModule";
CREATE POLICY tenant_isolation ON "CoursModule"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- CrmInteraction
ALTER TABLE "CrmInteraction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CrmInteraction";
CREATE POLICY tenant_isolation ON "CrmInteraction"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- DataRequest
ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DataRequest";
CREATE POLICY tenant_isolation ON "DataRequest"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- DepenseCentre
ALTER TABLE "DepenseCentre" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DepenseCentre";
CREATE POLICY tenant_isolation ON "DepenseCentre"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Devis
ALTER TABLE "Devis" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Devis";
CREATE POLICY tenant_isolation ON "Devis"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Diplome
ALTER TABLE "Diplome" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Diplome";
CREATE POLICY tenant_isolation ON "Diplome"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Disponibilite
ALTER TABLE "Disponibilite" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Disponibilite";
CREATE POLICY tenant_isolation ON "Disponibilite"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- DocumentGenere
ALTER TABLE "DocumentGenere" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DocumentGenere";
CREATE POLICY tenant_isolation ON "DocumentGenere"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- DocumentTemplate
ALTER TABLE "DocumentTemplate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DocumentTemplate";
CREATE POLICY tenant_isolation ON "DocumentTemplate"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- EmailLog
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EmailLog";
CREATE POLICY tenant_isolation ON "EmailLog"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- EmargementSignature
ALTER TABLE "EmargementSignature" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EmargementSignature";
CREATE POLICY tenant_isolation ON "EmargementSignature"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Entreprise
ALTER TABLE "Entreprise" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Entreprise";
CREATE POLICY tenant_isolation ON "Entreprise"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Evaluation
ALTER TABLE "Evaluation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Evaluation";
CREATE POLICY tenant_isolation ON "Evaluation"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- EvaluationResultat
ALTER TABLE "EvaluationResultat" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EvaluationResultat";
CREATE POLICY tenant_isolation ON "EvaluationResultat"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Facture
ALTER TABLE "Facture" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Facture";
CREATE POLICY tenant_isolation ON "Facture"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- FactureFormateur
ALTER TABLE "FactureFormateur" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "FactureFormateur";
CREATE POLICY tenant_isolation ON "FactureFormateur"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Formateur
ALTER TABLE "Formateur" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Formateur";
CREATE POLICY tenant_isolation ON "Formateur"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Formation
ALTER TABLE "Formation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Formation";
CREATE POLICY tenant_isolation ON "Formation"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Inscription
ALTER TABLE "Inscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Inscription";
CREATE POLICY tenant_isolation ON "Inscription"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Jury
ALTER TABLE "Jury" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Jury";
CREATE POLICY tenant_isolation ON "Jury"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- JuryAffectation
ALTER TABLE "JuryAffectation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "JuryAffectation";
CREATE POLICY tenant_isolation ON "JuryAffectation"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Lecon
ALTER TABLE "Lecon" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Lecon";
CREATE POLICY tenant_isolation ON "Lecon"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Message
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Message";
CREATE POLICY tenant_isolation ON "Message"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- NumeroSequence
ALTER TABLE "NumeroSequence" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "NumeroSequence";
CREATE POLICY tenant_isolation ON "NumeroSequence"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Paiement
ALTER TABLE "Paiement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Paiement";
CREATE POLICY tenant_isolation ON "Paiement"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Partenaire
ALTER TABLE "Partenaire" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Partenaire";
CREATE POLICY tenant_isolation ON "Partenaire"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- PieceJointe
ALTER TABLE "PieceJointe" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PieceJointe";
CREATE POLICY tenant_isolation ON "PieceJointe"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Presence
ALTER TABLE "Presence" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Presence";
CREATE POLICY tenant_isolation ON "Presence"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- ProgressionLecon
ALTER TABLE "ProgressionLecon" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ProgressionLecon";
CREATE POLICY tenant_isolation ON "ProgressionLecon"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- QualiopiIndicateur
ALTER TABLE "QualiopiIndicateur" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QualiopiIndicateur";
CREATE POLICY tenant_isolation ON "QualiopiIndicateur"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- QualiopiPreuve
ALTER TABLE "QualiopiPreuve" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QualiopiPreuve";
CREATE POLICY tenant_isolation ON "QualiopiPreuve"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- QuizResultat
ALTER TABLE "QuizResultat" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QuizResultat";
CREATE POLICY tenant_isolation ON "QuizResultat"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Reclamation
ALTER TABLE "Reclamation" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Reclamation";
CREATE POLICY tenant_isolation ON "Reclamation"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Salle
ALTER TABLE "Salle" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Salle";
CREATE POLICY tenant_isolation ON "Salle"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Seance
ALTER TABLE "Seance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Seance";
CREATE POLICY tenant_isolation ON "Seance"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Session
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Session";
CREATE POLICY tenant_isolation ON "Session"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- SignatureRequest
ALTER TABLE "SignatureRequest" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SignatureRequest";
CREATE POLICY tenant_isolation ON "SignatureRequest"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- SmsLog
ALTER TABLE "SmsLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SmsLog";
CREATE POLICY tenant_isolation ON "SmsLog"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- SupportTicket
ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupportTicket";
CREATE POLICY tenant_isolation ON "SupportTicket"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- Tache
ALTER TABLE "Tache" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Tache";
CREATE POLICY tenant_isolation ON "Tache"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- User
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- ValidationDemande
ALTER TABLE "ValidationDemande" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ValidationDemande";
CREATE POLICY tenant_isolation ON "ValidationDemande"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- VeilleEntree
ALTER TABLE "VeilleEntree" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VeilleEntree";
CREATE POLICY tenant_isolation ON "VeilleEntree"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));

-- WorkflowRule
ALTER TABLE "WorkflowRule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "WorkflowRule";
CREATE POLICY tenant_isolation ON "WorkflowRule"
  USING ("organismeId" = current_setting('app.org', true))
  WITH CHECK ("organismeId" = current_setting('app.org', true));
