import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { buildProformaPdf } from "@/lib/factures/proforma-pdf";
import { buildSessionProformas } from "@/lib/factures/proforma";
import { DEFAULT_ORG_IDENTITY } from "@/lib/org-identity";

// Rendu réel via Chromium (puppeteer local, ~3 s). Conditionné à PROFORMA_OUT pour
// ne PAS lancer Chromium dans la CI — les tests de logique pure (proforma.test.ts)
// couvrent la partie critique et tournent toujours.
//   PROFORMA_OUT=/chemin/sample.pdf npx vitest run …proforma-pdf.render.test.ts
describe.skipIf(!process.env.PROFORMA_OUT)("buildProformaPdf — rendu réel", () => {
  it("produit un PDF valide (%PDF-) pour une proforma B2B groupée", async () => {
    const [cible] = buildSessionProformas({
      designation: "SSIAP 1 (du 12/03 au 16/03)",
      assujettiTva: false, // OF non assujetti → exonération art. 261-4-4°
      inscriptions: [
        { inscriptionId: "i1", candidatNom: "Jean Dupont", candidatEmail: null, montant: 520, facturesTtc: 0, entrepriseId: "e1", entrepriseNom: "ACME Sécurité", entrepriseSiret: "12345678900012", entrepriseEmail: "rh@acme.fr", conventionId: "c1", conventionRef: "CONV-2026-018" },
        { inscriptionId: "i2", candidatNom: "Marie Martin", candidatEmail: null, montant: 520, facturesTtc: 0, entrepriseId: "e1", entrepriseNom: "ACME Sécurité", entrepriseSiret: "12345678900012", entrepriseEmail: "rh@acme.fr", conventionId: "c1", conventionRef: "CONV-2026-018" },
      ],
    });

    const { data, filename } = await buildProformaPdf(cible, DEFAULT_ORG_IDENTITY, {
      numero: "PROFORMA-2026-SSIAP1-c1",
      dateEmission: new Date(2026, 7, 30),
      sessionRef: "SSIAP1",
    });

    expect(new TextDecoder().decode(data.slice(0, 5))).toBe("%PDF-");
    expect(filename).toContain("proforma-");
    if (process.env.PROFORMA_OUT) fs.writeFileSync(process.env.PROFORMA_OUT, Buffer.from(data));
  }, 60_000);
});
