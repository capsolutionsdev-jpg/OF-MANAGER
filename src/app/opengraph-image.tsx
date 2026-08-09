import { ImageResponse } from "next/og";

// Bannière OpenGraph 1200×630 générée en code (next/og) — remplace le logo
// brut dans les aperçus de partage (LinkedIn, WhatsApp, X…). Fichier-convention
// Next : il prime sur `openGraph.images` du layout. Design aligné sur la
// landing v2 (navy #0D1B3E, bleu #3B6EF5, ambre VTC #E8A33D, vert conforme).
// Pas d'emoji : Satori ne les rend pas sans police dédiée.
export const alt =
  "OFManager — Le logiciel des organismes de formation en sécurité privée & VTC/Taxi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #070f28 0%, #0D1B3E 55%, #12245a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Marque */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 18,
              background: "linear-gradient(135deg, #3B6EF5, #2954d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            OF
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>OFManager</div>
        </div>

        {/* Titre + sous-titre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 980,
            }}
          >
            Le logiciel des organismes de formation réglementés.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#c2cee9", maxWidth: 900 }}>
            Documents automatiques, prérequis & recyclages suivis, audit Qualiopi prêt en un clic.
          </div>
          {/* Chips métiers */}
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "2px solid rgba(59,110,245,.65)",
                background: "rgba(59,110,245,.16)",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 23,
                fontWeight: 700,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 999, background: "#3B6EF5", display: "flex" }} />
              Sécurité privée — APS · SSIAP · SST
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "2px solid rgba(232,163,61,.65)",
                background: "rgba(232,163,61,.14)",
                borderRadius: 999,
                padding: "10px 22px",
                fontSize: 23,
                fontWeight: 700,
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: 999, background: "#E8A33D", display: "flex" }} />
              VTC / Taxi — Examen T3P
            </div>
          </div>
        </div>

        {/* Bandeau de confiance */}
        <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 22, color: "#aab8d8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#12B886", display: "flex" }} />
            Conforme Qualiopi — 32 indicateurs
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: "#12B886", display: "flex" }} />
            RGPD · Hébergement France
          </div>
          <div style={{ display: "flex", marginLeft: "auto", color: "#8fa0c6" }}>
            Édité par CAP Compétences
          </div>
        </div>
      </div>
    ),
    size,
  );
}
