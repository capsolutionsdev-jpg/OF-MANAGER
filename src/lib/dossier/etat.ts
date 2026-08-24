// Dossier administratif — logique PURE de fusion, bâtie sur l'existant
// (Formation.piecesAttendues × PieceJointe du candidat × Inscription.piecesRecues).
// Une pièce dont le libellé contient « (facultative) » est optionnelle. PUR + testé.

export type PieceAttendue = { libelle: string; obligatoire: boolean };

export function parsePiecesAttendues(pieces: string[] | null | undefined): PieceAttendue[] {
  return (pieces ?? []).map((p) => ({ libelle: p, obligatoire: !/\(facultati(f|ve)s?\)/i.test(p) }));
}

/** Une PieceJointe déposée (sous-ensemble utile), indexée par son libellé (label). */
export type PieceDeposee = {
  id: string;
  label: string;
  url: string;
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  motifRefus: string | null;
};

export type PieceEtat = {
  libelle: string;
  obligatoire: boolean;
  statut: "A_FOURNIR" | "EN_ATTENTE" | "VALIDEE" | "REFUSEE";
  pieceId: string | null;
  url: string | null;
  motifRefus: string | null;
};

/** État du dossier : chaque pièce attendue + son dépôt éventuel — PUR. */
export function mergeDossier(
  piecesAttendues: string[] | null | undefined,
  deposees: PieceDeposee[],
): PieceEtat[] {
  const parLabel = new Map(deposees.map((d) => [d.label, d]));
  return parsePiecesAttendues(piecesAttendues).map((att) => {
    const dep = parLabel.get(att.libelle);
    return {
      libelle: att.libelle,
      obligatoire: att.obligatoire,
      statut: dep ? dep.statut : "A_FOURNIR",
      pieceId: dep?.id ?? null,
      url: dep?.url ?? null,
      motifRefus: dep?.motifRefus ?? null,
    };
  });
}

export type DossierProgress = {
  total: number;
  obligatoires: number;
  validees: number;
  fournies: number; // déposées (EN_ATTENTE ou VALIDEE)
  refusees: number;
  manquantesObligatoires: number;
  complet: boolean; // toutes les obligatoires validées
  pct: number;
};

/** Avancement sur les pièces OBLIGATOIRES (validées) — PUR. */
export function dossierProgress(etats: PieceEtat[]): DossierProgress {
  const oblig = etats.filter((e) => e.obligatoire);
  const fournie = (e: PieceEtat) => e.statut === "EN_ATTENTE" || e.statut === "VALIDEE";
  const obligValidees = oblig.filter((e) => e.statut === "VALIDEE").length;
  return {
    total: etats.length,
    obligatoires: oblig.length,
    validees: etats.filter((e) => e.statut === "VALIDEE").length,
    fournies: etats.filter(fournie).length,
    refusees: etats.filter((e) => e.statut === "REFUSEE").length,
    manquantesObligatoires: oblig.filter((e) => !fournie(e)).length,
    complet: oblig.length > 0 && obligValidees === oblig.length,
    pct: oblig.length === 0 ? 100 : Math.round((obligValidees / oblig.length) * 100),
  };
}

export function estPieceAttendue(piecesAttendues: string[] | null | undefined, libelle: string): boolean {
  return (piecesAttendues ?? []).includes(libelle);
}
