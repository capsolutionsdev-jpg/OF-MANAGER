import { describe, expect, it } from "vitest";
import { clientIp, clientIpFromHeaders } from "@/lib/rate-limit";

/**
 * Test de non-régression — audit P1-3 : la clé IP du rate-limit ne doit pas être
 * spoofable via un x-forwarded-for forgé côté client. On privilégie x-real-ip
 * (posé par Vercel = IP réelle), sinon la DERNIÈRE entrée de XFF (hop de confiance),
 * jamais la partie gauche contrôlée par le client.
 */
function req(headers: Record<string, string>): Request {
  return new Request("https://x.test", { headers });
}

describe("clientIp / clientIpFromHeaders — anti-spoofing", () => {
  it("privilégie x-real-ip même si x-forwarded-for est forgé", () => {
    const r = req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9", "x-real-ip": "203.0.113.7" });
    expect(clientIp(r)).toBe("203.0.113.7");
  });

  it("ne renvoie JAMAIS la partie gauche (forgeable) de x-forwarded-for", () => {
    const r = req({ "x-forwarded-for": "66.66.66.66, 203.0.113.7" }); // pas de x-real-ip
    expect(clientIp(r)).not.toBe("66.66.66.66");
    expect(clientIp(r)).toBe("203.0.113.7"); // dernière entrée = hop de confiance
  });

  it("clientIpFromHeaders : x-real-ip prioritaire", () => {
    const h = new Headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "203.0.113.9" });
    expect(clientIpFromHeaders(h)).toBe("203.0.113.9");
  });

  it("clientIpFromHeaders : null si aucune source exploitable", () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });

  it("clientIp : 'unknown' si aucune source", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
