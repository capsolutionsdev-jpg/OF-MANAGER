"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (PWA) côté client, uniquement en production
 * (évite d'interférer avec le HMR en développement). Rendu invisible.
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* enregistrement non bloquant : l'app fonctionne sans SW */
      });
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
