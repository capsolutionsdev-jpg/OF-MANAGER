import "server-only";
import { createHmac, randomBytes } from "crypto";

// Implémentation TOTP (RFC 6238) sans dépendance externe — pour la double
// authentification des comptes à privilèges. Compatible Google Authenticator,
// Authy, 1Password, etc. (SHA-1, 6 chiffres, période 30 s).

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Génère un secret partagé (160 bits) encodé en base32. */
export function generateTotpSecret(): string {
  const buf = randomBytes(20);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of clean) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

/** Code TOTP courant pour un secret (utile aux tests et à la vérification). */
export function totpCode(secretBase32: string, atMs: number = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / 30);
  return hotp(base32Decode(secretBase32), counter);
}

/** Vérifie un code à 6 chiffres avec une tolérance de ±`window` périodes. */
export function verifyTotp(secretBase32: string, token: string, window = 1): boolean {
  const t = (token ?? "").trim();
  if (!/^\d{6}$/.test(t)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, counter + w) === t) return true;
  }
  return false;
}

/** URI otpauth:// à encoder en QR code pour l'enrôlement. */
export function otpauthUri(secretBase32: string, label: string, issuer = "OFManager"): string {
  const l = encodeURIComponent(label);
  const i = encodeURIComponent(issuer);
  return `otpauth://totp/${i}:${l}?secret=${secretBase32}&issuer=${i}&digits=6&period=30`;
}
