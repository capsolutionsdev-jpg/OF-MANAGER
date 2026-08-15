import { describe, it, expect } from "vitest";
import {
  calcMontants,
  overageLignes,
  sirenFromSiret,
  mentionsManquantes,
  factureCiiXml,
  factureEditeurHtml,
  type PartieFacture,
  type FactureData,
} from "@/lib/factures/editeur";

const emetteur: PartieFacture = {
  nom: "CAP", raisonSociale: "CAP SARL", siret: "12345678900011",
  tva: "FR12345678900", adresse: "1 rue X", codePostal: "75001", ville: "Paris",
};
const client: PartieFacture = {
  nom: "OF Client", siret: "98765432100022", adresse: "2 rue Y", codePostal: "69001", ville: "Lyon",
};
const facture: FactureData = {
  numero: "F-2026-0001", statut: "EMISE", categorie: "SERVICES",
  periodeDebut: new Date(2026, 7, 1), periodeFin: new Date(2026, 7, 31),
  dateEmission: new Date(2026, 7, 15), dateEcheance: new Date(2026, 8, 14),
  montantHT: 149, tauxTva: 20, montantTva: 29.8, montantTTC: 178.8,
  lignes: [{ libelle: "Abonnement", quantite: 1, prixUnitaire: 149, montantHT: 149 }],
  clientSiren: "987654321", optionTvaDebits: false, modePaiement: "Prélèvement SEPA",
};

describe("Facture éditeur — conformité e-invoicing 2026", () => {
  it("calcMontants : HT + TVA = TTC", () => {
    const m = calcMontants([{ libelle: "x", quantite: 1, prixUnitaire: 149, montantHT: 149 }], 20);
    expect(m.montantHT).toBe(149);
    expect(m.montantTva).toBe(29.8);
    expect(m.montantTTC).toBe(178.8);
  });

  it("sirenFromSiret : 9 premiers chiffres du SIRET", () => {
    expect(sirenFromSiret("12345678900011")).toBe("123456789");
    expect(sirenFromSiret("court")).toBeNull();
  });

  it("mentionsManquantes : signale le SIREN client absent", () => {
    const manque = mentionsManquantes({ emetteur, client: { nom: "X" }, facture: { ...facture, clientSiren: null } });
    expect(manque).toContain("SIREN du client (obligatoire dès 09/2026)");
  });

  it("mentionsManquantes : vide si tout est complet", () => {
    expect(mentionsManquantes({ emetteur, client, facture })).toEqual([]);
  });

  it("XML CII : profil EN 16931 + SIREN vendeur/acheteur + totaux", () => {
    const xml = factureCiiXml({ emetteur, client, facture });
    expect(xml).toContain("urn:cen.eu:en16931:2017");
    expect(xml).toContain("<ram:ID>F-2026-0001</ram:ID>");
    expect(xml).toContain('schemeID="0002">123456789'); // SIREN vendeur
    expect(xml).toContain('schemeID="0002">987654321'); // SIREN acheteur
    expect(xml).toContain("<ram:GrandTotalAmount>178.80</ram:GrandTotalAmount>");
    expect(xml).toContain("<ram:TypeCode>380</ram:TypeCode>"); // facture
  });

  it("XML CII : un avoir porte le TypeCode 381", () => {
    const xml = factureCiiXml({ emetteur, client, facture: { ...facture, statut: "AVOIR" } });
    expect(xml).toContain("<ram:TypeCode>381</ram:TypeCode>");
  });

  it("PDF (HTML) : mentions obligatoires présentes", () => {
    const html = factureEditeurHtml({ emetteur, client, facture });
    expect(html).toContain("F-2026-0001");
    expect(html).toContain("SIREN 987654321");
    expect(html).toContain("Prestation de services");
    expect(html).toContain("EN 16931");
    expect(html).toContain("L441-10"); // pénalités de retard légales
  });
});

describe("Facturation à l'usage — overageLignes", () => {
  const prix = { email: 0.01, inscription: 5 };

  it("dépassement e-mails + inscriptions → 2 lignes chiffrées", () => {
    const lignes = overageLignes(
      { emails: { used: 600, limit: 500 }, inscriptions: { used: 35, limit: 30 }, moisLabel: "août 2026" },
      prix,
    );
    expect(lignes).toHaveLength(2);
    expect(lignes[0].quantite).toBe(100);
    expect(lignes[0].montantHT).toBe(1); // 100 × 0,01
    expect(lignes[1].quantite).toBe(5);
    expect(lignes[1].montantHT).toBe(25); // 5 × 5
  });

  it("sous le quota → aucune ligne", () => {
    expect(
      overageLignes({ emails: { used: 100, limit: 500 }, inscriptions: { used: 10, limit: 30 }, moisLabel: "x" }, prix),
    ).toEqual([]);
  });

  it("formule illimitée (limit null) → aucune ligne", () => {
    expect(
      overageLignes({ emails: { used: 99999, limit: null }, inscriptions: { used: 999, limit: null }, moisLabel: "x" }, prix),
    ).toEqual([]);
  });
});
