import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * État vide illustré (design system) : illustration décorative flottante
 * (anneaux + icône), titre, description et action de démarrage. Remplace les
 * simples « Aucun … » pour guider l'utilisateur vers la première action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      {/* Illustration : anneaux concentriques + pastilles décoratives */}
      <div className="empty-float relative mb-1 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20" />
        <span className="absolute inset-3 rounded-full bg-primary/5" />
        <span className="absolute -right-1 top-2 h-2.5 w-2.5 rounded-full bg-primary/30" />
        <span className="absolute -left-1.5 bottom-4 h-2 w-2 rounded-full bg-emerald-400/50" />
        <span className="absolute right-2 -bottom-1 h-1.5 w-1.5 rounded-full bg-amber-400/60" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <p className="font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Button className="mt-1" render={<Link href={actionHref} />}>
          <Plus className="mr-1.5 h-4 w-4" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}
