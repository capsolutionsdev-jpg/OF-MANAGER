import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** En-tête de page uniforme (design system) : icône optionnelle, titre avec accent
 * dégradé animé, sous-titre, actions à droite. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  /** Texte simple ou fragment enrichi (ex. compteur mis en avant). */
  subtitle?: ReactNode;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div>
          <h1 className="title-accent text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
