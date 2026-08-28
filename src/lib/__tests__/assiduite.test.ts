import { describe, it, expect } from "vitest";
import { calcAssiduite, assiduiteFromSession } from "@/lib/assiduite";

describe("calcAssiduite() — heures réellement suivies & taux (A06-001)", () => {
  it("présence complète (3 journées) → 100 % et durée prévue intégrale", () => {
    const a = calcAssiduite(
      [
        { type: "JOURNEE", statut: "PRESENT" },
        { type: "JOURNEE", statut: "PRESENT" },
        { type: "JOURNEE", statut: "PRESENT" },
      ],
      21,
    );
    expect(a.tauxPct).toBe(100);
    expect(a.heuresSuivies).toBe(21);
  });

  it("1 journée absente sur 3 → 67 % et 14 h (pas 21 h)", () => {
    const a = calcAssiduite(
      [
        { type: "JOURNEE", statut: "PRESENT" },
        { type: "JOURNEE", statut: "ABSENT" },
        { type: "JOURNEE", statut: "PRESENT" },
      ],
      21,
    );
    expect(a.tauxPct).toBe(67); // 4 demi-j suivies / 6
    expect(a.heuresSuivies).toBe(14);
  });

  it("RETARD compte comme suivi, EXCUSE et non-émargé (null) comme non suivis", () => {
    const a = calcAssiduite(
      [
        { type: "JOURNEE", statut: "RETARD" },
        { type: "JOURNEE", statut: "EXCUSE" },
        { type: "JOURNEE", statut: null },
      ],
      18,
    );
    expect(a.poidsSuivi).toBe(2); // seul le RETARD
    expect(a.tauxPct).toBe(33); // 2/6
    expect(a.heuresSuivies).toBe(6); // 18 * 2/6
  });

  it("pondère par demi-journée : JOURNEE présent + MATIN absent → 67 %", () => {
    const a = calcAssiduite(
      [
        { type: "JOURNEE", statut: "PRESENT" }, // poids 2
        { type: "MATIN", statut: "ABSENT" }, // poids 1
      ],
      9,
    );
    expect(a.poidsTotal).toBe(3);
    expect(a.poidsSuivi).toBe(2);
    expect(a.tauxPct).toBe(67);
    expect(a.heuresSuivies).toBe(6); // 9 * 2/3
  });

  it("aucune séance → taux 0 et heures inconnues (null)", () => {
    const a = calcAssiduite([], 21);
    expect(a.tauxPct).toBe(0);
    expect(a.heuresSuivies).toBeNull();
  });

  it("durée prévue inconnue → heures suivies inconnues (null) mais taux calculé", () => {
    const a = calcAssiduite([{ type: "JOURNEE", statut: "PRESENT" }], null);
    expect(a.tauxPct).toBe(100);
    expect(a.heuresSuivies).toBeNull();
  });
});

describe("assiduiteFromSession() — mappe les présences par apprenant (A06-001)", () => {
  const seances = [
    { type: "JOURNEE" as const, presences: [ { statut: "PRESENT" as const, apprenantId: "A" }, { statut: "ABSENT" as const, apprenantId: "B" } ] },
    { type: "JOURNEE" as const, presences: [ { statut: "ABSENT" as const, apprenantId: "A" } ] },
  ];
  it("ne compte que les présences de l'apprenant visé", () => {
    const a = assiduiteFromSession(seances, "A", 14)!;
    expect(a.poidsSuivi).toBe(2); // A : présent J1, absent J2 → 2/4
    expect(a.tauxPct).toBe(50);
    expect(a.heuresSuivies).toBe(7);
  });
  it("retourne null sans apprenant rattaché ou sans séance", () => {
    expect(assiduiteFromSession(seances, null, 14)).toBeNull();
    expect(assiduiteFromSession([], "A", 14)).toBeNull();
  });
});
