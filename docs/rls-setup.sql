-- RLS setup (genere par introspection). Rollout coordonne : cf. docs/PHASE3-RESIDUEL.md
-- Etape 1 — role applicatif dedie SANS BYPASSRLS (adapter le mot de passe) :
--   CREATE ROLE app_rls LOGIN PASSWORD 'CHANGE_ME' NOBYPASSRLS;
--   GRANT USAGE ON SCHEMA public TO app_rls;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rls;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rls;
-- Etape 2 — RLS + policy par table tenant (ci-dessous).
-- Etape 3 — app: RLS_ENABLED=true + DATABASE_URL = role app_rls. Le owner garde le BYPASS.

ALTER TABLE "Apprenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Apprenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Apprenant";
CREATE POLICY tenant_isolation ON "Apprenant"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Audit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Audit" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Audit";
CREATE POLICY tenant_isolation ON "Audit"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AuditLog";
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "AutomationSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomationSettings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "AutomationSettings";
CREATE POLICY tenant_isolation ON "AutomationSettings"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Candidat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidat" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Candidat";
CREATE POLICY tenant_isolation ON "Candidat"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "CandidatInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CandidatInteraction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CandidatInteraction";
CREATE POLICY tenant_isolation ON "CandidatInteraction"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Consentement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consentement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Consentement";
CREATE POLICY tenant_isolation ON "Consentement"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Contrat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contrat" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Contrat";
CREATE POLICY tenant_isolation ON "Contrat"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Convention" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Convention" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Convention";
CREATE POLICY tenant_isolation ON "Convention"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Conversation";
CREATE POLICY tenant_isolation ON "Conversation"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Cours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cours" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Cours";
CREATE POLICY tenant_isolation ON "Cours"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "CoursApprenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoursApprenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CoursApprenant";
CREATE POLICY tenant_isolation ON "CoursApprenant"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "CoursModule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CoursModule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CoursModule";
CREATE POLICY tenant_isolation ON "CoursModule"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "CrmInteraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CrmInteraction" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "CrmInteraction";
CREATE POLICY tenant_isolation ON "CrmInteraction"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "DataRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DataRequest";
CREATE POLICY tenant_isolation ON "DataRequest"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Devis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Devis" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Devis";
CREATE POLICY tenant_isolation ON "Devis"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Disponibilite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Disponibilite" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Disponibilite";
CREATE POLICY tenant_isolation ON "Disponibilite"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "DocumentGenere" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentGenere" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DocumentGenere";
CREATE POLICY tenant_isolation ON "DocumentGenere"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "DocumentTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentTemplate" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "DocumentTemplate";
CREATE POLICY tenant_isolation ON "DocumentTemplate"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EmailLog";
CREATE POLICY tenant_isolation ON "EmailLog"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "EmargementSignature" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmargementSignature" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EmargementSignature";
CREATE POLICY tenant_isolation ON "EmargementSignature"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Entreprise" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entreprise" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Entreprise";
CREATE POLICY tenant_isolation ON "Entreprise"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Evaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evaluation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Evaluation";
CREATE POLICY tenant_isolation ON "Evaluation"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "EvaluationResultat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationResultat" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "EvaluationResultat";
CREATE POLICY tenant_isolation ON "EvaluationResultat"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Facture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Facture" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Facture";
CREATE POLICY tenant_isolation ON "Facture"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "FactureFormateur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FactureFormateur" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "FactureFormateur";
CREATE POLICY tenant_isolation ON "FactureFormateur"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Formateur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formateur" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Formateur";
CREATE POLICY tenant_isolation ON "Formateur"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Formation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Formation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Formation";
CREATE POLICY tenant_isolation ON "Formation"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Inscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inscription" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Inscription";
CREATE POLICY tenant_isolation ON "Inscription"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Lecon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lecon" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Lecon";
CREATE POLICY tenant_isolation ON "Lecon"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Message";
CREATE POLICY tenant_isolation ON "Message"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Paiement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Paiement" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Paiement";
CREATE POLICY tenant_isolation ON "Paiement"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Partenaire" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Partenaire" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Partenaire";
CREATE POLICY tenant_isolation ON "Partenaire"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "PieceJointe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PieceJointe" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "PieceJointe";
CREATE POLICY tenant_isolation ON "PieceJointe"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Presence" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Presence";
CREATE POLICY tenant_isolation ON "Presence"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "ProgressionLecon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProgressionLecon" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "ProgressionLecon";
CREATE POLICY tenant_isolation ON "ProgressionLecon"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "QualiopiIndicateur" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QualiopiIndicateur" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QualiopiIndicateur";
CREATE POLICY tenant_isolation ON "QualiopiIndicateur"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "QualiopiPreuve" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QualiopiPreuve" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QualiopiPreuve";
CREATE POLICY tenant_isolation ON "QualiopiPreuve"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "QuizResultat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuizResultat" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "QuizResultat";
CREATE POLICY tenant_isolation ON "QuizResultat"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Reclamation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reclamation" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Reclamation";
CREATE POLICY tenant_isolation ON "Reclamation"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Salle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Salle" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Salle";
CREATE POLICY tenant_isolation ON "Salle"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Seance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Seance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Seance";
CREATE POLICY tenant_isolation ON "Seance"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Session";
CREATE POLICY tenant_isolation ON "Session"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "SignatureRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SignatureRequest" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SignatureRequest";
CREATE POLICY tenant_isolation ON "SignatureRequest"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "SmsLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SmsLog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SmsLog";
CREATE POLICY tenant_isolation ON "SmsLog"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "SupportTicket";
CREATE POLICY tenant_isolation ON "SupportTicket"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "Tache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tache" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Tache";
CREATE POLICY tenant_isolation ON "Tache"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "VeilleEntree" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VeilleEntree" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "VeilleEntree";
CREATE POLICY tenant_isolation ON "VeilleEntree"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

ALTER TABLE "WorkflowRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkflowRule" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "WorkflowRule";
CREATE POLICY tenant_isolation ON "WorkflowRule"
  USING ("organismeId" = current_setting('app.org', true) OR current_setting('app.org', true) = 'BYPASS');

-- 49 tables tenant couvertes : Apprenant, Audit, AuditLog, AutomationSettings, Candidat, CandidatInteraction, Consentement, Contrat, Convention, Conversation, Cours, CoursApprenant, CoursModule, CrmInteraction, DataRequest, Devis, Disponibilite, DocumentGenere, DocumentTemplate, EmailLog, EmargementSignature, Entreprise, Evaluation, EvaluationResultat, Facture, FactureFormateur, Formateur, Formation, Inscription, Lecon, Message, Paiement, Partenaire, PieceJointe, Presence, ProgressionLecon, QualiopiIndicateur, QualiopiPreuve, QuizResultat, Reclamation, Salle, Seance, Session, SignatureRequest, SmsLog, SupportTicket, Tache, VeilleEntree, WorkflowRule
