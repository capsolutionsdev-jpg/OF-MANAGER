// src/components/site/logo.tsx
// Logo-mot OFManager — symbole (badge bleu dégradé + toque) + « OFManager » en Sora.
// Lisible à toute taille, cohérent partout. `tone="dark"` pour fond foncé (pied de page).
// Remplace l'ancien logo image (quasi carré, illisible à 36px) et le logo texte de /tarifs.
import { GraduationCap } from "lucide-react";

const MARK = { sm: "h-8 w-8 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-11 w-11 rounded-xl" };
const GLYPH = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
const TEXT = { sm: "text-lg", md: "text-xl", lg: "text-2xl" };

export function Logo({
  size = "md",
  tone = "light",
}: {
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark";
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid ${MARK[size]} place-items-center bg-gradient-to-br from-[#3B6EF5] to-[#2954D4] text-white shadow-sm`}
        aria-hidden
      >
        <GraduationCap className={GLYPH[size]} strokeWidth={2.1} />
      </span>
      <span className={`${TEXT[size]} font-extrabold tracking-tight`} style={{ fontFamily: "var(--font-sora)" }}>
        <span style={{ color: tone === "dark" ? "#FFFFFF" : "#0D1B3E" }}>OF</span>
        <span style={{ color: "#3B6EF5" }}>Manager</span>
      </span>
    </span>
  );
}
