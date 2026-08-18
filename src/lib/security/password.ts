import "server-only";
import { createHash } from "crypto";

// Politique de mot de passe (§8) : longueur minimale + refus des mots de passe
// figurant dans une fuite connue (Have I Been Pwned). Helper réutilisable — à
// appeler dans tous les points qui définissent/changent un mot de passe.

/**
 * Le mot de passe figure-t-il dans une fuite connue ? Via l'API HIBP en
 * **k-anonymity** : on n'envoie QUE les 5 premiers caractères du SHA-1 (jamais le
 * mot de passe ni son hash complet). Best-effort : réseau HS → renvoie `false`
 * (fail-open, pour ne jamais bloquer un compte à cause d'une panne HIBP).
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch {
    return false; // HIBP indisponible → on n'empêche pas la définition du mot de passe
  }
}

/** Politique complète : longueur ≥ 8 ET non compromis. Renvoie un message si KO. */
export async function checkPasswordPolicy(password: string): Promise<{ ok: boolean; error?: string }> {
  if (!password || password.length < 8) {
    return { ok: false, error: "Le mot de passe doit faire au moins 8 caractères." };
  }
  if (await isPasswordPwned(password)) {
    return {
      ok: false,
      error: "Ce mot de passe figure dans une fuite de données connue — choisissez-en un autre.",
    };
  }
  return { ok: true };
}
