import { describe, it, expect, afterEach } from "vitest";
import { organismeScope } from "../public-scope";

const ENV = process.env.VITRINE_ORGANISME_ID;
afterEach(() => {
  if (ENV === undefined) delete process.env.VITRINE_ORGANISME_ID;
  else process.env.VITRINE_ORGANISME_ID = ENV;
});

const req = (url: string) => new Request(url);

describe("organismeScope — portée des API publiques (multi-tenant)", () => {
  it("retient l'organisme passé par le site vitrine appelant", () => {
    process.env.VITRINE_ORGANISME_ID = "org-cap";
    expect(organismeScope(req("https://x.fr/api/public/formations?organisme=org-aguyse")))
      .toBe("org-aguyse");
  });

  it("retombe sur VITRINE_ORGANISME_ID quand le paramètre est absent", () => {
    process.env.VITRINE_ORGANISME_ID = "org-cap";
    expect(organismeScope(req("https://x.fr/api/public/formations"))).toBe("org-cap");
  });

  it("ignore un paramètre vide ou composé d'espaces", () => {
    process.env.VITRINE_ORGANISME_ID = "org-cap";
    expect(organismeScope(req("https://x.fr/api/public/formations?organisme=")))
      .toBe("org-cap");
    expect(organismeScope(req("https://x.fr/api/public/formations?organisme=%20%20")))
      .toBe("org-cap");
  });

  it("ne filtre rien sans paramètre ni variable d'environnement", () => {
    delete process.env.VITRINE_ORGANISME_ID;
    expect(organismeScope(req("https://x.fr/api/public/formations"))).toBeUndefined();
  });

  it("sert deux vitrines distinctes depuis un même déploiement", () => {
    delete process.env.VITRINE_ORGANISME_ID;
    expect(organismeScope(req("https://x.fr/api/public/sessions?organisme=org-cap")))
      .toBe("org-cap");
    expect(organismeScope(req("https://x.fr/api/public/sessions?organisme=org-aguyse")))
      .toBe("org-aguyse");
  });
});
