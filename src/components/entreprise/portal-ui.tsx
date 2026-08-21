import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ——— Formatage (fr-FR) ———————————————————————————————————————————————

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const EURO_FMT = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return DATE_FMT.format(date);
}

export function fmtEuro(n: number): string {
  return EURO_FMT.format(n);
}

// ——— Blocs présentiels ————————————————————————————————————————————————

/** Titre + sous-titre d'une rubrique. */
export function RubriqueHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** État vide illustré. */
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed bg-card/40 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Carte de contenu. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card p-4", className)}>{children}</div>;
}

/** Pastille de statut colorée. `tone` pilote la couleur. */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    info: "bg-primary/10 text-primary",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

// ——— Mappings métier ——————————————————————————————————————————————————

/** Badge de statut d'inscription. */
export function InscriptionBadge({ statut }: { statut: string }) {
  const map: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
    EN_ATTENTE: { label: "En attente", tone: "warning" },
    VALIDEE: { label: "Validée", tone: "success" },
    SUSPENDUE: { label: "Suspendue", tone: "danger" },
    ANNULEE: { label: "Annulée", tone: "neutral" },
  };
  const m = map[statut] ?? { label: statut, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Badge du résultat de certification (suivi pédagogique). */
export function CertificationBadge({ resultat }: { resultat: string }) {
  const map: Record<string, { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }> = {
    NON_EVALUE: { label: "En cours", tone: "info" },
    CERTIFIE: { label: "Certifié", tone: "success" },
    AJOURNE: { label: "Ajourné", tone: "warning" },
    ABANDON: { label: "Abandon", tone: "danger" },
  };
  const m = map[resultat] ?? { label: resultat, tone: "neutral" as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Libellé lisible d'un type de document. */
export function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CONVENTION: "Convention",
    CONVENTION_ENTREPRISE: "Convention",
    CONVOCATION: "Convocation",
    ATTESTATION: "Attestation",
    ATTESTATION_FIN: "Attestation de fin",
    CERTIFICAT: "Certificat",
    CERTIFICAT_REALISATION: "Certificat de réalisation",
    EMARGEMENT: "Émargement",
    PROGRAMME: "Programme",
    DEVIS: "Devis",
    FACTURE: "Facture",
    REGLEMENT_INTERIEUR: "Règlement intérieur",
  };
  return map[type] ?? type.replace(/_/g, " ").toLowerCase();
}
