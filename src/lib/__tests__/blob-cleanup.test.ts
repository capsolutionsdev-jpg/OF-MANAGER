import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const put = vi.fn();
const del = vi.fn();
vi.mock("@vercel/blob", () => ({
  put: (...a: unknown[]) => put(...a),
  del: (...a: unknown[]) => del(...a),
}));

import { storeUploadThen } from "@/lib/blob";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", "tok");
  put.mockResolvedValue({ url: "https://blob.test/x.pdf" });
});
afterEach(() => vi.unstubAllEnvs());

describe("storeUploadThen — compensation blob si l'écriture DB échoue (A12-009)", () => {
  const opts = { data: new Uint8Array([1, 2, 3]), folder: "f", ext: "pdf" };

  it("supprime le blob si persist échoue, puis relance l'erreur", async () => {
    await expect(
      storeUploadThen(opts, async () => {
        throw new Error("db down");
      }),
    ).rejects.toThrow("db down");
    expect(del).toHaveBeenCalledWith("https://blob.test/x.pdf");
  });

  it("ne supprime rien si persist réussit", async () => {
    const r = await storeUploadThen(opts, async (url) => ({ saved: url }));
    expect(r).toEqual({ saved: "https://blob.test/x.pdf" });
    expect(del).not.toHaveBeenCalled();
  });

  it("ne tente aucune suppression sur un repli data: URL (Blob non configuré)", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", ""); // storeUpload renvoie une data: URL
    await expect(
      storeUploadThen(opts, async () => {
        throw new Error("x");
      }),
    ).rejects.toThrow("x");
    expect(del).not.toHaveBeenCalled();
  });
});
