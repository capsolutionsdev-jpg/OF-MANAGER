import type { Candidat, Formation, Inscription, Session } from "@prisma/client";
import { orgConfig } from "@/lib/org-config";
import { MODALITE_LABELS } from "@/lib/validators/formation";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";

export type InscriptionComplete = Inscription & {
  candidat: Candidat;
  session: Session & { formation: Formation };
};

/** Construit la table des variables {{...}} à partir d'une inscription. */
export function buildVariables(i: InscriptionComplete): Record<string, string> {
  const c = i.candidat;
  const s = i.session;
  const f = s.formation;
  const d = (date: Date | null) => (date ? date.toLocaleDateString("fr-FR") : "");
  // Texte long (multi-lignes) → HTML avec retours à la ligne préservés.
  const ml = (t: string | null) => (t ? t.replace(/\n/g, "<br/>") : "—");

  return {
    // Organisme
    organisme: orgConfig.name,
    organisme_representant: orgConfig.representant,
    organisme_siret: orgConfig.siret,
    organisme_nda: orgConfig.nda,
    organisme_adresse: orgConfig.adresse,
    organisme_email: orgConfig.email,
    organisme_telephone: orgConfig.telephone,
    organisme_ville: orgConfig.ville,
    certificateur: orgConfig.certificateur,
    qualiopi: orgConfig.qualiopi,
    // Stagiaire
    nom: c.nom,
    prenom: c.prenom,
    nom_complet: `${c.prenom} ${c.nom}`,
    email: c.email,
    telephone: c.telephone ?? "",
    date_naissance: d(c.dateNaissance),
    lieu_naissance: c.lieuNaissance ?? "—",
    pays_naissance: c.paysNaissance ?? "—",
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
    // Session
    session_reference: s.reference ?? "—",
    date_debut: d(s.dateDebut),
    date_fin: d(s.dateFin),
    horaires: s.horaires ?? "—",
    lieu: s.lieu ?? "—",
    // Divers
    date_jour: new Date().toLocaleDateString("fr-FR"),
  };
}
