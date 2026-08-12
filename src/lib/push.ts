import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Envoi de notifications push (app mobile) via Firebase Cloud Messaging.
 *
 * Configuration requise (sinon no-op sûr) :
 *  - `PUSH_ENABLED=true`
 *  - `FIREBASE_SERVICE_ACCOUNT` = JSON du compte de service Firebase
 *    (soit le JSON brut, soit encodé en base64).
 *
 * Ce module est SERVEUR uniquement (firebase-admin + prisma) : ne jamais
 * l'importer depuis un composant client.
 */

function messaging() {
  if (process.env.PUSH_ENABLED !== "true") return null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (getApps().length === 0) {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return getMessaging();
}

/**
 * Envoie une notification à TOUS les appareils enregistrés d'un utilisateur.
 * Nettoie automatiquement les jetons devenus invalides (app désinstallée).
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ sent: number; skipped?: boolean }> {
  const msg = messaging();
  if (!msg) return { sent: 0, skipped: true };

  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return { sent: 0 };

  const res = await msg.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });

  // Purge des jetons invalides.
  const stale: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        stale.push(tokens[i].token);
      }
    }
  });
  if (stale.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
  }

  return { sent: res.successCount };
}

// Rôles « staff » d'un organisme (destinataires des notifications métier).
const STAFF_ROLES: Role[] = ["ADMIN", "RESPONSABLE_FORMATION", "ASSISTANT"];

/**
 * Envoie une notification à TOUS les collaborateurs (staff actif) d'un organisme.
 * No-op sûr si FCM non configuré ou si aucun appareil enregistré.
 */
export async function sendPushToOrgStaff(
  organismeId: string | null | undefined,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<{ sent: number; skipped?: boolean }> {
  const msg = messaging();
  if (!msg) return { sent: 0, skipped: true };
  if (!organismeId) return { sent: 0 };

  const staff = await prisma.user.findMany({
    where: { organismeId, isActive: true, role: { in: STAFF_ROLES } },
    select: { id: true },
  });
  if (staff.length === 0) return { sent: 0 };

  const tokens = await prisma.deviceToken.findMany({
    where: { userId: { in: staff.map((u) => u.id) } },
    select: { token: true },
  });
  if (tokens.length === 0) return { sent: 0 };

  const res = await msg.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
  });

  const stale: string[] = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code ?? "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        stale.push(tokens[i].token);
      }
    }
  });
  if (stale.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
  }

  return { sent: res.successCount };
}
