import { test, expect } from "vitest";
import { healthPayload } from "@/lib/health";

test("base joignable → 200 ok/up", () => {
  expect(healthPayload(true)).toEqual({ body: { status: "ok", db: "up" }, status: 200 });
});

test("base injoignable → 503 degraded/down", () => {
  expect(healthPayload(false)).toEqual({
    body: { status: "degraded", db: "down" },
    status: 503,
  });
});
