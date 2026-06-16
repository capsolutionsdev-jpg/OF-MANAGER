import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/sms";

describe("normalizePhone()", () => {
  it("convertit un 06 français en +33", () => {
    expect(normalizePhone("0612345678")).toBe("+33612345678");
  });
  it("ignore les espaces et la ponctuation", () => {
    expect(normalizePhone("06 12 34 56 78")).toBe("+33612345678");
    expect(normalizePhone("06.12.34.56.78")).toBe("+33612345678");
  });
  it("conserve un numéro déjà au format international", () => {
    expect(normalizePhone("+33612345678")).toBe("+33612345678");
  });
  it("convertit le préfixe 0033", () => {
    expect(normalizePhone("0033612345678")).toBe("+33612345678");
  });
  it("retourne null pour une entrée vide", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });
});
