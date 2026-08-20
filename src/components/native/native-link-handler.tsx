"use client";

import { useEffect } from "react";

// Routes (même origine) qui renvoient un DOCUMENT/PDF à afficher dans l'app.
const DOC_RE =
  /(documents?|titres?|diplomes?|attestation|officiel|defraiement|facture|contrat|emargement|feuille|\/piece\/|parcours-t3p)(\/|$|\?|#)|\.pdf(\?|#|$)/i;

/**
 * Dans l'app mobile native, ouvre les DOCUMENTS (liens `target="_blank"` et
 * `window.open` vers un PDF de même origine) dans l'afficheur PDF intégré
 * (`PdfViewerModal`) — la WebView, seule, ne sait pas afficher les PDF.
 * Sans effet sur le web (rendu `null`). Monté dans `(app)/layout.tsx`.
 */
export function NativeLinkHandler() {
  useEffect(() => {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    const isDoc = (raw: string): string | null => {
      try {
        const u = new URL(raw, window.location.href);
        if (u.origin !== window.location.origin) return null;
        return DOC_RE.test(u.pathname + u.search) ? u.href : null;
      } catch {
        return null;
      }
    };

    const openPdf = (url: string, title?: string) => {
      window.dispatchEvent(new CustomEvent("ofm:open-pdf", { detail: { url, title } }));
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      if (a.getAttribute("target") !== "_blank") return;
      const doc = isDoc(href);
      if (doc) {
        e.preventDefault();
        openPdf(doc, a.textContent?.trim() || "Document");
      }
    };
    document.addEventListener("click", onClick, true);

    // window.open(...) (titres / diplômes / factures).
    const originalOpen = window.open;
    window.open = ((url?: string | URL) => {
      const doc = url ? isDoc(String(url)) : null;
      if (doc) {
        openPdf(doc);
        return null;
      }
      return originalOpen.call(window);
    }) as typeof window.open;

    return () => {
      document.removeEventListener("click", onClick, true);
      window.open = originalOpen;
    };
  }, []);

  return null;
}
