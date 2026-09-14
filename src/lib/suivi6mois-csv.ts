// Génération (pure) du CSV de suivi à 6 mois — export pour l'audit Qualiopi.
// Séparateur « ; » + BOM UTF-8 pour une ouverture correcte dans Excel (locale FR).

export type SuiviCsvRow = {
  candidat: string;
  email: string;
  formation: string;
  dateFin: string; // fin de formation (affichée)
  echeance: string; // échéance J+6 (affichée)
  statut: string; // libellé du statut
  envoyeLe: string;
  relanceLe: string;
  relanceCount: number;
  reponduLe: string;
  situation: string; // situation à 6 mois (libellé)
  lienFormation: string;
  poste: string;
  employeur: string;
  apport: string; // apport de la formation (0-10)
};

const HEADERS = [
  "Candidat",
  "E-mail",
  "Formation",
  "Fin de formation",
  "Échéance (J+6)",
  "Statut",
  "Envoyé le",
  "Relancé le",
  "Nb relances",
  "Répondu le",
  "Situation à 6 mois",
  "En lien avec la formation",
  "Poste",
  "Employeur",
  "Apport (0-10)",
];

/** Échappe une valeur CSV : guillemets doublés + encadrement si séparateur/quote/CRLF. */
function esc(v: string | number): string {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Construit le CSV complet (BOM + en-tête + une ligne par inscription). */
export function buildSuivi6MoisCsv(rows: SuiviCsvRow[]): string {
  const lines = [
    HEADERS,
    ...rows.map((r) => [
      r.candidat,
      r.email,
      r.formation,
      r.dateFin,
      r.echeance,
      r.statut,
      r.envoyeLe,
      r.relanceLe,
      r.relanceCount,
      r.reponduLe,
      r.situation,
      r.lienFormation,
      r.poste,
      r.employeur,
      r.apport,
    ]),
  ].map((cols) => cols.map(esc).join(";"));
  return "﻿" + lines.join("\r\n");
}
