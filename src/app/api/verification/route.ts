import { prisma } from "@/lib/prisma";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { verifyDob, genSel, hashDob } from "@/lib/anti-fraude/hash";
import { getTitreDef, checkLuhn } from "@/lib/documents/titres";
import { organismeScope } from "@/lib/public-scope";
import { anonymizeIp } from "@/lib/observability/anonymize-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * API publique de vérification anti-fraude d'un titre délivré.
 *
 * POST { numero, date_naissance } → réponse binaire :
 *  - correspondance (valide / expiré) : champs minimaux (initiale du prénom,
 *    intitulé, dates, statut, organisme) ;
 *  - AUCUNE correspondance (numéro inconnu, date incorrecte, format invalide,
 *    titre révoqué / annulé) : un UNIQUE message générique.
 *
 * Sécurité : POST only, rate-limit 5/IP/10 min, captcha Turnstile, comparaison
 * de la date de naissance par HASH salé à TEMPS CONSTANT, logs minimalistes
 * (IP + horodatage + résultat), jamais le contenu de la requête.
 */

const GENERIC = {
  match: false as const,
  message: "Aucune correspondance trouvée pour ces informations.",
};

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Enregistrement leurre : garantit un travail de hachage CONSTANT même quand le
// numéro est inconnu (pas d'oracle d'existence par timing).
const DUMMY_SEL = genSel();
const DUMMY_HASH = hashDob(new Date("1900-01-01"), DUMMY_SEL);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** Vérifie le captcha Cloudflare Turnstile (ignoré si non configuré). */
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Correctif audit P2-6 : en PRODUCTION, l'absence de clé = fail-closed
    // (sinon le captcha est inactif). En dev, on n'enferme pas.
    if (process.env.NODE_ENV === "production") {
      console.error("[verification] TURNSTILE_SECRET_KEY non défini en production → captcha refusé.");
      return false;
    }
    return true;
  }
  if (!token) return false;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await r.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

/** Rejette un numéro d'attestation mal formé (clé de Luhn) avant toute requête base. */
function formatPlausible(numero: string): boolean {
  // Attestations : [CODE_OF-]PRÉFIXE-…-SEQ-CLÉ (Luhn). Le préfixe de type suit un
  // code OF OPTIONNEL de 6 caractères (ex. `K7M2Q4-RECYC-…`, ou l'ancien `RECYC-…`).
  // Regex ancrée (préfixe OF de 6 car. facultatif) pour ne PAS confondre un numéro
  // préfectoral de diplôme qui contiendrait « FC »/« HAB » dans le champ agrément.
  // Diplômes SSIAP : numéro préfectoral, pas de Luhn → non concerné.
  if (/^(?:[A-Z0-9]{6}-)?(RECYC|RAN|FC|HAB)-/i.test(numero)) return checkLuhn(numero);
  return true;
}

const dateOut = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function POST(req: Request) {
  const ip = clientIp(req);

  // Rate limiting : 5 tentatives / IP / 10 minutes.
  const rl = await checkLimit(`verif:${ip}`, { limit: 5, windowMs: 600_000 });
  if (!rl.ok) {
    return json(
      { match: false, message: "Trop de tentatives. Réessayez plus tard." },
      429,
    );
  }

  let body: { numero?: string; date_naissance?: string; turnstileToken?: string };
  try {
    body = await req.json();
  } catch {
    return json(GENERIC);
  }
  const numero = (body.numero ?? "").trim();
  const dob = (body.date_naissance ?? "").trim();

  // Captcha.
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return json({ match: false, message: "Vérification anti-robot requise." }, 400);
  }

  // IP anonymisée (RGPD) : suffisant pour l'analyse anti-fraude réseau, sans
  // journaliser l'adresse complète (donnée personnelle) — audit A08-017.
  const log = (result: "match" | "no-match") =>
    console.log(
      JSON.stringify({ t: new Date().toISOString(), ip: anonymizeIp(ip), ev: "verification", result }),
    );

  // Format invalide → générique (sans requête base).
  if (!numero || !dob || !formatPlausible(numero)) {
    log("no-match");
    return json(GENERIC);
  }

  // Portée multi-tenant : on privilégie le paramètre `?organisme=` envoyé par la
  // vitrine (comme toutes les autres API publiques), avec repli sur l'env. La
  // lecture en dur de l'env était la SEULE route publique à ne pas le faire → si
  // l'env était erroné/périmé, aucune attestation ne correspondait (bug #12).
  const organismeId = organismeScope(req);
  const rec = await prisma.titreDelivre.findFirst({
    where: { numeroVerification: numero, ...(organismeId ? { organismeId } : {}) },
  });

  // Comparaison de la date de naissance à TEMPS CONSTANT (leurre si non trouvé).
  const dobOk = rec
    ? verifyDob(dob, rec.selUnique, rec.hashDateNaissance)
    : (verifyDob(dob, DUMMY_SEL, DUMMY_HASH), false);

  // Statuts masqués (révoqué / annulé / archivé) → même réponse générique.
  const masque = !rec || rec.statut === "REVOQUE" || rec.statut === "ANNULE" || rec.statut === "ARCHIVE";

  if (!rec || !dobOk || masque) {
    log("no-match");
    return json(GENERIC);
  }

  const expire =
    rec.statut === "EXPIRE" || (rec.dateFinValidite ? new Date() > rec.dateFinValidite : false);
  const def = getTitreDef(rec.typeCode);
  const initiale = rec.prenomTitulaire.trim().charAt(0).toUpperCase();

  log("match");
  return json({
    match: true,
    titulaire: `${rec.nomTitulaire.toUpperCase()} ${initiale}.`,
    titre: def?.label ?? "Titre délivré",
    numero: rec.numeroVerification,
    date_delivrance: dateOut(rec.dateDelivrance),
    date_fin_validite: dateOut(rec.dateFinValidite),
    statut: expire ? "expiré" : "valide",
    organisme: rec.organismeSignataire,
  });
}
