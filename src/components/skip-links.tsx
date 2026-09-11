"use client";

import type { MouseEvent } from "react";

/**
 * Skip Link — accessibilité clavier (WCAG 2.4.1 Bypass Blocks).
 *
 * TOTALEMENT INVISIBLE tant qu'on n'appuie pas sur Tab (sr-only). Au focus (Tab),
 * le lien apparaît en haut à gauche.
 *
 * À l'activation, place le focus sur le repère principal : `#main-content` s'il
 * existe (layouts (app) / portail), sinon le PREMIER <main> de la page (pages
 * publiques, console…). Robuste sur tout le site sans exiger un id par page.
 */
export function SkipLinks() {
  function goToMain(e: MouseEvent<HTMLAnchorElement>) {
    const main =
      document.getElementById("main-content") ??
      document.querySelector("main");
    if (!main) return; // laisse le saut d'ancre natif par défaut
    e.preventDefault();
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    (main as HTMLElement).focus();
    main.scrollIntoView();
  }

  return (
    <a
      href="#main-content"
      onClick={goToMain}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Aller au contenu principal
    </a>
  );
}
