import { test, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/(app)/ma-facturation/download/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    factureFormateur: { findUnique: vi.fn() },
    formateur: { findUnique: vi.fn() },
  },
}));

const call = (qs = "") => GET(new Request(`https://x/ma-facturation/download${qs}`));
const facture = { reference: "F1", fichierUrl: "https://blob/x", formateurId: "fo1", organismeId: "o1" };

beforeEach(() => {
  vi.mocked(auth).mockReset();
  vi.mocked(prisma.factureFormateur.findUnique).mockReset();
  vi.mocked(prisma.formateur.findUnique).mockReset();
});

test("401 sans session", async () => {
  vi.mocked(auth).mockResolvedValue(null as never);
  expect((await call("?id=f1")).status).toBe(401);
});

test("400 si id manquant", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { role: "ADMIN" } } as never);
  expect((await call()).status).toBe(400);
});

test("404 si facture introuvable", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { role: "ADMIN", organismeId: "o1" } } as never);
  vi.mocked(prisma.factureFormateur.findUnique).mockResolvedValue(null as never);
  expect((await call("?id=f1")).status).toBe(404);
});

test("403 si ni staff du bon OF ni formateur propriétaire", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { role: "APPRENANT", id: "u1", organismeId: "o1" } } as never);
  vi.mocked(prisma.factureFormateur.findUnique).mockResolvedValue(facture as never);
  expect((await call("?id=f1")).status).toBe(403);
});

test("403 pour un staff d'un AUTRE organisme (anti cross-tenant)", async () => {
  vi.mocked(auth).mockResolvedValue({ user: { role: "ADMIN", organismeId: "AUTRE" } } as never);
  vi.mocked(prisma.factureFormateur.findUnique).mockResolvedValue(facture as never);
  expect((await call("?id=f1")).status).toBe(403);
});
