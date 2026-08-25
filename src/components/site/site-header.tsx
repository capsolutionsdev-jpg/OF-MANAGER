// src/components/site/site-header.tsx
// En-tête PARTAGÉ de toutes les pages marketing. Une seule source → fini la dérive
// (chaque page avait sa propre barre). Responsive : menu déroulant sous lg.
"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";

const NAV: [string, string][] = [
  ["/fonctionnalites", "Fonctionnalités"],
  ["/anti-fraude", "Anti-fraude"],
  ["/comparatif", "Comparatif"],
  ["/tarifs", "Tarifs"],
  ["/guides", "Blog"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="OFManager — accueil"><Logo /></Link>

        <nav className="ml-8 hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="transition-colors hover:text-[#3B6EF5]">{label}</Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#0D1B3E]">Connexion</Link>
          <Link href="/demo" className="rounded-xl bg-[#3B6EF5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2954D4]">Demander une démo</Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-[#0D1B3E] hover:bg-slate-100 lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{label}</Link>
            ))}
            <div className="mt-2 flex gap-3 px-1">
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-[#0D1B3E]">Connexion</Link>
              <Link href="/demo" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-[#3B6EF5] px-4 py-2.5 text-center text-sm font-semibold text-white">Démo</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
