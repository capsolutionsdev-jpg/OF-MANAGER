"use strict";
/**
 * Garde d'hôte partagée pour les scripts d'écriture/purge (audit A09-004).
 *
 * Refuse de tourner contre une base "distante" non explicitement reconnue comme
 * locale ou de test. GÉNÉRIQUE et tenant-agnostique : n'embarque AUCUN hôte de
 * production en dur — on raisonne par allowlist + accusé de réception explicite.
 *
 * Autorisé sans confirmation :
 *   - localhost / 127.0.0.1 / ::1
 *   - hôte marqué test/staging/preview/.local
 *   - DATABASE_URL === DATABASE_URL_TEST
 * Sinon, il faut confirmer volontairement l'hôte cible :
 *   ALLOW_DB_WRITE=<host-exact> node scripts/mon-script.cjs
 *
 * Usage :
 *   const { assertSafeDb } = require("./_guard.cjs");
 *   assertSafeDb({ label: "mon-script" }); // AVANT toute écriture Prisma
 */

function dbHost(url) {
  try {
    return new URL(url).host || "";
  } catch {
    return "";
  }
}

function assertSafeDb(opts) {
  const label = (opts && opts.label) || "script d'écriture";
  const url = process.env.DATABASE_URL || "";
  const host = dbHost(url);

  const isLocal =
    /^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?$/i.test(host) ||
    /@(localhost|127\.0\.0\.1)/i.test(url);
  const looksTest = /(_test|-test|test-|staging|preview|dev-branch|\.local)/i.test(host);
  const isTestUrl = !!process.env.DATABASE_URL_TEST && url === process.env.DATABASE_URL_TEST;
  const acked = !!process.env.ALLOW_DB_WRITE && host !== "" && process.env.ALLOW_DB_WRITE === host;

  if (isLocal || looksTest || isTestUrl || acked) return host || "(inconnue)";

  console.error(
    "\n⛔ " +
      label +
      " BLOQUÉ — base cible non reconnue comme locale/test (audit A09-004).\n" +
      "   Base ciblée : " +
      (host || "(inconnue)") +
      "\n" +
      "   • Recommandé : pointer DATABASE_URL vers une branche Neon de test.\n" +
      "   • Pour forcer volontairement CET hôte (défense en profondeur) :\n" +
      "       ALLOW_DB_WRITE=" +
      (host || "<host>") +
      " <commande>\n",
  );
  process.exit(1);
}

module.exports = { assertSafeDb, dbHost };
