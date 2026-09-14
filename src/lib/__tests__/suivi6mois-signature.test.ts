import { describe, it, expect } from "vitest";
import { isValidSignatureDataUrl } from "@/lib/suivi6mois";

describe("isValidSignatureDataUrl", () => {
  it("accepte une signature PNG en data URL base64", () => {
    expect(
      isValidSignatureDataUrl(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ),
    ).toBe(true);
  });

  it("accepte une signature JPEG", () => {
    expect(isValidSignatureDataUrl("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD")).toBe(true);
  });

  it("rejette une charge d'injection qui casse l'attribut src", () => {
    expect(
      isValidSignatureDataUrl(`data:image/png;base64,x" onerror="fetch('https://evil.tld')`),
    ).toBe(false);
  });

  it("rejette un type non-image (data:text/html)", () => {
    expect(isValidSignatureDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
  });

  it("rejette une valeur vide, absente ou non-data", () => {
    expect(isValidSignatureDataUrl("")).toBe(false);
    expect(isValidSignatureDataUrl(undefined)).toBe(false);
    expect(isValidSignatureDataUrl("https://evil.tld/x.png")).toBe(false);
  });
});
