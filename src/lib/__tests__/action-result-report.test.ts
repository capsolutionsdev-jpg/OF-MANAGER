import { test, expect, vi, beforeEach } from "vitest";
import { toActionError } from "@/lib/action-result";
import { reportError } from "@/lib/observability/report-error";

vi.mock("@/lib/observability/report-error", () => ({ reportError: vi.fn() }));

beforeEach(() => vi.mocked(reportError).mockClear());

test("signale une erreur INATTENDUE à reportError (tag 'action')", () => {
  toActionError(new Error("boom inattendu"));
  expect(reportError).toHaveBeenCalledOnce();
  expect(vi.mocked(reportError).mock.calls[0][1]).toMatchObject({ tag: "action" });
});

test("ne signale PAS un refus d'accès (cas métier attendu)", () => {
  toActionError(new Error("Accès refusé: hors périmètre"));
  expect(reportError).not.toHaveBeenCalled();
});
