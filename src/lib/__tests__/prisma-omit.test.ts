import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { PRISMA_OMIT } from "@/lib/prisma";

/**
 * Allègement base : le dossier PDF complet (Bytes, jusqu'à 8 Mo) est exclu par
 * défaut de toutes les requêtes pour éviter un transfert massif (quota base).
 * Ces tests garantissent que l'exclusion reste en place ET que le seul lecteur
 * légitime (cache PDF) la réactive via un `select` explicite.
 */
describe("allègement base — omit des colonnes lourdes", () => {
  it("dossierPdf est exclu par défaut", () => {
    expect(PRISMA_OMIT.inscription.dossierPdf).toBe(true);
  });

  it("le cache PDF réactive dossierPdf via un select explicite", () => {
    const src = fs.readFileSync("src/lib/documents/pdf-cache.ts", "utf8");
    expect(src).toMatch(/dossierPdf:\s*true/);
  });
});
