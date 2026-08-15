import { describe, it, expect } from "vitest";
import { migrerSlugs, ALL_FORMATIONS } from "@/lib/formations-catalog";

const CLES = new Set(ALL_FORMATIONS.map((f) => f.slug));

describe("migrerSlugs — auto-réparation des configurations de formations", () => {
  it("laisse passer les clés actuelles inchangées", () => {
    expect(migrerSlugs(["ssiap1-initial", "sst"])).toEqual(["ssiap1-initial", "sst"]);
  });

  it("migre les anciens identifiants renommés vers les clés actuelles", () => {
    expect(migrerSlugs(["ssiap-1-initial"])).toEqual(["ssiap1-initial"]);
    expect(migrerSlugs(["sst-initial"])).toEqual(["sst"]);
    expect(migrerSlugs(["sst-mac"])).toEqual(["mac-sst"]);
    expect(migrerSlugs(["tfp-aps-agent-prevention-securite"])).toEqual(["tfp-aps"]);
    expect(migrerSlugs(["tpmr-mobilite-reduite"])).toEqual(["tpmr"]);
  });

  it("ignore les identifiants sans équivalent dans la bibliothèque actuelle", () => {
    expect(migrerSlugs(["ssiap-2-recyclage", "operateur-videoprotection-vae"])).toEqual([]);
    expect(migrerSlugs(["nimportequoi"])).toEqual([]);
  });

  it("dédoublonne après migration (secourisme + sst-initial → sst une seule fois)", () => {
    expect(migrerSlugs(["secourisme", "sst-initial", "sst"])).toEqual(["sst"]);
  });

  it("ne renvoie que des clés réellement connues de la bibliothèque", () => {
    for (const cle of migrerSlugs(ALL_FORMATIONS.map((f) => f.slug))) {
      expect(CLES.has(cle)).toBe(true);
    }
  });

  it("reproduit la réparation ASPR FORMATION : 22 anciens slugs → 17 clés actuelles", () => {
    const configHeritee = [
      "ssiap-1-initial", "ssiap-1-recyclage", "ssiap-1-remise-a-niveau",
      "ssiap-2-initial", "ssiap-2-recyclage", "ssiap-3-initial", "ssiap-3-recyclage",
      "sst-initial", "sst-mac", "tfp-aps-agent-prevention-securite", "mac-aps-recyclage",
      "a3p-agent-protection-physique-personnes-vae",
      "a3p-agent-protection-physique-personnes-initiale",
      "operateur-videoprotection-vae", "operateur-videoprotection-initiale",
      "dirigeant-societe-securite-privee-initiale", "vtc-formation-continue",
      "taxi-formation-continue", "passerelle-vtc-taxi", "tpmr-mobilite-reduite",
      "passerelle-taxi-vtc", "secourisme",
    ];
    expect(migrerSlugs(configHeritee)).toHaveLength(17);
  });
});
