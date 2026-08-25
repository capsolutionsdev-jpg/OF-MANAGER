// src/components/site/site-footer.tsx
// Pied de page PARTAGÉ de toutes les pages marketing. Rend TOUTES les pages
// découvrables (avant, chaque footer listait un sous-ensemble différent).
import Link from "next/link";
import { Logo } from "./logo";

const COLS: { h: string; links: [string, string][] }[] = [
  { h: "Produit", links: [["Fonctionnalités", "/fonctionnalites"], ["Anti-fraude", "/anti-fraude"], ["Comparatif", "/comparatif"], ["Tarifs", "/tarifs"]] },
  { h: "Ressources", links: [["Blog", "/guides"], ["Glossaire", "/glossaire"], ["Vérifier un titre", "/verification"], ["Partenaires", "/partenaires"]] },
  { h: "Solutions", links: [["TFP APS", "/solutions/tfp-aps"], ["SSIAP", "/solutions/ssiap"], ["SST", "/solutions/sst"], ["VTC / Taxi", "/solutions/vtc-taxi"], ["Qualiopi", "/solutions/qualiopi"]] },
  { h: "Légal", links: [["Mentions légales", "/mentions-legales"], ["CGV", "/cgv"], ["Confidentialité", "/confidentialite"], ["Contact", "/contact"]] },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0D1B3E] text-[#aebbd6]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="dark" />
          <p className="mt-4 max-w-[260px] text-sm leading-relaxed">Le logiciel des organismes de formation réglementés : sécurité privée &amp; VTC/Taxi.</p>
          <p className="mt-3 text-sm">Édité par <strong className="text-white">CAP SOLUTIONS</strong></p>
        </div>
        {COLS.map((c) => (
          <div key={c.h}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white" style={{ fontFamily: "var(--font-sora)" }}>{c.h}</h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="transition-colors hover:text-white">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-5 text-xs sm:px-6">© 2026 OFManager — une solution CAP SOLUTIONS. Tous droits réservés.</div>
      </div>
    </footer>
  );
}
