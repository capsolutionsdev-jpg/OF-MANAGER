// Constantes partagées pour l'envoi manuel d'automatismes (importables côté
// client). NE PAS mettre dans un fichier "use server" (qui ne peut exporter
// que des fonctions async — sinon le tableau arrive cassé côté client).

export type ManualEvent =
  | "convocation"
  | "attestation_entree"
  | "docs_fin"
  | "positionnement"
  | "satisfaction";

export const MANUAL_EVENTS: { key: ManualEvent; label: string }[] = [
  { key: "convocation", label: "Convocation" },
  { key: "attestation_entree", label: "Attestation d'entrée (PDF)" },
  { key: "docs_fin", label: "Documents de fin (attestation PDF)" },
  { key: "positionnement", label: "Test de positionnement (lien)" },
  { key: "satisfaction", label: "Enquête de satisfaction (lien)" },
];
