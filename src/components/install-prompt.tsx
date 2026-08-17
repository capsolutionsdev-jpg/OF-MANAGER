"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

/**
 * Phase 3.5 — Install Prompt (PWA)
 * Display install button when app is installable
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === "accepted") {
      setPrompt(null);
    }
  };

  if (isInstalled || !prompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Installer OF Manager
          </h3>
          <p className="text-sm text-muted-foreground">
            Accédez rapidement depuis votre écran d'accueil
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={handleInstall}
        className="w-full mt-3 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        <Download className="h-4 w-4" />
        Installer
      </button>
    </div>
  );
}
