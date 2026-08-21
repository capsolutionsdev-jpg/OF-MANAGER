import { describe, it, expect } from "vitest";
import { estimateClientCost, marge, COUT_INFRA_FIXE_EUR } from "@/lib/couts";

describe("estimateClientCost()", () => {
  it("client sans conso = part d'infra fixe seule", () => {
    expect(estimateClientCost({ emails: 0, inscriptions: 0, sms: 0 }).total).toBe(COUT_INFRA_FIXE_EUR);
  });
  it("ventile e-mails / inscriptions / SMS", () => {
    const c = estimateClientCost({ emails: 3000, inscriptions: 100, sms: 200 });
    expect(c.emailsEur).toBe(3); // 3000 × 0,001
    expect(c.inscriptionsEur).toBe(2); // 100 × 0,02
    expect(c.smsEur).toBe(9); // 200 × 0,045
    expect(c.total).toBe(3 + 2 + 9 + COUT_INFRA_FIXE_EUR);
  });
});

describe("marge()", () => {
  it("calcule € et %", () => {
    const m = marge(349, 11);
    expect(m.euros).toBe(338);
    expect(m.pct).toBe(97);
  });
  it("revenu nul → marge % = 0", () => {
    expect(marge(0, 5).pct).toBe(0);
  });
});
