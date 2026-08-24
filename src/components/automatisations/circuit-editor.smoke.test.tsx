import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Coupe la chaîne « use server » (next-auth via requireStaffTenant).
vi.mock("@/lib/actions/circuit-actions", () => ({
  addStep: async () => ({ ok: true }),
  updateStep: async () => {},
  deleteStep: async () => {},
  toggleCircuitActif: async () => {},
  renameCircuit: async () => {},
}));

import { CircuitEditor, type EditorStep } from "@/components/automatisations/circuit-editor";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

const steps: EditorStep[] = [
  { id: "s1", ancre: "DEBUT", offsetJours: -15, audience: "ENTREPRISE", typeAction: "ESIGN", titre: "E-Sign Doc", emailSujet: null, emailCorps: null, documentType: "convention" },
  { id: "s2", ancre: "DEBUT", offsetJours: 0, audience: "APPRENANT", typeAction: "EMAIL", titre: null, emailSujet: "Bienvenue", emailCorps: "Bonjour", documentType: null },
  { id: "s3", ancre: "FIN", offsetJours: 45, audience: "APPRENANT", typeAction: "SATISFACTION", titre: null, emailSujet: null, emailCorps: null, documentType: null },
];

describe("rendu SSR CircuitEditor", () => {
  it("timeline vide", () => {
    expect(() => renderToStaticMarkup(
      <ConfirmProvider><CircuitEditor id="c1" nom="Test" description={null} actif={false} steps={[]} /></ConfirmProvider>,
    )).not.toThrow();
  });
  it("timeline avec étapes (multi-audience, multi-colonnes)", () => {
    const html = renderToStaticMarkup(
      <ConfirmProvider><CircuitEditor id="c1" nom="Parcours" description="desc" actif steps={steps} /></ConfirmProvider>,
    );
    expect(html).toContain("15 jours avant début");
    expect(html).toContain("Jour Début");
    expect(html).toContain("45 jours après fin");
  });
});
