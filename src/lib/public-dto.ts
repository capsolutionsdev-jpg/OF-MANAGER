// Contrat des DTO de l'API publique (/api/public/*) — consommés par le site vitrine
// et l'app mobile. Toute évolution est ADDITIVE (A12-014) ; les clés sont verrouillées
// par public-dto.test.ts (retrait/renommage = CI rouge).

export type PublicSessionInput = {
  id: string;
  dateDebut: Date;
  dateFin: Date;
  horaires: string | null;
  lieu: string | null;
  modalite: string | null;
  statut: string;
  nbPlaces: number;
  formation: { titre: string; academy: string | null; reference: string | null };
  inscriptions: { id: string }[];
};

/** Session Prisma → DTO public (lecture seule, sans données personnelles). */
export function toPublicSessionDTO(s: PublicSessionInput) {
  const inscrits = s.inscriptions.length;
  return {
    id: s.id,
    formation: s.formation.titre,
    reference: s.formation.reference,
    academy: s.formation.academy,
    dateDebut: s.dateDebut.toISOString(),
    dateFin: s.dateFin.toISOString(),
    horaires: s.horaires,
    lieu: s.lieu,
    modalite: s.modalite,
    statut: s.statut,
    placesTotal: s.nbPlaces,
    placesRestantes: Math.max(0, s.nbPlaces - inscrits),
  };
}
