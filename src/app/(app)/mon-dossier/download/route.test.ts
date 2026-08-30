import { test, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/(app)/mon-dossier/download/route";
import { getCurrentApprenant } from "@/lib/candidat-portal";
import { getTenantDb } from "@/lib/tenant";

vi.mock("@/lib/candidat-portal", () => ({ getCurrentApprenant: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantDb: vi.fn() }));

// db factice : findFirst renvoie null (document non trouvé / non possédé par le candidat).
const emptyDb = {
  pieceJointe: { findFirst: async () => null },
  documentGenere: { findFirst: async () => null },
};

beforeEach(() => {
  vi.mocked(getCurrentApprenant).mockReset();
  vi.mocked(getTenantDb).mockReset();
  vi.mocked(getTenantDb).mockResolvedValue(emptyDb as never);
});

const call = (qs: string) => GET(new Request(`https://x/mon-dossier/download?${qs}`));

test("401 si aucun apprenant en session", async () => {
  vi.mocked(getCurrentApprenant).mockResolvedValue(null as never);
  expect((await call("kind=document&id=abc")).status).toBe(401);
});

test("400 si kind non autorisé", async () => {
  vi.mocked(getCurrentApprenant).mockResolvedValue({ candidatId: "c1" } as never);
  expect((await call("kind=hack&id=abc")).status).toBe(400);
});

test("400 si id manquant", async () => {
  vi.mocked(getCurrentApprenant).mockResolvedValue({ candidatId: "c1" } as never);
  expect((await call("kind=document")).status).toBe(400);
});

test("kind=document accepté → interroge la base (404 si non trouvé/non possédé)", async () => {
  vi.mocked(getCurrentApprenant).mockResolvedValue({ candidatId: "c1" } as never);
  expect((await call("kind=document&id=abc")).status).toBe(404);
});
