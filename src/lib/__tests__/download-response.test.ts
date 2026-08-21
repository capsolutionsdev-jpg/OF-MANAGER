import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fileDownloadResponse } from "@/lib/download-response";

describe("fileDownloadResponse", () => {
  it("renvoie 404 si l'URL est absente", async () => {
    const r = await fileDownloadResponse(null, "x.pdf");
    expect(r.status).toBe(404);
  });

  it("décode une data: URL base64 et force le téléchargement (attachment)", async () => {
    const payload = "%PDF-1.4 fake convention";
    const b64 = Buffer.from(payload, "utf8").toString("base64");
    const r = await fileDownloadResponse(`data:application/pdf;base64,${b64}`, "Convention #12/3.pdf");

    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("application/pdf");
    // nom de fichier assaini + en pièce jointe (déclenche le téléchargement)
    expect(r.headers.get("content-disposition")).toBe('attachment; filename="Convention_12_3.pdf"');
    const buf = Buffer.from(await r.arrayBuffer());
    expect(buf.toString("utf8")).toBe(payload);
  });

  it("rejette une data: URL malformée", async () => {
    const r = await fileDownloadResponse("data:garbage-without-comma", "x.pdf");
    expect(r.status).toBe(400);
  });
});
