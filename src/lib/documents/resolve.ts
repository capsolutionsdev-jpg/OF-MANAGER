import type { Candidat, Entreprise, Formation, Inscription, Salle, Session } from "@prisma/client";
import { DEFAULT_ORG_IDENTITY, type OrgIdentity } from "@/lib/org-identity";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { ssiapNiveauOfFormation } from "@/lib/documents/families";

// `dossierPdf` (Bytes) est exclu par défaut des requêtes (cf. PRISMA_OMIT) et
// n'est pas utilisé pour construire les documents → on l'ôte du type attendu.
export type InscriptionComplete = Omit<Inscription, "dossierPdf"> & {
  candidat: Candidat & { entreprise?: Entreprise | null };
  session: Session & { formation: Formation; salle?: Salle | null };
};

/**
 * Construit la table des variables {{...}} à partir d'une inscription.
 * `org` = identité de l'organisme (cf. orgConfigFor(i.organismeId)) ; repli sur
 * les valeurs par défaut si non fournie.
 */
export function buildVariables(
  i: InscriptionComplete,
  org: OrgIdentity = DEFAULT_ORG_IDENTITY,
): Record<string, string> {
  const c = i.candidat;
  const s = i.session;
  const f = s.formation;
  const d = (date: Date | null) => (date ? date.toLocaleDateString("fr-FR") : "");
  // Texte long (multi-lignes) → HTML avec retours à la ligne préservés.
  const ml = (t: string | null) => (t ? t.replace(/\n/g, "<br/>") : "—");

  return {
    // Organisme
    organisme: org.name,
    organisme_representant: org.representant,
    organisme_qualite: org.representantQualite,
    organisme_siret: org.siret,
    organisme_nda: org.nda,
    organisme_adresse: org.adresse,
    organisme_email: org.email,
    organisme_telephone: org.telephone,
    organisme_ville: org.ville,
    certificateur: org.certificateur,
    qualiopi: org.qualiopi,
    // Stagiaire
    nom: c.nom,
    prenom: c.prenom,
    nom_complet: `${c.prenom} ${c.nom}`,
    email: c.email,
    telephone: c.telephone ?? "",
    date_naissance: d(c.dateNaissance),
    lieu_naissance: c.lieuNaissance ?? "—",
    departement_naissance: c.departementNaissance ?? "—",
    pays_naissance: c.paysNaissance ?? "—",
    nationalite: c.nationalite ?? "—",
    // Lieu complet : « Commune (75) » ou « Ville, Pays » pour une naissance à l'étranger.
    lieu_naissance_complet:
      [
        c.lieuNaissance,
        c.departementNaissance ? `(${c.departementNaissance})` : null,
        c.paysNaissance && c.paysNaissance !== "France" ? `— ${c.paysNaissance}` : null,
      ]
        .filter(Boolean)
        .join(" ") || "—",
    naissance:
      [d(c.dateNaissance), c.lieuNaissance, c.paysNaissance]
        .filter(Boolean)
        .join(" à ") || "—",
    dernier_diplome: c.dernierDiplome ?? "—",
    source_connaissance: c.sourceConnaissance ?? "—",
    adresse_candidat:
      [c.adresse, c.codePostal, c.ville].filter(Boolean).join(", ") || "—",
    // Formation
    formation: f.titre,
    reference_formation: f.reference,
    certification: f.certification ?? "—",
    duree: f.duree ?? (f.dureeHeures ? `${f.dureeHeures}h` : "—"),
    tarif: f.tarif
      ? `${Number(f.tarif)} € HT`
      : i.montant
        ? `${Number(i.montant)} €`
        : "—",
    modalite: MODALITE_LABELS[f.modalite],
    financement: i.financementType ? FINANCEMENT_LABELS[i.financementType] : "—",
    // Contenu pédagogique détaillé (programme Qualiopi)
    objectifs: ml(f.objectifs),
    programme_detail: ml(f.programme),
    prerequis: ml(f.prerequis),
    public_vise: ml(f.publicVise),
    methodes_pedagogiques: ml(f.methodesPedagogiques),
    modalites_evaluation: ml(f.modalitesEvaluation),
    delai_acces: f.delaiAcces ?? "—",
    // Entreprise cliente (B2B — vide si candidat particulier)
    entreprise_raison_sociale: c.entreprise?.raisonSociale ?? "—",
    entreprise_siret: c.entreprise?.siret ?? "—",
    entreprise_tva: c.entreprise?.numeroTva ?? "—",
    entreprise_adresse:
      [c.entreprise?.adresse, c.entreprise?.codePostal, c.entreprise?.ville]
        .filter(Boolean)
        .join(", ") || "—",
    entreprise_representant: c.entreprise?.representant ?? "—",
    entreprise_fonction: c.entreprise?.fonction ?? "—",
    entreprise_email: c.entreprise?.contactEmail ?? "—",
    entreprise_telephone: c.entreprise?.contactTel ?? "—",
    entreprise_opco: c.entreprise?.opco ?? "—",
    // Session
    session_reference: s.reference ?? "—",
    date_debut: d(s.dateDebut),
    date_fin: d(s.dateFin),
    dates_session:
      s.dateDebut.toDateString() === s.dateFin.toDateString()
        ? `le ${d(s.dateDebut)}`
        : `du ${d(s.dateDebut)} au ${d(s.dateFin)}`,
    horaires: s.horaires ?? "—",
    lieu: s.lieu ?? "—",
    salle: s.salle?.nom ?? "—",
    // Examen : date et lieu dédiés (repli sur la session si non renseignés).
    date_examen: s.dateExamen ? d(s.dateExamen) : d(s.dateFin),
    lieu_examen: s.lieuExamen ?? s.lieu ?? "—",
    // Référent handicap (Qualiopi ind. 26) — figure sur les convocations.
    referent_handicap:
      [org.referentHandicapNom, org.referentHandicapContact].filter(Boolean).join(" — ") ||
      `${org.name} (${org.email})`,
    // Diplôme SSIAP détenu (attestation de recyclage / remise à niveau).
    // Niveau : celui du candidat, sinon déduit de la formation, sinon vide
    // (ne JAMAIS défaulter à « 1 » — sortait un SSIAP 1 sur des formations non SSIAP).
    ssiap_niveau: (c.ssiapNiveau ?? ssiapNiveauOfFormation(f))
      ? String(c.ssiapNiveau ?? ssiapNiveauOfFormation(f))
      : "",
    ssiap_numero: c.ssiapDiplomeNumero ?? "—",
    ssiap_date: d(c.ssiapDiplomeDate),
    // Divers
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };
}
