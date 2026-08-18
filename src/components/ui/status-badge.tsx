import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Tonalité sémantique d'un statut — la source UNIQUE de vérité pour les couleurs
 * d'état de l'application. Remplace les maps `bg-emerald-500/10 text-emerald-700…`
 * recopiées à la main dans chaque page (badges, pastilles, points, montants).
 * Les couleurs viennent des tokens → thème tenant + dark-mode automatiques.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_TO_VARIANT = {
  success: "success",
  warning: "warning",
  danger: "destructive",
  info: "info",
  neutral: "neutral",
} as const;

/** Fond + texte tokenisés pour une pastille d'état rendue sans le composant Badge. */
export const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
};

/** Couleur de texte seule (icône de succès, montant, libellé d'état inline). */
export const TONE_TEXT: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  neutral: "text-muted-foreground",
};

/** Pastille ronde pleine (point de statut devant un libellé). */
export const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

/** Badge d'état tokenisé. `tone` pilote la couleur (thème + dark automatiques). */
export function StatusBadge({
  tone = "neutral",
  ...props
}: { tone?: StatusTone } & Omit<ComponentProps<typeof Badge>, "variant">) {
  return <Badge variant={TONE_TO_VARIANT[tone]} {...props} />;
}
