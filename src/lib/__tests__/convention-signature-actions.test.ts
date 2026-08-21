import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentEntreprise = vi.fn();
vi.mock("@/lib/entreprise-portal", () => ({ getCurrentEntreprise: () => getCurrentEntreprise() }));

const fakeDb = { convention: { findFirst: vi.fn(), update: vi.fn() } };
const requireStaffTenant = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getTenantDb: vi.fn(async () => fakeDb),
  requireStaffTenant: () => requireStaffTenant(),
}));

vi.mock("@/lib/blob", () => ({
  parseDataUrl: vi.fn(() => ({ mime: "application/pdf", data: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })),
  detectFileType: vi.fn(() => "application/pdf"),
  storeUpload: vi.fn(async () => "blob://signed.pdf"),
}));

const generateAndStoreConventionPdf = vi.fn();
vi.mock("@/lib/documents/convention-pdf", () => ({
  generateAndStoreConventionPdf: (id: string) => generateAndStoreConventionPdf(id),
}));

import {
  uploadConventionSigneeClient,
  uploadConventionSigneeStaff,
  regenererConventionPdf,
} from "@/lib/actions/convention-signature-actions";

const DATA_URL = "data:application/pdf;base64,JVBERi0=";

beforeEach(() => vi.clearAllMocks());

describe("uploadConventionSigneeClient — scopé entreprise (anti-IDOR)", () => {
  it("refuse une convention n'appartenant pas à l'entreprise connectée", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.convention.findFirst.mockResolvedValue(null); // introuvable pour ent-A
    const r = await uploadConventionSigneeClient("cv-autre", DATA_URL);
    expect(r.ok).toBe(false);
    expect(fakeDb.convention.update).not.toHaveBeenCalled();
  });

  it("dépose le signé pour SA convention (where filtré par entrepriseId)", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.convention.findFirst.mockResolvedValue({ id: "cv1" });
    fakeDb.convention.update.mockResolvedValue({});
    const r = await uploadConventionSigneeClient("cv1", DATA_URL);
    expect(r.ok).toBe(true);
    expect(fakeDb.convention.findFirst.mock.calls[0][0].where.entrepriseId).toBe("ent-A");
    expect(fakeDb.convention.update.mock.calls[0][0].data.fileUrlSigne).toBe("blob://signed.pdf");
  });

  it("refuse si le user n'est pas une entreprise", async () => {
    getCurrentEntreprise.mockResolvedValue(null);
    const r = await uploadConventionSigneeClient("cv1", DATA_URL);
    expect(r.ok).toBe(false);
  });
});

describe("uploadConventionSigneeStaff — personnel du tenant", () => {
  it("dépose le signé (staff), convention du tenant", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb });
    fakeDb.convention.findFirst.mockResolvedValue({ id: "cv1", entrepriseId: "ent-A" });
    fakeDb.convention.update.mockResolvedValue({});
    const r = await uploadConventionSigneeStaff("cv1", DATA_URL);
    expect(r.ok).toBe(true);
    expect(fakeDb.convention.update.mock.calls[0][0].data.fileUrlSigne).toBe("blob://signed.pdf");
  });

  it("refuse une convention introuvable dans le tenant", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb });
    fakeDb.convention.findFirst.mockResolvedValue(null);
    const r = await uploadConventionSigneeStaff("cv-x", DATA_URL);
    expect(r.ok).toBe(false);
    expect(fakeDb.convention.update).not.toHaveBeenCalled();
  });
});

describe("garde re-dépôt + régénération (revue Phase 3)", () => {
  it("client : refuse de redéposer si la convention est déjà validée (SIGNEE)", async () => {
    getCurrentEntreprise.mockResolvedValue({ id: "ent-A", raisonSociale: "A" });
    fakeDb.convention.findFirst.mockResolvedValue({ id: "cv1", signatureStatut: "SIGNEE" });
    const r = await uploadConventionSigneeClient("cv1", DATA_URL);
    expect(r.ok).toBe(false);
    expect(fakeDb.convention.update).not.toHaveBeenCalled();
  });

  it("regenererConventionPdf : ok si le PDF est (re)généré", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb });
    fakeDb.convention.findFirst.mockResolvedValue({ id: "cv1", entrepriseId: "ent-A" });
    generateAndStoreConventionPdf.mockResolvedValue("blob://conv.pdf");
    const r = await regenererConventionPdf("cv1");
    expect(r.ok).toBe(true);
    expect(generateAndStoreConventionPdf).toHaveBeenCalledWith("cv1");
  });

  it("regenererConventionPdf : erreur si la génération échoue (null)", async () => {
    requireStaffTenant.mockResolvedValue({ db: fakeDb });
    fakeDb.convention.findFirst.mockResolvedValue({ id: "cv1", entrepriseId: "ent-A" });
    generateAndStoreConventionPdf.mockResolvedValue(null);
    const r = await regenererConventionPdf("cv1");
    expect(r.ok).toBe(false);
  });
});
