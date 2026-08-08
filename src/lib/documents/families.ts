/**
 * Compatibilité document ↔ famille de formation.
 *
 * Certains modèles de `DOCUMENTS` sont SPÉCIFIQUES à une famille de formation
 * (ex. les attestations de recyclage / remise à niveau SSIAP). Sans filtre, ils
 * étaient proposés pour TOUTES les sessions — d'où des documents SSIAP générés
 * sur une session SST. Ce module est la source unique de vérité pour :
 *  - filtrer les menus de documents (UI) ;
 *  - refuser un type incompatible côté route de génération (garde serveur).
 *
 * Par défaut un document est de famille « commun » (valable pour toute formation).
 * Ajouter un document spécifique = une entrée dans `DOC_FAMILY`.
 */

export type DocFamily = "commun" | "ssiap";

export type FormationLike = { reference?: string | null; titre?: string | null };

/** Familles spécifiques (tout ce qui n'est pas listé ici est « commun »). */
export const DOC_FAMILY: Record<string, DocFamily> = {
  ATTESTATION_RECYCLAGE: "ssiap",
  ATTESTATION_REMISE_NIVEAU: "ssiap",
};

/** Famille d'un document (défaut « commun »). */
export function docFamily(type: string): DocFamily {
  return DOC_FAMILY[type] ?? "commun";
}

/** Vrai si la formation relève du domaine SSIAP (initial, recyclage ou RAN). */
export function isSsiapFormation(f: FormationLike): boolean {
  return /ssiap/i.test(`${f.reference ?? ""} ${f.titre ?? ""}`);
}

/** Niveau SSIAP (1/2/3) déduit d'une formation SSIAP, sinon null. */
export function ssiapNiveauOfFormation(f: FormationLike): 1 | 2 | 3 | null {
  const m =
    (f.reference ?? "").match(/SSIAP\s*-?\s*([123])/i) ??
    (f.titre ?? "").match(/SSIAP\s*-?\s*([123])/i);
  return m ? (Number(m[1]) as 1 | 2 | 3) : null;
}

/** Familles de documents autorisées pour une formation (toujours « commun »). */
export function formationDocFamilies(f: FormationLike): Set<DocFamily> {
  const s = new Set<DocFamily>(["commun"]);
  if (isSsiapFormation(f)) s.add("ssiap");
  return s;
}

/** Un type de document est-il pertinent pour cette formation ? */
export function isDocAllowedForFormation(type: string, f: FormationLike): boolean {
  return formationDocFamilies(f).has(docFamily(type));
}

/** Filtre une liste de menu `{ type, label }` selon la formation. */
export function filterDocMenu<T extends { type: string }>(menu: T[], f: FormationLike): T[] {
  const fams = formationDocFamilies(f);
  return menu.filter((d) => fams.has(docFamily(d.type)));
}

// =============================================================
//  ÉLIGIBILITÉ CONTEXTUELLE — quels documents pour CETTE inscription ?
//
//  La liste des documents à générer dépend de l'inscription :
//   - formation initiale AVEC examen → convocation d'examen ; sinon non ;
//   - particulier → contrat de formation ; entreprise → convention ;
//   - satisfaction entreprise / OPCO uniquement si concerné ;
//   - certaines pièces ne sont plus générées ici (voir SESSION_ONLY_DOCS).
//  Source unique de vérité, appliquée au dossier PDF, au ZIP et à l'aperçu.
// =============================================================

export type DocContext = {
  formation: FormationLike & { examen?: boolean | null };
  /** L'inscription est-elle rattachée à une entreprise (B2B) ? */
  hasEntreprise: boolean;
  /** Type de financement de l'inscription (ex. "OPCO"). */
  financementType?: string | null;
};

// Documents retirés de la génération « dossier candidat » : soit gérés ailleurs
// (attestations recyclage/RAN → générées depuis la page session), soit supprimés.
export const SESSION_ONLY_DOCS = new Set<string>([
  "ATTESTATION_RECYCLAGE",
  "ATTESTATION_REMISE_NIVEAU",
  "REMISE_SUPPORTS",
]);

/**
 * Le financement fait-il de l'inscription un dossier B2B (entreprise/OPCO paie) ?
 * C'est le TYPE DE FINANCEMENT qui décide contrat (particulier) vs convention
 * (entreprise), pas seulement le rattachement à une entreprise : un salarié
 * rattaché à une société mais qui finance en propre (CPF, autofinancement,
 * France Travail) relève d'un CONTRAT, pas d'une convention.
 *  - ENTREPRISE / OPCO → B2B (convention)
 *  - CPF / AUTOFINANCEMENT / FRANCE_TRAVAIL → particulier (contrat)
 *  - AUTRE / non renseigné → repli sur le rattachement entreprise (compat historique)
 */
export function isB2BFinancement(c: DocContext): boolean {
  const fin = (c.financementType ?? "").toUpperCase();
  if (fin === "ENTREPRISE" || fin === "OPCO") return true;
  if (fin === "CPF" || fin === "AUTOFINANCEMENT" || fin === "FRANCE_TRAVAIL") return false;
  return c.hasEntreprise;
}

// Conditions d'inclusion des documents SPÉCIFIQUES (absents ici = toujours inclus,
// sous réserve de compatibilité de famille).
const DOC_CONDITIONS: Record<string, (c: DocContext) => boolean> = {
  // Convocation d'examen uniquement si la formation est sanctionnée par un examen
  // (initial), jamais pour un recyclage / une remise à niveau.
  CONVOCATION_EXAMEN: (c) => !!c.formation.examen,
  // Contrat = particulier ; Convention = entreprise (mutuellement exclusifs),
  // déterminé par le TYPE DE FINANCEMENT (cf. isB2BFinancement).
  CONTRAT_FORMATION: (c) => !isB2BFinancement(c),
  CONVENTION_FORMATION: (c) => isB2BFinancement(c),
  CONVENTION_ENTREPRISE: (c) => isB2BFinancement(c),
  // Enquêtes réservées à leur destinataire.
  SATISFACTION_ENTREPRISE: (c) => c.hasEntreprise,
  SATISFACTION_OPCO: (c) => (c.financementType ?? "").toUpperCase() === "OPCO",
};

/** Un document doit-il être généré pour CETTE inscription ? */
export function isDocApplicable(type: string, ctx: DocContext): boolean {
  if (SESSION_ONLY_DOCS.has(type)) return false;
  if (!isDocAllowedForFormation(type, ctx.formation)) return false;
  const cond = DOC_CONDITIONS[type];
  return cond ? cond(ctx) : true;
}

/** Contexte d'éligibilité à partir d'une inscription chargée. */
export function docContextFromInscription(i: {
  financementType?: string | null;
  candidat?: { entreprise?: unknown | null } | null;
  entrepriseId?: string | null;
  session: { formation: FormationLike & { examen?: boolean | null } };
}): DocContext {
  return {
    formation: i.session.formation,
    hasEntreprise: !!i.candidat?.entreprise || !!i.entrepriseId,
    financementType: i.financementType ?? null,
  };
}
