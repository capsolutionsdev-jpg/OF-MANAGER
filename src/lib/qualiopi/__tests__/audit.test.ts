import { describe, it, expect } from "vitest";
import { auditSession, type SessionAuditInput, type CheckStatut } from "@/lib/qualiopi/audit";

const day = (n: number) => new Date(2026, 0, 1 + n);
const NOW = day(100);

function base(over: Partial<SessionAuditInput> = {}): SessionAuditInput {
  return {
    now: NOW,
    session: {
      statut: "TERMINEE",
      dateDebut: day(80), dateFin: day(85),
      formateurCount: 1,
      emargementTotal: 4, emargementSignes: 4,
      crFormateurCompletedAt: day(86),
    },
    formation: {
      objectifs: "x", programme: "x", prerequis: "x", publicVise: "x",
      modalitesEvaluation: "x", dureeHeures: 21, tarif: 500, hasPositionnement: true,
    },
    inscriptions: [
      { positionnementCompletedAt: day(80), convocationSentAt: day(79), resultatCertification: "CERTIFIE", attestationReussiteSentAt: day(86), satisfactionCompletedAt: day(86), suivi6moisCompletedAt: null },
    ],
    org: { referentHandicap: true },
    ...over,
  };
}

const statutOf = (r: ReturnType<typeof auditSession>, key: string): CheckStatut =>
  r.checks.find((c) => c.key === key)!.statut;

describe("auditSession — dossier complet (session terminée)", () => {
  it("tout en place → score élevé, statut A_COMPLETER seulement à cause du suivi 6 mois non dû", () => {
    const r = auditSession(base());
    expect(statutOf(r, "fiche")).toBe("OK");
    expect(statutOf(r, "formateur")).toBe("OK");
    expect(statutOf(r, "positionnement")).toBe("OK");
    expect(statutOf(r, "emargement")).toBe("OK");
    expect(statutOf(r, "resultats")).toBe("OK");
    expect(statutOf(r, "attestation")).toBe("OK");
    expect(statutOf(r, "satisfaction")).toBe("OK");
    expect(statutOf(r, "cr_formateur")).toBe("OK");
    // suivi 6 mois pas encore dû (fin il y a 15 jours) → NA, ne pénalise pas
    expect(statutOf(r, "suivi6mois")).toBe("NA");
    expect(r.score).toBe(100);
    expect(r.statutGlobal).toBe("CONFORME");
  });
});

describe("applicabilité selon la phase", () => {
  it("session à venir (amont) → émargement / résultats / satisfaction en NA", () => {
    const r = auditSession(base({
      session: { ...base().session, statut: "PLANIFIEE", dateDebut: day(120), dateFin: day(125), crFormateurCompletedAt: null },
    }));
    expect(statutOf(r, "emargement")).toBe("NA");
    expect(statutOf(r, "resultats")).toBe("NA");
    expect(statutOf(r, "satisfaction")).toBe("NA");
    expect(statutOf(r, "convocation")).toBe("NA");
    // structurels toujours applicables
    expect(statutOf(r, "fiche")).toBe("OK");
    expect(statutOf(r, "formateur")).toBe("OK");
  });

  it("session en cours → émargement applicable, résultats encore NA", () => {
    const r = auditSession(base({
      session: { ...base().session, statut: "EN_COURS", dateDebut: day(98), dateFin: day(102), emargementTotal: 4, emargementSignes: 2, crFormateurCompletedAt: null },
    }));
    expect(statutOf(r, "emargement")).toBe("PARTIEL");
    expect(statutOf(r, "resultats")).toBe("NA");
  });
});

describe("détections de manques", () => {
  it("fiche incomplète → MANQUANT avec la liste des champs", () => {
    const r = auditSession(base({
      formation: { ...base().formation, objectifs: null, tarif: null },
    }));
    const fiche = r.checks.find((c) => c.key === "fiche")!;
    expect(fiche.statut).toBe("MANQUANT");
    expect(fiche.detail).toContain("objectifs");
    expect(fiche.detail).toContain("tarif");
  });

  it("aucun formateur affecté → MANQUANT", () => {
    const r = auditSession(base({ session: { ...base().session, formateurCount: 0 } }));
    expect(statutOf(r, "formateur")).toBe("MANQUANT");
  });

  it("émargement non signé → MANQUANT ; partiellement signé → PARTIEL", () => {
    expect(statutOf(auditSession(base({ session: { ...base().session, emargementTotal: 4, emargementSignes: 0 } })), "emargement")).toBe("MANQUANT");
    expect(statutOf(auditSession(base({ session: { ...base().session, emargementTotal: 4, emargementSignes: 1 } })), "emargement")).toBe("PARTIEL");
  });

  it("aucune feuille d'émargement générée sur session démarrée → MANQUANT", () => {
    expect(statutOf(auditSession(base({ session: { ...base().session, emargementTotal: 0, emargementSignes: 0 } })), "emargement")).toBe("MANQUANT");
  });

  it("résultats partiels sur 2 inscrits → PARTIEL", () => {
    const r = auditSession(base({
      inscriptions: [
        { ...base().inscriptions[0], resultatCertification: "CERTIFIE" },
        { positionnementCompletedAt: null, convocationSentAt: null, resultatCertification: "NON_EVALUE", attestationReussiteSentAt: null, satisfactionCompletedAt: null, suivi6moisCompletedAt: null },
      ],
    }));
    expect(statutOf(r, "resultats")).toBe("PARTIEL");
    expect(r.statutGlobal).toBe("A_COMPLETER");
  });
});

describe("cas particuliers", () => {
  it("formation sans test de positionnement → NA (pas pénalisant)", () => {
    const r = auditSession(base({ formation: { ...base().formation, hasPositionnement: false } }));
    expect(statutOf(r, "positionnement")).toBe("NA");
  });

  it("aucun inscrit certifié → attestation NA", () => {
    const r = auditSession(base({
      inscriptions: [{ ...base().inscriptions[0], resultatCertification: "AJOURNE", attestationReussiteSentAt: null }],
    }));
    expect(statutOf(r, "attestation")).toBe("NA");
  });

  it("référent handicap absent → MANQUANT", () => {
    const r = auditSession(base({ org: { referentHandicap: false } }));
    expect(statutOf(r, "referent_handicap")).toBe("MANQUANT");
  });

  it("suivi à 6 mois dû (fin il y a > 180 j) et non fait → MANQUANT", () => {
    const r = auditSession(base({
      session: { ...base().session, dateDebut: day(-100), dateFin: day(-90) },
    }));
    expect(statutOf(r, "suivi6mois")).toBe("MANQUANT");
  });

  it("session annulée → ignorée (aucun point à compléter)", () => {
    const r = auditSession(base({ session: { ...base().session, statut: "ANNULEE" } }));
    expect(r.statutGlobal).toBe("ANNULEE");
    expect(r.checks).toHaveLength(0);
    expect(r.nbAComplete).toBe(0);
  });
});
