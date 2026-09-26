import { describe, it, expect } from "vitest";
import { isEgressAllowed, isPrivateHost } from "@/lib/pdf";

/**
 * Non-régression SSRF (audit OFM-20). Le rendu PDF Chromium intercepte ses requêtes
 * sortantes via `isEgressAllowed` : il doit BLOQUER les cibles internes (metadata cloud,
 * loopback, RFC1918, link-local) et les schémas non-web, tout en LAISSANT PASSER les
 * ressources légitimes (polices Google, logos publics https, images data:).
 */
describe("isEgressAllowed (filtre anti-SSRF du rendu PDF)", () => {
  it("BLOQUE les cibles internes et cloud-metadata", () => {
    for (const u of [
      "http://169.254.169.254/latest/meta-data/", // metadata AWS/GCP
      "http://127.0.0.1:8080/",
      "http://localhost/admin",
      "http://10.1.2.3/",
      "http://192.168.0.1/",
      "http://172.16.5.4/",
      "http://100.64.0.1/", // CGNAT
      "http://[::1]/",
      "http://service.internal/",
      "http://db.local/",
    ]) {
      expect(isEgressAllowed(u), `${u} doit être bloqué`).toBe(false);
    }
  });

  it("BLOQUE les schémas non-web", () => {
    expect(isEgressAllowed("file:///etc/passwd")).toBe(false);
    expect(isEgressAllowed("ftp://example.com/x")).toBe(false);
    expect(isEgressAllowed("gopher://x/")).toBe(false);
    expect(isEgressAllowed("pas-une-url")).toBe(false);
  });

  it("AUTORISE les ressources légitimes (polices, logos publics, data:)", () => {
    for (const u of [
      "https://fonts.googleapis.com/css2?family=Roboto",
      "https://fonts.gstatic.com/s/roboto/v30/x.woff2",
      "https://cdn.exemple.fr/logo-of.png",
      "https://ofmanager.info/logo.png",
      "http://fcbarcelona.com/", // hôte public commençant par « fc » ≠ IPv6 fc00::/7
      "data:image/png;base64,iVBORw0KGgo=",
      "blob:https://ofmanager.info/uuid",
      "about:blank",
    ]) {
      expect(isEgressAllowed(u), `${u} doit être autorisé`).toBe(true);
    }
  });

  it("isPrivateHost : IPv4/IPv6 internes vs hôtes publics", () => {
    expect(isPrivateHost("169.254.169.254")).toBe(true);
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("::1")).toBe(true);
    expect(isPrivateHost("fd00::1")).toBe(true);
    expect(isPrivateHost("ofmanager.info")).toBe(false);
    expect(isPrivateHost("fcbarcelona.com")).toBe(false); // pas d'IPv6 → public
    expect(isPrivateHost("8.8.8.8")).toBe(false);
  });
});
