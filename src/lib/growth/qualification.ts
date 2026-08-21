// Scoring de QUALIFICATION d'un prospect éditeur (plan de lancement, feuille 6).
//
// Distinct du score d'ENGAGEMENT (comportemental, cf. lib/growth/events.ts).
// Ici : 5 axes déclaratifs. « 3 axes chauds = appel sous 24 h ». PUR + testé.

export type Verticale = "securite" | "transport" | "autre";
export type OutilActuel = "aucun" | "excel" | "concurrent" | "inconnu";
export type EcheanceQualiopi = "moins_6_mois" | "plus_6_mois" | "non_concerne" | "inconnu";

export const VERTICALE_LABELS: Record<Verticale, string> = {
  securite: "Sécurité privée",
  transport: "Transport (Taxi/VTC)",
  autre: "Autre",
};
export const OUTIL_LABELS: Record<OutilActuel, string> = {
  aucun: "Aucun outil",
  excel: "Excel / papier",
  concurrent: "Un concurrent installé",
  inconnu: "Inconnu",
};
export const QUALIOPI_LABELS: Record<EcheanceQualiopi, string> = {
  moins_6_mois: "Audit < 6 mois",
  plus_6_mois: "Audit > 6 mois",
  non_concerne: "Non concerné",
  inconnu: "Inconnu",
};

/** Attributs déclaratifs d'un prospect servant à la qualification. */
export type QualifInput = {
  verticale?: Verticale | null;
  outilActuel?: OutilActuel | null;
  echeanceQualiopi?: EcheanceQualiopi | null;
  volumeStagiairesMois?: number | null;
  malARemplir?: boolean | null; // « dit avoir du mal à remplir ses sessions »
};

export type AxeQualif = { key: string; label: string; chaud: boolean; detail: string };

/** Les 5 axes chaud/froid — PUR. */
export function axesQualification(q: QualifInput): AxeQualif[] {
  const vol = q.volumeStagiairesMois;
  return [
    {
      key: "outil",
      label: "Outil actuel",
      chaud: q.outilActuel === "aucun" || q.outilActuel === "excel",
      detail: q.outilActuel === "aucun" || q.outilActuel === "excel"
        ? "Aucun outil / Excel — terrain vierge"
        : q.outilActuel === "concurrent"
          ? "Concurrent installé — cycle plus long"
          : "À qualifier",
    },
    {
      key: "qualiopi",
      label: "Échéance Qualiopi",
      chaud: q.echeanceQualiopi === "moins_6_mois",
      detail: q.echeanceQualiopi === "moins_6_mois"
        ? "Audit < 6 mois — urgence de conformité"
        : q.echeanceQualiopi === "non_concerne"
          ? "Non concerné"
          : "À qualifier",
    },
    {
      key: "verticale",
      label: "Verticale",
      chaud: q.verticale === "securite" || q.verticale === "transport",
      detail: q.verticale === "securite" || q.verticale === "transport"
        ? "Sécurité / transport — cœur de cible"
        : "Hors cible prioritaire",
    },
    {
      key: "taille",
      label: "Taille",
      chaud: vol != null && vol >= 150 && vol <= 800,
      detail: vol == null
        ? "Volume inconnu"
        : vol >= 150 && vol <= 800
          ? `${vol} stagiaires/mois — sweet spot`
          : vol > 3000
            ? "Très gros volume — cycle long"
            : "Petit volume",
    },
    {
      key: "enjeu",
      label: "Enjeu commercial",
      chaud: q.malARemplir === true,
      detail: q.malARemplir === true
        ? "Peine à remplir ses sessions — a besoin d'acquisition"
        : q.malARemplir === false
          ? "Carnet plein"
          : "À qualifier",
    },
  ];
}

/** Nombre d'axes chauds — PUR. */
export function chaudCount(q: QualifInput): number {
  return axesQualification(q).filter((a) => a.chaud).length;
}

/** Seuil « appel sous 24 h » : au moins 3 axes chauds — PUR. */
export const SEUIL_APPEL_URGENT = 3;
export function appelUrgent(q: QualifInput): boolean {
  return chaudCount(q) >= SEUIL_APPEL_URGENT;
}

/** Température synthétique — PUR. */
export function temperature(q: QualifInput): "chaud" | "tiede" | "froid" {
  const n = chaudCount(q);
  if (n >= SEUIL_APPEL_URGENT) return "chaud";
  if (n >= 1) return "tiede";
  return "froid";
}
