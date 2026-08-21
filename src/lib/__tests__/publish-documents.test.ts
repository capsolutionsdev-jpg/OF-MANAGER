import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const buildSingleDocPdf = vi.fn();
vi.mock("@/lib/documents/build-pdf", () => ({
  buildSingleDocPdf: (id: string, type: string) => buildSingleDocPdf(id, type),
}));
const storeUpload = vi.fn();
vi.mock("@/lib/blob", () => ({ storeUpload: (o: unknown) => storeUpload(o) }));

const fakeDb = {
  documentGenere: { findFirst: vi.fn(), create: vi.fn() },
  convention: { findFirst: vi.fn() },
};
vi.mock("@/lib/tenant", () => ({ getTenantDb: vi.fn(async () => fakeDb) }));

import { publierDocument, publierEtapeFin } from "@/lib/documents/publish";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = fakeDb as any;

beforeEach(() => vi.clearAllMocks());

describe("publierDocument — idempotent + persistance DocumentGenere", () => {
  it("ne régénère pas un document déjà publié", async () => {
    fakeDb.documentGenere.findFirst.mockResolvedValue({ id: "d1" });
    const r = await publierDocument(db, "i1", "s1", "CONVOCATION");
    expect(r).toBe(true);
    expect(buildSingleDocPdf).not.toHaveBeenCalled();
    expect(fakeDb.documentGenere.create).not.toHaveBeenCalled();
  });

  it("génère, stocke (Blob) et crée la ligne DocumentGenere", async () => {
    fakeDb.documentGenere.findFirst.mockResolvedValue(null);
    buildSingleDocPdf.mockResolvedValue({ data: new Uint8Array([1, 2, 3]), filename: "x.pdf" });
    storeUpload.mockResolvedValue("blob://doc.pdf");
    fakeDb.documentGenere.create.mockResolvedValue({});
    const r = await publierDocument(db, "i1", "s1", "REGLEMENT_INTERIEUR");
    expect(r).toBe(true);
    const data = fakeDb.documentGenere.create.mock.calls[0][0].data;
    expect(data.type).toBe("REGLEMENT_INTERIEUR");
    expect(data.inscriptionId).toBe("i1");
    expect(data.sessionId).toBe("s1");
    expect(data.fileUrl).toBe("blob://doc.pdf");
  });

  it("ne crée rien si le document n'est pas applicable (buildSingleDocPdf null)", async () => {
    fakeDb.documentGenere.findFirst.mockResolvedValue(null);
    buildSingleDocPdf.mockResolvedValue(null);
    const r = await publierDocument(db, "i1", "s1", "ATTESTATION_RECYCLAGE");
    expect(r).toBe(false);
    expect(fakeDb.documentGenere.create).not.toHaveBeenCalled();
  });
});

describe("publierEtapeFin — documents conditionnels", () => {
  beforeEach(() => {
    fakeDb.documentGenere.findFirst.mockResolvedValue(null);
    buildSingleDocPdf.mockResolvedValue({ data: new Uint8Array([1]), filename: "x.pdf" });
    storeUpload.mockResolvedValue("blob://d.pdf");
    fakeDb.documentGenere.create.mockResolvedValue({});
  });

  it("inclut ATTESTATION_REUSSITE si examen + CERTIFIE", async () => {
    fakeDb.convention.findFirst.mockResolvedValue({
      inscriptions: [
        { id: "i1", sessionId: "s1", resultatCertification: "CERTIFIE", session: { formation: { examen: true } } },
      ],
    });
    await publierEtapeFin("cv1");
    const types = buildSingleDocPdf.mock.calls.map((c) => c[1]);
    expect(types).toEqual(
      expect.arrayContaining([
        "ATTESTATION_FIN",
        "CERTIFICAT_REALISATION",
        "SATISFACTION_ENTREPRISE",
        "ATTESTATION_REUSSITE",
      ]),
    );
  });

  it("n'inclut PAS ATTESTATION_REUSSITE sans examen", async () => {
    fakeDb.convention.findFirst.mockResolvedValue({
      inscriptions: [
        { id: "i1", sessionId: "s1", resultatCertification: "CERTIFIE", session: { formation: { examen: false } } },
      ],
    });
    await publierEtapeFin("cv1");
    const types = buildSingleDocPdf.mock.calls.map((c) => c[1]);
    expect(types).not.toContain("ATTESTATION_REUSSITE");
  });

  it("n'inclut PAS ATTESTATION_REUSSITE si examen mais pas CERTIFIE (ajourné)", async () => {
    fakeDb.convention.findFirst.mockResolvedValue({
      inscriptions: [
        { id: "i1", sessionId: "s1", resultatCertification: "AJOURNE", session: { formation: { examen: true } } },
      ],
    });
    await publierEtapeFin("cv1");
    const types = buildSingleDocPdf.mock.calls.map((c) => c[1]);
    expect(types).not.toContain("ATTESTATION_REUSSITE");
  });
});
