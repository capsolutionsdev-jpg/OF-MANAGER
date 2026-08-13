import { describe, it, expect } from "vitest";
import {
  salleToken, verifySalleToken, demiEnCours, memeJour, jourKey,
} from "@/lib/emargement-salle";

const KEY = "test-secret-123";

describe("salleToken / verifySalleToken", () => {
  it("est déterministe pour une même session + clé", () => {
    expect(salleToken("sess1", KEY)).toBe(salleToken("sess1", KEY));
  });

  it("diffère d'une session à l'autre", () => {
    expect(salleToken("sess1", KEY)).not.toBe(salleToken("sess2", KEY));
  });

  it("diffère si la clé secrète change", () => {
    expect(salleToken("sess1", KEY)).not.toBe(salleToken("sess1", "autre-cle"));
  });

  it("produit un jeton court non devinable (24 car.)", () => {
    expect(salleToken("sess1", KEY)).toHaveLength(24);
  });

  it("verifySalleToken accepte le bon jeton", () => {
    const t = salleToken("sess1", KEY);
    expect(verifySalleToken("sess1", t, KEY)).toBe(true);
  });

  it("refuse un jeton d'une autre session", () => {
    const t = salleToken("sess2", KEY);
    expect(verifySalleToken("sess1", t, KEY)).toBe(false);
  });

  it("refuse un jeton falsifié / de mauvaise longueur", () => {
    expect(verifySalleToken("sess1", "trop-court", KEY)).toBe(false);
    const t = salleToken("sess1", KEY);
    const altered = (t[0] === "A" ? "B" : "A") + t.slice(1);
    expect(verifySalleToken("sess1", altered, KEY)).toBe(false);
  });
});

describe("demiEnCours", () => {
  it("avant 13h → matin, à partir de 13h → après-midi", () => {
    expect(demiEnCours(new Date(2026, 0, 1, 8, 0))).toBe("MATIN");
    expect(demiEnCours(new Date(2026, 0, 1, 12, 59))).toBe("MATIN");
    expect(demiEnCours(new Date(2026, 0, 1, 13, 0))).toBe("APRES_MIDI");
    expect(demiEnCours(new Date(2026, 0, 1, 18, 30))).toBe("APRES_MIDI");
  });
});

describe("memeJour / jourKey", () => {
  it("memeJour ignore l'heure", () => {
    expect(memeJour(new Date(2026, 4, 12, 9), new Date(2026, 4, 12, 17))).toBe(true);
    expect(memeJour(new Date(2026, 4, 12), new Date(2026, 4, 13))).toBe(false);
  });
  it("jourKey formate YYYY-MM-DD", () => {
    expect(jourKey(new Date(2026, 4, 3))).toBe("2026-05-03");
  });
});
