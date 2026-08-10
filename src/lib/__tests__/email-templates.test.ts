import { describe, it, expect } from "vitest";
import {
  esc,
  emailShell,
  emailButton,
  emailBox,
  emailHeading,
  emailParagraph,
  emailSignoff,
} from "@/lib/email-templates";

describe("esc()", () => {
  it("échappe les caractères HTML dangereux", () => {
    expect(esc(`Sécurité & <b>"privée"</b> 'x'`)).toBe(
      "Sécurité &amp; &lt;b&gt;&quot;privée&quot;&lt;/b&gt; &#39;x&#39;",
    );
  });
  it("gère null/undefined", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("emailShell()", () => {
  const html = emailShell({
    organisme: "AGUYSE <Formation>",
    representant: "M. Dupont",
    accent: "green",
    body: emailParagraph("Bonjour le monde"),
  });

  it("échappe le nom de l'organisme dans l'en-tête ET le pied", () => {
    expect(html).not.toContain("AGUYSE <Formation>");
    expect(html.match(/AGUYSE &lt;Formation&gt;/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("inclut le corps, le représentant, le pied RGPD et le doctype", () => {
    expect(html).toContain("Bonjour le monde");
    expect(html).toContain("M. Dupont");
    expect(html).toContain("Propulsé par OFManager");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  });
  it("applique la couleur d'accent (green) sur la pastille d'en-tête", () => {
    expect(html).toContain("#12B886");
  });
});

describe("emailButton()", () => {
  it("échappe le label et le lien, applique l'accent", () => {
    const b = emailButton("Signer →", "https://x.fr/p/abc", "amber");
    expect(b).toContain("https://x.fr/p/abc");
    expect(b).toContain("Signer →");
    expect(b).toContain("#E8A33D");
  });
});

describe("emailBox() / emailHeading() / emailSignoff()", () => {
  it("emailBox applique la bordure d'accent", () => {
    expect(emailBox("📅 Dates", "primary")).toContain("border-left:4px solid #3B6EF5");
  });
  it("emailHeading enveloppe le titre", () => {
    expect(emailHeading("Bravo 🎉")).toContain("<h1");
    expect(emailHeading("Bravo 🎉")).toContain("Bravo 🎉");
  });
  it("emailSignoff échappe le représentant", () => {
    expect(emailSignoff("À bientôt,", "Jean & Cie")).toContain("Jean &amp; Cie");
  });
});
