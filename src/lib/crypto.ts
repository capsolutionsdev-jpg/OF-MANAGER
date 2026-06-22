import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

// Chiffrement applicatif des secrets stockés en base (clés API tenant).
// AES-256-GCM, clé dérivée de SECRETS_ENCRYPTION_KEY (n'importe quelle longueur).
// - Si la variable d'env n'est pas définie : no-op (stockage en clair) → le dev
//   et l'existant continuent de fonctionner.
// - decryptSecret tolère les valeurs en clair héritées (migration progressive :
//   une clé est re-chiffrée à sa prochaine sauvegarde).

const PREFIX = "enc:v1:";

function key(): Buffer | null {
  const k = process.env.SECRETS_ENCRYPTION_KEY;
  if (!k) return null;
  return createHash("sha256").update(k).digest(); // 32 octets
}

/** Chiffre un secret. Refuse le stockage en clair en production (clé obligatoire). */
export function encryptSecret(plain: string | null | undefined): string | null {
  if (plain == null || plain === "") return plain ?? null;
  if (plain.startsWith(PREFIX)) return plain; // déjà chiffré
  const k = key();
  if (!k) {
    // En PRODUCTION, on refuse de stocker un secret en clair : la clé est
    // obligatoire (cf. SEC-04 / OPS-04). En dev, on tolère le clair.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SECRETS_ENCRYPTION_KEY manquante : stockage d'un secret tenant en clair refusé en production.",
      );
    }
    return plain; // dev → clair toléré
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/** Déchiffre un secret. Renvoie tel quel si en clair (hérité) ou null si illisible. */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (stored == null || stored === "") return null;
  if (!stored.startsWith(PREFIX)) return stored; // clair hérité
  const k = key();
  if (!k) return null; // chiffré mais clé absente → indéchiffrable
  const parts = stored.split(":"); // ["enc","v1",iv,tag,ct]
  try {
    const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(parts[2], "base64"));
    decipher.setAuthTag(Buffer.from(parts[3], "base64"));
    return Buffer.concat([decipher.update(Buffer.from(parts[4], "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
