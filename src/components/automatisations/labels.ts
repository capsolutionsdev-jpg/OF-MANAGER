// Libellés UI partagés entre la page /automatisations (server) et ses
// composants clients (dialog de création de règle, journal filtrable).

export const TRIGGER_LABELS: Record<string, string> = {
  AVANT_SESSION: "Avant la session",
  DEBUT_SESSION: "Au début de la session",
  PENDANT_SESSION: "Pendant la session",
  FIN_SESSION: "À la fin de la session",
  APRES_SESSION: "Après la session",
};

export const ACTION_LABELS: Record<string, string> = {
  ENVOI_CONVOCATION: "Envoi de la convocation",
  RAPPEL: "Rappel",
  ENVOI_EMARGEMENT: "Envoi de l'émargement",
  ENVOI_ATTESTATION: "Envoi de l'attestation",
  ENVOI_CERTIFICAT: "Envoi du certificat",
  ENVOI_QUESTIONNAIRE_SATISFACTION: "Questionnaire de satisfaction",
  EMAIL_PERSONNALISE: "E-mail personnalisé",
};

export const EMAIL_STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ENVOYE: "Envoyé",
  ECHEC: "Échec",
};
