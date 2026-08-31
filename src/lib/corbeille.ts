// Types purs de la corbeille (soft-delete, audit A09-003). Séparés des actions
// (un fichier "use server" ne peut exporter que des fonctions async).

export type CorbeilleModele = "candidat" | "session" | "inscription" | "entreprise" | "facture";

export type CorbeilleItem = { id: string; label: string; deletedAt: Date | null };

export const CORBEILLE_TITRES: Record<CorbeilleModele, string> = {
  candidat: "Candidats",
  session: "Sessions",
  inscription: "Inscriptions",
  entreprise: "Entreprises",
  facture: "Factures",
};
