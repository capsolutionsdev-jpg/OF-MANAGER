import { describe, it, expect } from "vitest";
import { buildSuivi6MoisRow, type Suivi6MoisRowInput } from "@/lib/suivi6mois-listing";

const NOW = new Date(2026, 7, 1); // 01/08/2026
const input = (over: Partial<Suivi6MoisRowInput> = {}): Suivi6MoisRowInput => ({
  id: "i1",
  candidatPrenom: "Alice",
  candidatNom: "Martin",
  candidatEmail: "alice@example.com",
  formationTitre: "TFP APS",
  dateFin: new Date(2026, 0, 15), // échéance J+6 = 15/07/2026
  suivi6moisToken: "tok",
  suivi6moisSentAt: null,
  suivi6moisRelanceAt: null,
  suivi6moisRelanceCount: 0,
  suivi6moisCompletedAt: null,
  suivi6moisJson: null,
  ...over,
});

describe("buildSuivi6MoisRow", () => {
  it("mappe le nom, l'échéance J+6 et le statut", () => {
    const row = buildSuivi6MoisRow(input(), NOW);
    expect(row.candidat).toBe("Alice Martin");
    expect(row.echeance).toBe(new Date(2026, 6, 15).toISOString());
    expect(row.statut).toBe("NON_ENVOYE"); // échéance dépassée, jamais envoyé
  });

  it("traduit la situation et les réponses quand l'enquête est faite", () => {
    const row = buildSuivi6MoisRow(
      input({
        suivi6moisSentAt: new Date(2026, 6, 15),
        suivi6moisCompletedAt: new Date(2026, 6, 20),
        suivi6moisJson: {
          situation: "emploi_cdi",
          lienFormation: "oui",
          intitulePoste: "Agent",
          employeur: "SecuCorp",
          apportFormation: 9,
        },
      }),
      NOW,
    );
    expect(row.statut).toBe("FAIT");
    expect(row.situation).toBe("En emploi — CDI");
    expect(row.lienFormation).toBe("Oui, directement en lien");
    expect(row.poste).toBe("Agent");
    expect(row.employeur).toBe("SecuCorp");
    expect(row.apport).toBe("9");
    expect(row.reponduLe).toBe(new Date(2026, 6, 20).toISOString());
  });
});
