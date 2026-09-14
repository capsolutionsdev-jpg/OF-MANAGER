import { describe, it, expect } from "vitest";
import { buildSuivi6MoisEmailContent } from "@/lib/suivi6mois-email";

const baseOpts = {
  organisme: "OF Test",
  representant: "Jean Dupont",
  logoUrl: null,
  orgId: "org1",
  prenom: "Alice",
  titreFormation: "TFP APS",
  lien: "https://app.example/suivi/abc123",
};

describe("buildSuivi6MoisEmailContent", () => {
  it("premier envoi : sujet mentionne la formation, corps contient le lien et le prénom", () => {
    const { subject, html } = buildSuivi6MoisEmailContent({ ...baseOpts, relance: false });
    expect(subject).toContain("TFP APS");
    expect(html).toContain("https://app.example/suivi/abc123");
    expect(html).toContain("Alice");
  });

  it("relance : sujet différent du premier envoi et évoque un rappel", () => {
    const first = buildSuivi6MoisEmailContent({ ...baseOpts, relance: false }).subject;
    const relance = buildSuivi6MoisEmailContent({ ...baseOpts, relance: true }).subject;
    expect(relance).not.toBe(first);
    expect(relance.toLowerCase()).toContain("rappel");
  });

  it("le lien de l'enquête est présent dans un bouton cliquable", () => {
    const { html } = buildSuivi6MoisEmailContent({ ...baseOpts, relance: true });
    expect(html).toContain('href="https://app.example/suivi/abc123"');
  });
});
