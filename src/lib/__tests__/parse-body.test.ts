import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseBody } from "@/lib/parse-body";

const schema = z.object({
  email: z.string().email(),
  nom: z.string().min(1),
});

function jsonReq(body: unknown): Request {
  return new Request("http://x/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("parseBody — validation d'entrée par schéma (A12-013)", () => {
  it("valide et renvoie les données typées", async () => {
    const r = await parseBody(jsonReq({ email: "a@b.fr", nom: "Dupont" }), schema);
    expect(r).toEqual({ ok: true, data: { email: "a@b.fr", nom: "Dupont" } });
  });

  it("rejette un corps non conforme au schéma (e-mail invalide)", async () => {
    const r = await parseBody(jsonReq({ email: "pas-un-email", nom: "X" }), schema);
    expect(r.ok).toBe(false);
  });

  it("rejette un JSON illisible", async () => {
    const bad = new Request("http://x/test", {
      method: "POST",
      body: "{pas du json",
      headers: { "content-type": "application/json" },
    });
    const r = await parseBody(bad, schema);
    expect(r.ok).toBe(false);
  });
});
