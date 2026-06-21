import { describe, it, expect } from "vitest";
import { candidatFormSchema } from "@/lib/validators/candidat";

const valide = {
  nom: "Dupont",
  prenom: "Marie",
  email: "marie.dupont@exemple.fr",
  statut: "NOUVEAU",
};

describe("candidatFormSchema — cas positifs", () => {
  it("accepte un candidat minimal valide", () => {
    expect(candidatFormSchema.safeParse(valide).success).toBe(true);
  });
  it("trim les espaces autour du nom", () => {
    const r = candidatFormSchema.safeParse({ ...valide, nom: "  Dupont  " });
    expect(r.success && r.data.nom).toBe("Dupont");
  });
});

describe("candidatFormSchema — cas négatifs", () => {
  it("refuse un e-mail invalide", () => {
    expect(candidatFormSchema.safeParse({ ...valide, email: "pas-un-email" }).success).toBe(false);
  });
  it("refuse un nom vide", () => {
    expect(candidatFormSchema.safeParse({ ...valide, nom: "" }).success).toBe(false);
  });
  it("refuse un nom composé uniquement d'espaces (après trim)", () => {
    expect(candidatFormSchema.safeParse({ ...valide, nom: "   " }).success).toBe(false);
  });
  it("refuse un statut hors énumération", () => {
    expect(candidatFormSchema.safeParse({ ...valide, statut: "PIRATE" }).success).toBe(false);
  });
});

describe("candidatFormSchema — valeurs aux limites", () => {
  it("accepte un nom d'1 caractère (borne min)", () => {
    expect(candidatFormSchema.safeParse({ ...valide, nom: "A" }).success).toBe(true);
  });
  it("accepte un e-mail à la frontière (a@b.co)", () => {
    expect(candidatFormSchema.safeParse({ ...valide, email: "a@b.co" }).success).toBe(true);
  });
  it("DOCUMENTE l'absence de borne max sur le nom (5000 car. acceptés)", () => {
    // Aucune longueur maximale n'est définie → à signaler comme amélioration mineure.
    const r = candidatFormSchema.safeParse({ ...valide, nom: "x".repeat(5000) });
    expect(r.success).toBe(true);
  });
});
