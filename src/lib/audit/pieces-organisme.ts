/**
 * Catalogue des pièces Qualiopi AU NIVEAU DE L'ORGANISME (hors dossiers/sessions),
 * demandées lors d'un contrôle (CDC / audit Qualiopi). Chaque pièce est reliée à
 * son indicateur RNQ. L'état (statut, responsable, date, fichier, observations)
 * est stocké par tenant dans `Organisme.piecesQualiopi` (Json), clé = `cle`.
 *
 * Module pur (importable partout). Append-only : ne pas renuméroter les `cle`.
 */

export type PieceOrganisme = {
  cle: string;
  theme: string;
  label: string;
  indicateur: string; // "Ind. 2", "Ind. 2 et 3", "Tous" ou "—"
};

export type PieceStatut = "A_OBTENIR" | "EN_COURS" | "OBTENU" | "NA";

export type PieceEtat = {
  statut: PieceStatut;
  responsable?: string;
  dateObtention?: string; // yyyy-mm-dd
  nomFichier?: string; // nom / emplacement du fichier déposé
  observations?: string;
  updatedBy?: string;
  updatedAt?: string; // ISO
};

export const PIECE_STATUT_LABEL: Record<PieceStatut, string> = {
  A_OBTENIR: "À obtenir",
  EN_COURS: "En cours",
  OBTENU: "Obtenu",
  NA: "Non applicable",
};

export const PIECES_ORGANISME: PieceOrganisme[] = [
  { cle: "p01", theme: "Régularité légale", label: "Dernier bilan pédagogique et financier (BPF)", indicateur: "Ind. 2" },
  { cle: "p02", theme: "Régularité légale", label: "Liasse fiscale du dernier exercice", indicateur: "—" },
  { cle: "p03", theme: "Régularité légale", label: "Kbis, statuts, n° de déclaration d'activité (NDA)", indicateur: "—" },
  { cle: "p04", theme: "Régularité légale", label: "Certificat Qualiopi en cours de validité + rapport d'audit", indicateur: "Tous" },
  { cle: "p05", theme: "Autorisations", label: "Agrément préfectoral VTC", indicateur: "Ind. 23" },
  { cle: "p06", theme: "Autorisations", label: "Autorisation d'exercice CNAPS (formations sécurité privée)", indicateur: "Ind. 23" },
  { cle: "p07", theme: "Capacités pédagogiques", label: "Programmes détaillés de TOUTES les formations publiées sur EDOF", indicateur: "Ind. 6" },
  { cle: "p08", theme: "Capacités pédagogiques", label: "Supports de formation et modalités de déroulement", indicateur: "Ind. 18" },
  { cle: "p09", theme: "Capacités pédagogiques", label: "Procédure écrite de positionnement / vérification du niveau initial", indicateur: "Ind. 8" },
  { cle: "p10", theme: "Capacités pédagogiques", label: "Modalités d'évaluation des acquis", indicateur: "Ind. 11" },
  { cle: "p11", theme: "Formateurs", label: "CV, diplômes et titres de chaque formateur", indicateur: "Ind. 21" },
  { cle: "p12", theme: "Formateurs", label: "Contrats de travail ou de prestation de chaque formateur", indicateur: "Ind. 21" },
  { cle: "p13", theme: "Formateurs", label: "Plan de développement des compétences des formateurs", indicateur: "Ind. 22" },
  { cle: "p14", theme: "Formateurs", label: "Répartition des stagiaires par formateur, par n° de dossier", indicateur: "Ind. 17" },
  { cle: "p15", theme: "Sous-traitance", label: "Contrats de sous-traitance signés", indicateur: "Ind. 27" },
  { cle: "p16", theme: "Sous-traitance", label: "N° de déclaration d'activité de chaque sous-traitant", indicateur: "Ind. 27" },
  { cle: "p17", theme: "Locaux", label: "Bail ou contrat de domiciliation du site de formation", indicateur: "Ind. 17" },
  { cle: "p18", theme: "Locaux", label: "Factures de location acquittées + preuve de paiement", indicateur: "Ind. 17" },
  { cle: "p19", theme: "Locaux", label: "Plan des locaux et capacité d'accueil par salle", indicateur: "Ind. 17" },
  { cle: "p20", theme: "Certification", label: "Conventions avec les organismes habilités aux épreuves finales", indicateur: "Ind. 3" },
  { cle: "p21", theme: "Certification", label: "Taux d'inscription à la certification et taux de réussite", indicateur: "Ind. 2 et 3" },
  { cle: "p22", theme: "Tarifs", label: "Politique tarifaire écrite et datée, grille par durée et modalité", indicateur: "Ind. 1" },
  { cle: "p23", theme: "Tarifs", label: "Benchmark des tarifs du marché", indicateur: "Ind. 1" },
  { cle: "p24", theme: "Suivi qualité", label: "Procédure de recueil des appréciations + résultats", indicateur: "Ind. 30" },
  { cle: "p25", theme: "Suivi qualité", label: "Registre des réclamations et de leur traitement", indicateur: "Ind. 31" },
  { cle: "p26", theme: "Suivi qualité", label: "Plan d'amélioration continue", indicateur: "Ind. 32" },
  { cle: "p27", theme: "Suivi qualité", label: "Preuves de veille légale et réglementaire", indicateur: "Ind. 23" },
  { cle: "p28", theme: "Suivi qualité", label: "Procédure handicap et référent identifié", indicateur: "Ind. 26" },
  { cle: "p29", theme: "CRM", label: "Accès temporaire au logiciel/CRM à créer pour le contrôleur", indicateur: "Ind. 10" },
];

/** Regroupe le catalogue par thème, en conservant l'ordre. */
export function piecesParTheme(): { theme: string; pieces: PieceOrganisme[] }[] {
  const out: { theme: string; pieces: PieceOrganisme[] }[] = [];
  for (const p of PIECES_ORGANISME) {
    let g = out.find((x) => x.theme === p.theme);
    if (!g) { g = { theme: p.theme, pieces: [] }; out.push(g); }
    g.pieces.push(p);
  }
  return out;
}

/** Synthèse de conformité organisme (une pièce « Non applicable » est neutre). */
export function piecesConformite(etats: Record<string, PieceEtat | undefined>): { total: number; obtenu: number; pct: number } {
  const applicables = PIECES_ORGANISME.filter((p) => etats[p.cle]?.statut !== "NA");
  const obtenu = applicables.filter((p) => etats[p.cle]?.statut === "OBTENU").length;
  return { total: applicables.length, obtenu, pct: applicables.length === 0 ? 100 : Math.round((obtenu / applicables.length) * 100) };
}
