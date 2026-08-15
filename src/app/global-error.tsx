"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Filet de sécurité ultime : capture une erreur survenue dans le layout RACINE
// (que (app)/error.tsx ne peut pas attraper). Doit rendre son propre <html>/<body>.
// Styles inline car le CSS global n'est pas garanti à ce niveau. Remonte à Sentry
// (no-op sans DSN).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#0D1B3E",
          color: "#eaf0ff",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 .5rem" }}>
          Une erreur est survenue
        </h1>
        <p style={{ maxWidth: 460, color: "#a8b9d1", fontSize: ".95rem", margin: "0 0 1.5rem" }}>
          Le service a rencontré un problème inattendu. Nos équipes en sont informées.
          Vous pouvez réessayer ; si le problème persiste, contactez le support.
        </p>
        <button
          onClick={() => reset()}
          style={{
            cursor: "pointer",
            border: "none",
            borderRadius: 8,
            padding: ".6rem 1.2rem",
            fontSize: ".9rem",
            fontWeight: 600,
            background: "#1A5FD4",
            color: "#fff",
          }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}
