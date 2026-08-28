import { test, expect, afterEach } from "vitest";
import { getVersionInfo } from "@/lib/version";

const KEYS = ["VERCEL_GIT_COMMIT_SHA", "VERCEL_GIT_COMMIT_REF", "BUILD_TIME"];
const saved: Record<string, string | undefined> = {};
for (const k of KEYS) saved[k] = process.env[k];

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

test("expose le SHA court (7) et la ref quand Vercel les fournit", () => {
  process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890";
  process.env.VERCEL_GIT_COMMIT_REF = "main";
  const v = getVersionInfo();
  expect(v.commit).toBe("abcdef1");
  expect(v.ref).toBe("main");
});

test("repli 'dev'/'local' hors Vercel", () => {
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.VERCEL_GIT_COMMIT_REF;
  const v = getVersionInfo();
  expect(v.commit).toBe("dev");
  expect(v.ref).toBe("local");
});
