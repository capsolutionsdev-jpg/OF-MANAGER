"use client";

import { useCallback, useEffect, useRef } from "react";
import { createContext, useContext, useState } from "react";

/**
 * Phase 2.4 — Aria-live Region Global
 *
 * Annonces accessibles pour lecteur d'écran :
 * - Notifications (toast-like)
 * - Erreurs de formulaire
 * - Changements de contenu
 * - Statuts de chargement
 */

type AriaLiveMessage = {
  id: string;
  message: string;
  type: "polite" | "assertive";
  duration?: number; // ms, auto-dismiss
};

type AriaLiveContextType = {
  announce: (message: string, type?: "polite" | "assertive", duration?: number) => void;
};

const AriaLiveContext = createContext<AriaLiveContextType | null>(null);

export function AriaLiveProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<AriaLiveMessage[]>([]);

  // Compteur monotone pour éviter collisions d'id (Date.now() peut collisionner
  // si announce() est appelé plusieurs fois dans la même ms).
  const idCounterRef = useRef(0);
  // Registre des timeouts pour cleanup au démontage (fuite mémoire sinon).
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const map = timeoutsRef.current;
    return () => {
      mountedRef.current = false;
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const announce = useCallback(
    (
      message: string,
      type: "polite" | "assertive" = "polite",
      duration = 5000
    ) => {
      idCounterRef.current += 1;
      const id = `aria-${Date.now()}-${idCounterRef.current}`;
      const newMessage: AriaLiveMessage = { id, message, type, duration };

      setMessages((prev) => [...prev, newMessage]);

      // Auto-remove after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          timeoutsRef.current.delete(id);
          if (!mountedRef.current) return;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }, duration);
        timeoutsRef.current.set(id, timer);
      }
    },
    []
  );

  return (
    <AriaLiveContext.Provider value={{ announce }}>
      {children}

      {/* Polite announcements (interrupts user) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {messages
          .filter((m) => m.type === "polite")
          .map((m) => (
            <span key={m.id}>{m.message}</span>
          ))}
      </div>

      {/* Assertive announcements (urgent alerts) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {messages
          .filter((m) => m.type === "assertive")
          .map((m) => (
            <span key={m.id}>{m.message}</span>
          ))}
      </div>
    </AriaLiveContext.Provider>
  );
}

/**
 * Hook to announce messages to screen readers
 *
 * Usage:
 * const { announce } = useAriaLive();
 * announce("Formation créée avec succès"); // polite
 * announce("Erreur : email invalide", "assertive"); // urgent
 */
export function useAriaLive() {
  const context = useContext(AriaLiveContext);
  if (!context) {
    throw new Error("useAriaLive must be used within AriaLiveProvider");
  }
  return context;
}
