"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bascule clair/sombre. Le choix est mémorisé (localStorage "theme") et
 * appliqué avant le premier rendu par le script inline du layout racine
 * (aucun flash). Par défaut : mode clair.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : le thème reste pour la session */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={dark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {/* Icône stable au premier rendu (SSR), puis selon le thème réel */}
      {mounted && dark ? (
        <Sun className="h-4.5 w-4.5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="h-4.5 w-4.5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </Button>
  );
}
