import { describe, it, expect } from "vitest";
import { isDocApplicable, PRESIGN_DOC_TYPES, type DocContext } from "@/lib/documents/families";

// Éligibilité des documents selon l'inscription (particulier/entreprise, examen,
// financement). Garde-fou : le dossier ne doit plus générer tout le catalogue.
describe("isDocApplicable — documents selon l'inscription", () => {
  const particulierExamen: DocContext = {
    formation: { reference: "SSIAP1", titre: "SSIAP 1 initial", examen: true },
    hasEntreprise: false,
    financementType: "CPF",
  };
  const entrepriseRecyclageOpco: DocContext = {
    formation: { reference: "SSIAP2-REC", titre: "SSIAP 2 recyclage", examen: false },
    hasEntreprise: true,
    financementType: "OPCO",
  };

  it("particulier → contrat, pas de convention", () => {
    expect(isDocApplicable("CONTRAT_FORMATION", particulierExamen)).toBe(true);
    expect(isDocApplicable("CONVENTION_FORMATION", particulierExamen)).toBe(false);
    expect(isDocApplicable("CONVENTION_ENTREPRISE", particulierExamen)).toBe(false);
  });

  it("entreprise → convention, pas de contrat", () => {
    expect(isDocApplicable("CONTRAT_FORMATION", entrepriseRecyclageOpco)).toBe(false);
    expect(isDocApplicable("CONVENTION_FORMATION", entrepriseRecyclageOpco)).toBe(true);
  });

  it("convocation d'examen seulement si la formation a un examen", () => {
    expect(isDocApplicable("CONVOCATION_EXAMEN", particulierExamen)).toBe(true);
    expect(isDocApplicable("CONVOCATION_EXAMEN", entrepriseRecyclageOpco)).toBe(false);
  });

  it("satisfaction entreprise/OPCO seulement si concerné", () => {
    expect(isDocApplicable("SATISFACTION_ENTREPRISE", particulierExamen)).toBe(false);
    expect(isDocApplicable("SATISFACTION_OPCO", particulierExamen)).toBe(false);
    expect(isDocApplicable("SATISFACTION_ENTREPRISE", entrepriseRecyclageOpco)).toBe(true);
    expect(isDocApplicable("SATISFACTION_OPCO", entrepriseRecyclageOpco)).toBe(true);
  });

  it("attestations recyclage/RAN et remise des supports jamais dans le dossier", () => {
    for (const ctx of [particulierExamen, entrepriseRecyclageOpco]) {
      expect(isDocApplicable("ATTESTATION_RECYCLAGE", ctx)).toBe(false);
      expect(isDocApplicable("ATTESTATION_REMISE_NIVEAU", ctx)).toBe(false);
      expect(isDocApplicable("REMISE_SUPPORTS", ctx)).toBe(false);
    }
  });

  it("documents communs toujours inclus", () => {
    for (const t of ["FICHE_INSCRIPTION", "CONVOCATION", "REGLEMENT_INTERIEUR", "ATTESTATION_FIN"]) {
      expect(isDocApplicable(t, particulierExamen)).toBe(true);
    }
  });

  // BUG-006 : c'est le FINANCEMENT qui décide contrat/convention, pas le seul
  // rattachement à une entreprise.
  it("salarié rattaché à une entreprise mais financé en CPF → contrat (pas convention)", () => {
    const salarieCpf: DocContext = {
      formation: { reference: "SST", titre: "SST", examen: false },
      hasEntreprise: true,
      financementType: "CPF",
    };
    expect(isDocApplicable("CONTRAT_FORMATION", salarieCpf)).toBe(true);
    expect(isDocApplicable("CONVENTION_FORMATION", salarieCpf)).toBe(false);
  });

  it("financement ENTREPRISE → convention même sans rattachement explicite", () => {
    const finEntreprise: DocContext = {
      formation: { reference: "SST", titre: "SST", examen: false },
      hasEntreprise: false,
      financementType: "ENTREPRISE",
    };
    expect(isDocApplicable("CONVENTION_FORMATION", finEntreprise)).toBe(true);
    expect(isDocApplicable("CONTRAT_FORMATION", finEntreprise)).toBe(false);
  });

  it("financement non renseigné → repli sur le rattachement entreprise", () => {
    const base = { formation: { reference: "SST", titre: "SST", examen: false } };
    expect(isDocApplicable("CONTRAT_FORMATION", { ...base, hasEntreprise: false, financementType: null })).toBe(true);
    expect(isDocApplicable("CONVENTION_FORMATION", { ...base, hasEntreprise: true, financementType: null })).toBe(true);
  });

  // #10 : le PDF post-signature (buildInscriptionPdf { signedOnly }) ne joint que
  // les documents À SIGNER *applicables* — donc contrat XOR convention selon le
  // profil, jamais les deux. On vérifie l'intersection SIGNED_DOC_TYPES ∩ applicable.
  it("sous-ensemble « documents signés » : particulier → contrat sans convention ; pro → convention sans contrat (#10)", () => {
    const SIGNES = ["FICHE_INSCRIPTION", "CONTRAT_FORMATION", "CONVENTION_FORMATION", "REGLEMENT_INTERIEUR"];
    const signesPour = (ctx: DocContext) => SIGNES.filter((t) => isDocApplicable(t, ctx));

    expect(signesPour(particulierExamen)).toContain("CONTRAT_FORMATION");
    expect(signesPour(particulierExamen)).not.toContain("CONVENTION_FORMATION");

    expect(signesPour(entrepriseRecyclageOpco)).toContain("CONVENTION_FORMATION");
    expect(signesPour(entrepriseRecyclageOpco)).not.toContain("CONTRAT_FORMATION");

    // Les communs (fiche + règlement) restent toujours présents dans le dossier signé.
    for (const ctx of [particulierExamen, entrepriseRecyclageOpco]) {
      expect(signesPour(ctx)).toEqual(
        expect.arrayContaining(["FICHE_INSCRIPTION", "REGLEMENT_INTERIEUR"]),
      );
    }
  });

  // BUG GRAVE : avant signature, le candidat ne doit consulter QUE les documents
  // contractuels (fiche, contrat XOR convention, CGV, règlement, programme) — jamais
  // d'attestation de réussite/entrée/fin ni de certificat (la formation n'a pas eu lieu).
  it("sous-ensemble « à consulter avant signature » : les 5 docs, jamais d'attestation", () => {
    const presignPour = (ctx: DocContext) =>
      PRESIGN_DOC_TYPES.filter((t) => isDocApplicable(t, ctx)).sort();

    expect(presignPour(particulierExamen)).toEqual(
      ["CONDITIONS_GENERALES", "CONTRAT_FORMATION", "FICHE_INSCRIPTION", "PROGRAMME", "REGLEMENT_INTERIEUR"].sort(),
    );
    expect(presignPour(entrepriseRecyclageOpco)).toEqual(
      ["CONDITIONS_GENERALES", "CONVENTION_FORMATION", "FICHE_INSCRIPTION", "PROGRAMME", "REGLEMENT_INTERIEUR"].sort(),
    );

    // L'ensemble de consultation ne contient JAMAIS d'attestation / certificat / convocation.
    for (const forbidden of [
      "ATTESTATION_REUSSITE",
      "ATTESTATION_ENTREE",
      "ATTESTATION_FIN",
      "CERTIFICAT_REALISATION",
      "CONVOCATION",
      "CONVOCATION_EXAMEN",
    ]) {
      expect(PRESIGN_DOC_TYPES).not.toContain(forbidden);
    }
  });
});
