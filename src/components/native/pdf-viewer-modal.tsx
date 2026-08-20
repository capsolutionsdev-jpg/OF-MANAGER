"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, ExternalLink } from "lucide-react";

/**
 * Afficheur PDF PLEIN ÉCRAN pour l'app mobile native (WebView) — qui, seule, ne
 * sait PAS afficher les PDF. On récupère le document AVEC les cookies de session
 * (`credentials: "include"`) donc l'authentification est préservée, puis on le
 * rend via pdf.js (canvas). 100 % web : aucun plugin natif, aucune réinstallation.
 *
 * S'ouvre sur l'événement global `ofm:open-pdf` (émis par NativeLinkHandler).
 * Monté dans `(app)/layout.tsx`.
 */
export function PdfViewerModal() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Document");
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const pagesRef = useRef<HTMLDivElement>(null);

  // Écoute la demande d'ouverture.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent).detail as { url: string; title?: string };
      if (!d?.url) return;
      setUrl(d.url);
      setTitle(d.title || "Document");
      setStatus("loading");
      setOpen(true);
    };
    window.addEventListener("ofm:open-pdf", onOpen as EventListener);
    return () => window.removeEventListener("ofm:open-pdf", onOpen as EventListener);
  }, []);

  // Charge + rend le PDF.
  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const host = pagesRef.current;
        if (!host || cancelled) return;
        host.innerHTML = "";

        const targetW = Math.min(host.clientWidth - 16, 1000);
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const scale = targetW / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "mx-auto mb-3 max-w-full rounded bg-white shadow-md";
          host.appendChild(canvas);
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const close = () => {
    setOpen(false);
    setUrl(null);
    if (pagesRef.current) pagesRef.current.innerHTML = "";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-900" role="dialog" aria-modal="true">
      <div className="flex items-center gap-2 border-b border-white/10 bg-neutral-800 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir dans le navigateur" className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
        <button type="button" onClick={close} aria-label="Fermer" className="rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex-1 overflow-y-auto overscroll-contain">
        <div ref={pagesRef} className="p-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" />
        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-sm text-white/80">
            <p>Impossible d&apos;afficher ce document ici.</p>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 font-medium text-white hover:bg-white/20">
                <ExternalLink className="h-4 w-4" /> Ouvrir autrement
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
