"use client";

import { useEffect } from "react";

/**
 * Enregistrement des notifications push — s'exécute UNIQUEMENT dans l'app mobile
 * native (Capacitor) : demande la permission, s'inscrit auprès de FCM (Android) /
 * APNs (iOS), et envoie le jeton d'appareil au serveur (/api/push/register).
 * Ne fait STRICTEMENT rien côté web (rendu `null`).
 *
 * Le plugin est importé dynamiquement pour ne pas peser sur le bundle web.
 * Monté dans le layout de l'espace connecté (app)/layout.tsx.
 */
export function PushRegistrar() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const cap = (
        window as unknown as {
          Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
        }
      ).Capacitor;
      // Contexte natif uniquement.
      if (!cap?.isNativePlatform?.()) return;

      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const platform = cap.getPlatform?.() ?? "android";

        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== "granted") return;

        await PushNotifications.addListener("registration", (token) => {
          if (cancelled) return;
          void fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: token.value, platform }),
          }).catch(() => {});
        });
        await PushNotifications.addListener("registrationError", () => {});

        await PushNotifications.register();
      } catch {
        // Plugin indisponible (web) ou erreur native : sans effet.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
