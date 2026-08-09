import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  parseResendEmailEvent,
  verifySvixSignature,
  RESEND_EVENT_MAP,
} from "@/lib/growth/resend-webhook";

// Secret de test au format Resend « whsec_<base64> ».
const SECRET = "whsec_" + Buffer.from("cle-de-signature-de-test-0123456789").toString("base64");
const ID = "msg_2abc";
const TS = "1786000000"; // secondes UNIX
const NOW = Number(TS) * 1000;

function sign(secret: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return "v1," + createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

describe("parseResendEmailEvent()", () => {
  it("email.opened → email_ouvert (destinataire en tableau)", () => {
    const evt = parseResendEmailEvent({
      type: "email.opened",
      data: { to: ["jean@of.fr"], subject: "Votre démo" },
    });
    expect(evt).toEqual({ type: "email_ouvert", email: "jean@of.fr", link: null, subject: "Votre démo" });
  });

  it("email.clicked → email_clic (avec lien, destinataire en chaîne)", () => {
    const evt = parseResendEmailEvent({
      type: "email.clicked",
      data: { to: "Jean@OF.fr", click: { link: "https://app.ofmanager.fr/login" } },
    });
    expect(evt).toEqual({
      type: "email_clic",
      email: "jean@of.fr", // normalisé en minuscules
      link: "https://app.ofmanager.fr/login",
      subject: null,
    });
  });

  it("ignore les événements non suivis (delivered/bounced)", () => {
    expect(parseResendEmailEvent({ type: "email.delivered", data: { to: ["a@b.fr"] } })).toBeNull();
    expect(parseResendEmailEvent({ type: "email.bounced", data: { to: ["a@b.fr"] } })).toBeNull();
  });

  it("ignore si destinataire absent", () => {
    expect(parseResendEmailEvent({ type: "email.opened", data: {} })).toBeNull();
  });

  it("mappe uniquement opened/clicked", () => {
    expect(RESEND_EVENT_MAP["email.opened"]).toBe("email_ouvert");
    expect(RESEND_EVENT_MAP["email.clicked"]).toBe("email_clic");
    expect(RESEND_EVENT_MAP["email.sent"]).toBeUndefined();
  });
});

describe("verifySvixSignature()", () => {
  const body = JSON.stringify({ type: "email.opened", data: { to: ["a@b.fr"] } });

  it("accepte une signature valide", () => {
    const signature = sign(SECRET, ID, TS, body);
    expect(verifySvixSignature({ secret: SECRET, id: ID, timestamp: TS, signature, rawBody: body }, NOW)).toBe(true);
  });

  it("accepte parmi plusieurs signatures dans l'en-tête", () => {
    const good = sign(SECRET, ID, TS, body);
    const header = `v1,mauvaise ${good}`;
    expect(verifySvixSignature({ secret: SECRET, id: ID, timestamp: TS, signature: header, rawBody: body }, NOW)).toBe(true);
  });

  it("refuse un mauvais secret", () => {
    const signature = sign(SECRET, ID, TS, body);
    const other = "whsec_" + Buffer.from("autre-secret").toString("base64");
    expect(verifySvixSignature({ secret: other, id: ID, timestamp: TS, signature, rawBody: body }, NOW)).toBe(false);
  });

  it("refuse un corps altéré (rejeu/falsification)", () => {
    const signature = sign(SECRET, ID, TS, body);
    const tampered = body.replace("a@b.fr", "attaquant@evil.fr");
    expect(verifySvixSignature({ secret: SECRET, id: ID, timestamp: TS, signature, rawBody: tampered }, NOW)).toBe(false);
  });

  it("refuse un horodatage hors tolérance (anti-rejeu)", () => {
    const signature = sign(SECRET, ID, TS, body);
    const tropTard = NOW + 20 * 60_000; // +20 min
    expect(verifySvixSignature({ secret: SECRET, id: ID, timestamp: TS, signature, rawBody: body }, tropTard)).toBe(false);
  });

  it("refuse si des en-têtes manquent", () => {
    const signature = sign(SECRET, ID, TS, body);
    expect(verifySvixSignature({ secret: SECRET, id: "", timestamp: TS, signature, rawBody: body }, NOW)).toBe(false);
    expect(verifySvixSignature({ secret: "", id: ID, timestamp: TS, signature, rawBody: body }, NOW)).toBe(false);
  });
});
