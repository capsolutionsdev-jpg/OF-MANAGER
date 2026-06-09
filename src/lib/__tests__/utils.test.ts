import { describe, it, expect, afterEach } from "vitest";
import { cn } from "@/lib/utils";
import { generateToken, appBaseUrl } from "@/lib/token";

describe("cn()", () => {
  it("fusionne les classes", () => {
    expect(cn("p-2", "text-sm")).toContain("p-2");
    expect(cn("p-2", "text-sm")).toContain("text-sm");
  });
  it("résout les conflits Tailwind (dernier gagne)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
  it("ignore les valeurs falsy", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});

describe("generateToken()", () => {
  it("génère un jeton non vide et url-safe", () => {
    const t = generateToken();
    expect(t.length).toBeGreaterThan(20);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("génère un jeton différent à chaque appel", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe("appBaseUrl()", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });
  it("retire le slash final", () => {
    process.env.APP_URL = "https://app.exemple.fr/";
    expect(appBaseUrl()).toBe("https://app.exemple.fr");
  });
  it("priorise APP_URL sur AUTH_URL", () => {
    process.env.APP_URL = "https://a.fr";
    process.env.AUTH_URL = "https://b.fr";
    expect(appBaseUrl()).toBe("https://a.fr");
  });
});
