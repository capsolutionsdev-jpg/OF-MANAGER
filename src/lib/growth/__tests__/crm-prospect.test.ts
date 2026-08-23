import { describe, it, expect } from "vitest";
import {
  mapExcelStatut,
  normalizePriorite,
  regionFromCodePostal,
  departementFromCodePostal,
  PRIORITE_LABELS,
} from "@/lib/growth/crm-prospect";

describe("mapExcelStatut()", () => {
  it("« À contacter » (et vide) → FICHIER", () => {
    expect(mapExcelStatut("À contacter")).toBe("FICHIER");
    expect(mapExcelStatut("")).toBe("FICHIER");
    expect(mapExcelStatut(null)).toBe("FICHIER");
    expect(mapExcelStatut("libellé inconnu")).toBe("FICHIER");
  });
  it("mappe le vocabulaire CRM vers le pipeline", () => {
    expect(mapExcelStatut("Contacté")).toBe("CONTACTE");
    expect(mapExcelStatut("En discussion")).toBe("ENGAGE");
    expect(mapExcelStatut("Rdv fixé")).toBe("DEMO_PLANIFIEE");
    expect(mapExcelStatut("Client")).toBe("SIGNE");
    expect(mapExcelStatut("Perdu")).toBe("PERDU");
    expect(mapExcelStatut("Sans intérêt")).toBe("PERDU");
  });
});

describe("normalizePriorite()", () => {
  it("normalise Haute/Moyenne/Basse (casse libre)", () => {
    expect(normalizePriorite("Haute")).toBe("haute");
    expect(normalizePriorite("MOYENNE")).toBe("moyenne");
    expect(normalizePriorite("basse")).toBe("basse");
  });
  it("vide / inconnu → null", () => {
    expect(normalizePriorite("")).toBeNull();
    expect(normalizePriorite(null)).toBeNull();
    expect(normalizePriorite("xyz")).toBeNull();
  });
  it("libellés d'affichage cohérents", () => {
    expect(PRIORITE_LABELS.haute).toBe("Haute");
  });
});

describe("departementFromCodePostal()", () => {
  it("2 chiffres en métropole", () => {
    expect(departementFromCodePostal("75001")).toBe("75");
    expect(departementFromCodePostal("26000")).toBe("26");
    expect(departementFromCodePostal("06200")).toBe("06");
  });
  it("Corse 2A / 2B", () => {
    expect(departementFromCodePostal("20000")).toBe("2A"); // Ajaccio
    expect(departementFromCodePostal("20200")).toBe("2B"); // Bastia
  });
  it("DOM sur 3 chiffres", () => {
    expect(departementFromCodePostal("97300")).toBe("973"); // Guyane
    expect(departementFromCodePostal("97400")).toBe("974"); // La Réunion
  });
  it("null si invalide", () => {
    expect(departementFromCodePostal("")).toBeNull();
    expect(departementFromCodePostal("abc")).toBeNull();
  });
});

describe("regionFromCodePostal()", () => {
  it("déduit la région administrative", () => {
    expect(regionFromCodePostal("75001")).toBe("Île-de-France");
    expect(regionFromCodePostal("78500")).toBe("Île-de-France");
    expect(regionFromCodePostal("26000")).toBe("Auvergne-Rhône-Alpes");
    expect(regionFromCodePostal("13001")).toBe("Provence-Alpes-Côte d'Azur");
    expect(regionFromCodePostal("97300")).toBe("Guyane");
  });
  it("null si code postal indéterminable", () => {
    expect(regionFromCodePostal("")).toBeNull();
  });
});
