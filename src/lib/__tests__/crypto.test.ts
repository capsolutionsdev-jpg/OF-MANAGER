import { describe, it, expect, afterEach } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const KEY = "test-secrets-encryption-key";
afterEach(() => {
  delete process.env.SECRETS_ENCRYPTION_KEY;
});

describe("crypto — secrets au repos", () => {
  it("no-op si aucune clé configurée (dev)", () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    expect(encryptSecret("sk-ant-123")).toBe("sk-ant-123");
  });

  it("chiffre puis déchiffre (roundtrip) avec une clé", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
    const enc = encryptSecret("xkeysib-super-secret");
    expect(enc).not.toBe("xkeysib-super-secret");
    expect(enc?.startsWith("enc:v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe("xkeysib-super-secret");
  });

  it("déchiffre une valeur en clair héritée (migration)", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
    expect(decryptSecret("xkeysib-legacy-plain")).toBe("xkeysib-legacy-plain");
  });

  it("ne re-chiffre pas une valeur déjà chiffrée", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
    const enc = encryptSecret("abc");
    expect(encryptSecret(enc)).toBe(enc);
  });

  it("renvoie null si chiffré mais clé absente (indéchiffrable)", () => {
    process.env.SECRETS_ENCRYPTION_KEY = KEY;
    const enc = encryptSecret("abc")!;
    delete process.env.SECRETS_ENCRYPTION_KEY;
    expect(decryptSecret(enc)).toBeNull();
  });

  it("gère null / vide", () => {
    expect(encryptSecret(null)).toBeNull();
    expect(decryptSecret(null)).toBeNull();
    expect(decryptSecret("")).toBeNull();
  });
});
