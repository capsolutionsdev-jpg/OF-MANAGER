"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type RailCtx = { collapsed: boolean; toggle: () => void };

const RailContext = createContext<RailCtx>({ collapsed: false, toggle: () => {} });

/** État du rail latéral (replié / déployé), partagé entre le rail et la barre du haut. */
export const useRail = () => useContext(RailContext);

export function RailProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // L'attribut `data-rail-collapsed` est posé AVANT l'hydratation par un petit
  // script inline (anti-flash) ; on s'aligne dessus après le montage — jamais
  // dans l'initialiseur d'état pour ne pas casser l'hydratation SSR.
  useEffect(() => {
    setCollapsed(document.documentElement.hasAttribute("data-rail-collapsed"));
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      const root = document.documentElement;
      if (next) root.setAttribute("data-rail-collapsed", "");
      else root.removeAttribute("data-rail-collapsed");
      try {
        localStorage.setItem("ofm.rail.collapsed", next ? "1" : "0");
      } catch {
        /* stockage indisponible : on garde l'état en mémoire */
      }
      return next;
    });
  }, []);

  return <RailContext.Provider value={{ collapsed, toggle }}>{children}</RailContext.Provider>;
}
