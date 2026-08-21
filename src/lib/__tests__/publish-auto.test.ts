import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const buildSingleDocPdf = vi.fn();
vi.mock("@/lib/documents/build-pdf", () => ({
  buildSingleDocPdf: (id: string, type: string) => buildSingleDocPdf(id, type),
}));
const storeUpload = vi.fn();
vi.mock("@/lib/blob", () => ({ storeUpload: (o: unknown) => storeUpload(o) }));

// vi.hoisted : `prisma` doit exister AVANT que la factory hoistée ne s'exécute
// (l'import de publish-auto est lui aussi hoisté au sommet du fichier).
const { prisma } = vi.hoisted(() => ({
  prisma: {
    convention: { findMany: vi.fn() },
    inscription: { findMany: vi.fn() },
    documentGenere: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
// publish-auto importe ETAPE_* depuis publish.ts, qui charge @/lib/tenant (next-auth).
// On le neutralise : le cron n'utilise jamais getTenantDb (prisma brut).
vi.mock("@/lib/tenant", () => ({ getTenantDb: vi.fn(), requireStaffTenant: vi.fn() }));

import { publierDocumentsAutoParDate } from "@/lib/documents/publish-auto";

beforeEach(() => {
  vi.clearAllMocks();
  prisma.convention.findMany.mockResolvedValue([]);
  prisma.inscription.findMany.mockResolvedValue([]);
  prisma.documentGenere.findFirst.mockResolvedValue(null);
  buildSingleDocPdf.mockResolvedValue({ data: new Uint8Array([1]), filename: "x.pdf" });
  storeUpload.mockResolvedValue("blob://d.pdf");
  prisma.documentGenere.create.mockResolvedValue({});
});

describe("publierDocumentsAutoParDate — cron sans session (prisma brut)", () => {
  it("attestation d'entrée : organismeId fixé EXPLICITEMENT (isolation multi-tenant)", async () => {
    prisma.inscription.findMany.mockResolvedValue([{ id: "i1", sessionId: "s1", organismeId: "org-A" }]);
    const counts = await publierDocumentsAutoParDate();
    expect(counts.entree).toBe(1);
    const data = prisma.documentGenere.create.mock.calls[0][0].data;
    expect(data.organismeId).toBe("org-A");
    expect(data.type).toBe("ATTESTATION_ENTREE");
    expect(data.inscriptionId).toBe("i1");
    expect(data.sessionId).toBe("s1");
  });

  it("idempotent : ne republie pas un document déjà présent", async () => {
    prisma.inscription.findMany.mockResolvedValue([{ id: "i1", sessionId: "s1", organismeId: "org-A" }]);
    prisma.documentGenere.findFirst.mockResolvedValue({ id: "d1" }); // déjà publié
    const counts = await publierDocumentsAutoParDate();
    expect(counts.entree).toBe(0);
    expect(buildSingleDocPdf).not.toHaveBeenCalled();
    expect(prisma.documentGenere.create).not.toHaveBeenCalled();
  });

  it("borne la génération à MAX_DOCS_PER_RUN = 15 (anti-timeout Vercel)", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, sessionId: "s", organismeId: "org-A" }));
    prisma.inscription.findMany.mockResolvedValue(many);
    const counts = await publierDocumentsAutoParDate();
    expect(counts.entree).toBe(15);
    expect(prisma.documentGenere.create).toHaveBeenCalledTimes(15);
  });

  it("borne les TENTATIVES Chromium MÊME EN ÉCHEC (le budget paie le rendu, pas le succès)", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `i${i}`, sessionId: "s", organismeId: "org-A" }));
    prisma.inscription.findMany.mockResolvedValue(many);
    buildSingleDocPdf.mockResolvedValue(null); // rendu non applicable / en échec pour tous
    const counts = await publierDocumentsAutoParDate();
    expect(counts.entree).toBe(0);
    // Le point clé : on tente 15 rendus, PAS 30 — sinon un échec systémique ferait
    // exploser le temps d'exécution (blocker de revue).
    expect(buildSingleDocPdf).toHaveBeenCalledTimes(15);
    expect(prisma.documentGenere.create).not.toHaveBeenCalled();
  });

  it("un document déjà publié (ignore) ne consomme AUCUN budget", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `i${i}`, sessionId: "s", organismeId: "org-A" }));
    prisma.inscription.findMany.mockResolvedValue(many);
    prisma.documentGenere.findFirst.mockResolvedValue({ id: "deja" }); // tous déjà publiés
    const counts = await publierDocumentsAutoParDate();
    expect(counts.entree).toBe(0);
    expect(buildSingleDocPdf).not.toHaveBeenCalled(); // ignore = aucun rendu, gratuit
  });

  it("convention SIGNEE → RI + CGV + convocation, organismeId propagé", async () => {
    prisma.convention.findMany.mockResolvedValue([
      { organismeId: "org-B", inscriptions: [{ id: "i9", sessionId: "s9" }] },
    ]);
    const counts = await publierDocumentsAutoParDate();
    expect(counts.convention).toBe(3);
    const types = buildSingleDocPdf.mock.calls.map((c) => c[1]);
    expect(types).toEqual(
      expect.arrayContaining(["REGLEMENT_INTERIEUR", "CONDITIONS_GENERALES", "CONVOCATION"]),
    );
    expect(prisma.documentGenere.create.mock.calls[0][0].data.organismeId).toBe("org-B");
  });
});
