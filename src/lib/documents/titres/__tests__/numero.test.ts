import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const nextSequence = vi.fn();
vi.mock("@/lib/numerotation", () => ({ nextSequence: (o: string, c: string) => nextSequence(o, c) }));
const ensureOfCode = vi.fn();
vi.mock("@/lib/documents/titres/of-code", () => ({ ensureOfCode: (o: string) => ensureOfCode(o) }));

import { genNumeroTitre, checkLuhn } from "@/lib/documents/titres/numero";
import type { TitreTypeDef } from "@/lib/documents/titres/catalog";

const attestation = (numberPrefix: string) =>
  ({ code: "X", kind: "attestation", numberPrefix, appliqueLuhn: true }) as unknown as TitreTypeDef;
const diplome = () => ({ code: "SSIAP1_DIPLOME", kind: "diplome", niveau: 1 }) as unknown as TitreTypeDef;

describe("genNumeroTitre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextSequence.mockResolvedValue(1);
    ensureOfCode.mockResolvedValue("K7M2Q4");
  });

  it("attestation → CODE_OF-PRÉFIXE-ANNÉE-SEQ-CLÉ, code OF en tête, Luhn valide", async () => {
    const n = await genNumeroTitre("org1", attestation("RECYC-SSIAP1"), { year: 2026 });
    expect(n).toMatch(/^K7M2Q4-RECYC-SSIAP1-2026-00001-\d$/);
    expect(checkLuhn(n)).toBe(true);
    expect(ensureOfCode).toHaveBeenCalledWith("org1");
  });

  it("diplôme SSIAP → numéro préfectoral OFFICIEL, PAS de code OF", async () => {
    const n = await genNumeroTitre("org1", diplome(), { year: 2026, ssiap: { departement: "93", agrement: "0042" } });
    expect(n).toBe("093-0042-1-2026-00001");
    expect(ensureOfCode).not.toHaveBeenCalled();
  });

  it("la clé de Luhn couvre le code OF → détecte une falsification d'un chiffre", async () => {
    const n = await genNumeroTitre("org1", attestation("FC-VTC"), { year: 2026 });
    expect(checkLuhn(n)).toBe(true);
    const falsifie = n.replace("00001", "00002"); // altère la séquence
    expect(checkLuhn(falsifie)).toBe(false);
  });

  it("deux OF différents → préfixes différents (unicité globale)", async () => {
    ensureOfCode.mockResolvedValueOnce("AAA111");
    const n1 = await genNumeroTitre("orgA", attestation("RECYC-SSIAP1"), { year: 2026 });
    ensureOfCode.mockResolvedValueOnce("BBB222");
    const n2 = await genNumeroTitre("orgB", attestation("RECYC-SSIAP1"), { year: 2026 });
    expect(n1.startsWith("AAA111-")).toBe(true);
    expect(n2.startsWith("BBB222-")).toBe(true);
    expect(n1).not.toBe(n2);
  });
});
