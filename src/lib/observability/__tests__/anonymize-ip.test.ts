import { test, expect } from "vitest";
import { anonymizeIp } from "@/lib/observability/anonymize-ip";

test("IPv4 : masque le dernier octet (/24)", () => {
  expect(anonymizeIp("192.168.1.42")).toBe("192.168.1.0");
});

test("IPv6 : conserve les 3 premiers groupes (~/48)", () => {
  expect(anonymizeIp("2001:41d0:301:abcd:1:2:3:4")).toBe("2001:41d0:301::");
});

test("valeur vide, nulle ou absente → 'unknown'", () => {
  expect(anonymizeIp("")).toBe("unknown");
  expect(anonymizeIp(undefined)).toBe("unknown");
  expect(anonymizeIp(null)).toBe("unknown");
});

test("chaîne non-IP → 'unknown'", () => {
  expect(anonymizeIp("pas-une-ip")).toBe("unknown");
});
