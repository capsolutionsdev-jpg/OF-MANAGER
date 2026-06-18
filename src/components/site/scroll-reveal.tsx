"use client";

import { useEffect } from "react";

/**
 * Animations d'apparition au scroll pour les pages vitrine.
 * Cible automatiquement les <section> de <main> (en sautant les `skip`
 * premières — typiquement le hero) sans toucher au markup. Les sections déjà
 * visibles au chargement apparaissent sans animation (pas de flash) ;
 * accessibilité : respecte prefers-reduced-motion (cf. globals.css). Sans JS,
 * tout reste visible.
 */
export function ScrollReveal({ skip = 2 }: { skip?: number }) {
  useEffect(() => {
    document.documentElement.classList.add("reveal-on");
    const sections = Array.from(document.querySelectorAll<HTMLElement>("main > section")).slice(skip);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const vh = window.innerHeight;
    sections.forEach((sec) => {
      sec.classList.add("reveal");
      if (sec.getBoundingClientRect().top < vh * 0.88) {
        sec.classList.add("in"); // déjà visible → pas d'animation, pas de flash
      } else {
        io.observe(sec);
      }
    });
    return () => io.disconnect();
  }, [skip]);

  return null;
}
