import { describe, it, expect } from "vitest";
import { computeValidation } from "@/lib/validation/engine";
import type { SessionSnapshot, CandidateSnapshot } from "@/lib/validation/config";
import type { ManualMark } from "@/lib/validation/types";

const mark: ManualMark = { nom: "Testeur", date: new Date().toISOString() };

function candidate(over: Partial<CandidateSnapshot> = {}): CandidateSnapshot {
  return {
    inscriptionId: "i1",
    candidatId: "c1",
    name: "Jean Dupont",
    signed: true,
    piecesRecues: [],
    satisfactionCompleted: true,
    satisfactionSent: true,
    ...over,
  };
}

function snapshot(over: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: "s1",
    isArchived: false,
    hasFormateur: false,
    contratFormateurToken: null,
    contratFormateurSentAt: null,
    contratFormateurSignedAt: null,
    crFormateurToken: null,
    crFormateurSentAt: null,
    crFormateurCompletedAt: null,
    emargement: [],
    piecesAttendues: [],
    candidates: [candidate()],
    manualMarks: {},
    ...over,
  };
}

// Marques manuelles couvrant les 4 documents de session (émargement, programme,
// convention, satisfaction) — nécessaires pour valider la section session.
const SESSION_MARKS: Record<string, ManualMark> = {
  SESSION_EMARGEMENT: mark,
  SESSION_PROGRAMME: mark,
  SESSION_CONVENTION: mark,
  SESSION_SATISFACTION: mark,
};

describe("computeValidation() — moteur de validation Qualiopi", () => {
  it("une session vide n'est PAS validée (documents session manquants)", () => {
    const st = computeValidation(snapshot());
    expect(st.isValidated).toBe(false);
    expect(st.percentage).toBeLessThan(100);
  });

  it("session validée ssi TOUS les documents obligatoires sont validés", () => {
    const st = computeValidation(
      snapshot({ manualMarks: SESSION_MARKS, candidates: [candidate({ signed: true })] }),
    );
    // session docs marqués + candidat signé + pas de formateur → tout validé
    expect(st.session.validated).toBe(st.session.total);
    expect(st.candidates[0].compliant).toBe(true);
    expect(st.isValidated).toBe(true);
    expect(st.percentage).toBe(100);
  });

  it("un candidat non signé rend la session non validée (archivage bloqué)", () => {
    const st = computeValidation(
      snapshot({ manualMarks: SESSION_MARKS, candidates: [candidate({ signed: false })] }),
    );
    expect(st.candidates[0].compliant).toBe(false);
    expect(st.isValidated).toBe(false);
  });

  it("signature électronique = validation AUTOMATIQUE", () => {
    const st = computeValidation(snapshot({ manualMarks: SESSION_MARKS }));
    const sign = st.candidates[0].items.find((i) => i.key === "CAND_SIGNATURES");
    expect(sign?.status).toBe("VALIDATED_AUTO");
  });

  it("pièce attendue reçue = validée ; absente = MANQUANT + candidat non conforme", () => {
    const withPiece = computeValidation(
      snapshot({
        manualMarks: SESSION_MARKS,
        piecesAttendues: ["CNI"],
        candidates: [candidate({ signed: true, piecesRecues: ["CNI"] })],
      }),
    );
    expect(withPiece.candidates[0].compliant).toBe(true);

    const missing = computeValidation(
      snapshot({
        manualMarks: SESSION_MARKS,
        piecesAttendues: ["CNI"],
        candidates: [candidate({ signed: true, piecesRecues: [] })],
      }),
    );
    const piece = missing.candidates[0].items.find((i) => i.key === "CAND_PIECE::CNI");
    expect(piece?.status).toBe("MISSING");
    expect(missing.candidates[0].compliant).toBe(false);
    expect(missing.isValidated).toBe(false);
  });

  it("documents formateur pris en compte seulement si un formateur est affecté", () => {
    const sansFormateur = computeValidation(snapshot({ manualMarks: SESSION_MARKS }));
    expect(sansFormateur.trainer.total).toBe(0);

    const avecFormateur = computeValidation(
      snapshot({ manualMarks: SESSION_MARKS, hasFormateur: true }),
    );
    expect(avecFormateur.trainer.total).toBeGreaterThan(0);
    // contrat/CR/émargement formateur non fournis → section non validée
    expect(avecFormateur.isValidated).toBe(false);
  });
});
