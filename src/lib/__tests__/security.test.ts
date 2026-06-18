import { describe, it, expect } from "vitest";
import { detectFileType, isRasterImage } from "@/lib/blob";
import { rateLimit, checkLimit } from "@/lib/rate-limit";

// Entêtes (magic bytes) de fichiers réels.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GIF = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const PDF = Buffer.from("%PDF-1.7\n", "ascii");
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "ascii"),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP", "ascii"),
]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', "ascii");
const HTML = Buffer.from("<!DOCTYPE html><script>alert(1)</script>", "ascii");

describe("detectFileType() — validation par octets d'en-tête", () => {
  it("reconnaît les images matricielles et le PDF", () => {
    expect(detectFileType(PNG)).toBe("image/png");
    expect(detectFileType(JPEG)).toBe("image/jpeg");
    expect(detectFileType(GIF)).toBe("image/gif");
    expect(detectFileType(WEBP)).toBe("image/webp");
    expect(detectFileType(PDF)).toBe("application/pdf");
  });

  it("REFUSE le SVG et le HTML (vecteurs XSS) même bien formés", () => {
    expect(detectFileType(SVG)).toBeNull();
    expect(detectFileType(HTML)).toBeNull();
  });

  it("refuse un contenu vide ou trop court", () => {
    expect(detectFileType(Buffer.from([]))).toBeNull();
    expect(detectFileType(Buffer.from([0x89, 0x50]))).toBeNull();
  });
});

describe("isRasterImage()", () => {
  it("accepte les images, refuse PDF / null", () => {
    expect(isRasterImage("image/png")).toBe(true);
    expect(isRasterImage("image/webp")).toBe(true);
    expect(isRasterImage("application/pdf")).toBe(false);
    expect(isRasterImage(null)).toBe(false);
  });
});

describe("rateLimit() — anti-brute-force", () => {
  it("autorise jusqu'au seuil puis bloque", () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    expect(rateLimit(key, opts).ok).toBe(true); // 1
    expect(rateLimit(key, opts).ok).toBe(true); // 2
    expect(rateLimit(key, opts).ok).toBe(true); // 3
    const blocked = rateLimit(key, opts); // 4 → bloqué
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("isole les compteurs par clé (IP/email distincts)", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    rateLimit(a, { limit: 1, windowMs: 60_000 });
    expect(rateLimit(a, { limit: 1, windowMs: 60_000 }).ok).toBe(false);
    expect(rateLimit(b, { limit: 1, windowMs: 60_000 }).ok).toBe(true);
  });

  it("checkLimit() retombe sur la mémoire sans Redis et bloque au seuil", async () => {
    const key = `chk-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000 };
    expect((await checkLimit(key, opts)).ok).toBe(true);
    expect((await checkLimit(key, opts)).ok).toBe(true);
    expect((await checkLimit(key, opts)).ok).toBe(false);
  });
});
