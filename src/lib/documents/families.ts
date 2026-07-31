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
