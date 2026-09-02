/**
 * Date « Fait le » ({{date_jour}}) PROPRE À CHAQUE TYPE de document, alignée sur
 * la chronologie réelle de la formation (règle métier ASPR/CDC, valable pour
 * tous les tenants) :
 *
 *  - Fiche d'expression du besoin ............ date d'ouverture du dossier CPF
 *    (= dateInscription tant qu'une date d'ouverture distincte n'est pas fournie)
 *  - Fiche d'inscription, convocations, contrat, CGV, règlement intérieur
 *    ........................................ date d'inscription (dossier accepté)
 *  - Test de positionnement, attestation d'entrée ..... 1er jour de formation
 *  - Enquête de satisfaction stagiaire, évaluation des acquis ... dernier jour
 *  - Attestation de fin, certificat de réalisation .... lendemain du dernier jour
 *  - Attestation de réussite .................. date d'examen (repli : dernier jour)
 *
 * Les types non listés gardent le comportement par défaut (date d'inscription).
 * Module pur — la date de SIGNATURE électronique reste, elle, la vraie date de
 * l'acte (aucun antidatage de signature).
 */

type SessionDates = { dateDebut: Date; dateFin: Date; dateExamen: Date | null };

const d = (x: Date) => x.toLocaleDateString("fr-FR");
const addJours = (x: Date, n: number) => new Date(x.getTime() + n * 86_400_000);

/**
 * Renvoie la date « Fait le » (formatée fr-FR) pour un type de document,
 * ou null pour laisser la valeur par défaut (date d'inscription).
 */
export function dateJourPourDoc(type: string, session: SessionDates): string | null {
  switch (type) {
    case "TEST_POSITIONNEMENT":
    case "ATTESTATION_ENTREE":
      return d(session.dateDebut);
    case "SATISFACTION_STAGIAIRE":
    case "EVALUATION_ACQUIS":
      return d(session.dateFin);
    case "ATTESTATION_FIN":
    case "CERTIFICAT_REALISATION":
    case "ATTESTATION_RECYCLAGE":
    case "ATTESTATION_REMISE_NIVEAU":
      return d(addJours(session.dateFin, 1));
    case "ATTESTATION_REUSSITE":
      return d(session.dateExamen ?? session.dateFin);
    default:
      return null; // fiche besoin, inscription, convocations, contrat, CGV, RI… → date d'inscription
  }
}
