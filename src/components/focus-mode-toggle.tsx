"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Mode « plein écran » : masque les barres (rail latéral + barre du haut) pour
 * maximiser la surface de travail, et tente le vrai plein écran du navigateur.
 * Un bouton flottant permet de revenir à l'affichage normal (les barres étant
 * masquées, on ne peut plus utiliser le bouton d'origine).
 */
export function FocusModeToggle() {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("focus-mode", on);
    // Plein écran natif (bonus, best-effort) — sans casser si refusé/indispo.
    try {
      if (on && !document.fullscreenElement) {
        void document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (!on && document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      /* plein écran natif indisponible — le masquage des barres suffit */
    }
    return () => root.classList.remove("focus-mode");
  }, [on]);

  // Sortie du plein écran natif (touche Échap) → on ré-affiche les barres.
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setOn(false);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label="Plein écran (masquer les barres)"
        title="Plein écran"
        onClick={() => setOn((v) => !v)}
      >
        <Maximize2 className="h-[18px] w-[18px]" />
      </Button>

      {mounted &&
        on &&
        createPortal(
          <button
            type="button"
            onClick={() => setOn(false)}
            className="fixed right-3 top-3 z-[60] inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur hover:bg-muted"
            title="Quitter le plein écran"
          >
            <Minimize2 className="h-4 w-4" /> Quitter le plein écran
          </button>,
          document.body,
        )}
    </>
  );
}
