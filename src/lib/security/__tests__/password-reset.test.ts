import { describe, it, expect } from "vitest";
import {
  RESET_TTL_MINUTES,
  hashResetToken,
  generateResetToken,
  resetTokenExpired,
  normalizeEmail,
  resetEligible,
} from "@/lib/security/password-reset";

describe("password-reset — cœur cryptographique (pur, sans base)", () => {
  it("expose un TTL court (60 min) — fenêtre d'exploitation réduite", () => {
    expect(RESET_TTL_MINUTES).toBe(60);
  });

  describe("hashResetToken", () => {
    it("renvoie un SHA-256 hexadécimal (64 caractères minuscules)", () => {
      const h = hashResetToken("mon-jeton-brut");
      expect(h).toMatch(/^[0-9a-f]{64}$/);
    });
    it("est déterministe (même entrée → même empreinte)", () => {
      expect(hashResetToken("abc")).toBe(hashResetToken("abc"));
    });
    it("deux jetons différents → empreintes différentes", () => {
      expect(hashResetToken("abc")).not.toBe(hashResetToken("abd"));
    });
  });

  describe("generateResetToken", () => {
    it("produit un jeton URL-safe à forte entropie (≥ 43 caractères = 256 bits)", () => {
      const { token } = generateResetToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThanOrEqual(43);
    });
    it("stocke l'EMPREINTE du jeton, jamais le jeton en clair", () => {
      const { token, tokenHash } = generateResetToken();
      // La base ne connaît que le hash ; on retrouve l'utilisateur en re-hachant
      // le jeton reçu dans l'URL. Une fuite de base ne permet pas de forger un lien.
      expect(tokenHash).toBe(hashResetToken(token));
      expect(tokenHash).not.toBe(token);
    });
    it("fixe l'expiration à now + 60 min", () => {
      const now = 1_700_000_000_000;
      const { expiry } = generateResetToken(now);
      expect(expiry.getTime()).toBe(now + 60 * 60 * 1000);
    });
    it("génère un jeton unique à chaque appel (aléatoire)", () => {
      expect(generateResetToken().token).not.toBe(generateResetToken().token);
    });
  });

  describe("resetTokenExpired", () => {
    const now = new Date("2026-09-02T12:00:00Z").getTime();
    it("expiry nul → expiré (jeton absent ou déjà consommé)", () => {
      expect(resetTokenExpired(null, now)).toBe(true);
    });
    it("expiry futur → non expiré", () => {
      expect(resetTokenExpired(new Date(now + 1000), now)).toBe(false);
    });
    it("expiry passé → expiré", () => {
      expect(resetTokenExpired(new Date(now - 1000), now)).toBe(true);
    });
  });

  describe("normalizeEmail", () => {
    it("supprime les espaces et met en minuscules (recherche insensible à la casse)", () => {
      expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
    });
  });

  describe("resetEligible — qui a le droit de recevoir un lien de réinit", () => {
    it("compte actif d'un organisme non suspendu → éligible", () => {
      expect(resetEligible({ isActive: true, organismeStatut: "ACTIF" })).toBe(true);
    });
    it("SUPERADMIN (sans organisme) → éligible", () => {
      expect(resetEligible({ isActive: true, organismeStatut: null })).toBe(true);
    });
    it("compte désactivé → NON éligible (aligné sur la porte du login)", () => {
      expect(resetEligible({ isActive: false, organismeStatut: "ACTIF" })).toBe(false);
    });
    it("organisme SUSPENDU → NON éligible (tout le tenant est coupé)", () => {
      expect(resetEligible({ isActive: true, organismeStatut: "SUSPENDU" })).toBe(false);
    });
  });
});
