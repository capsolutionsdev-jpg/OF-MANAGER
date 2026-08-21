import Link from "next/link";
import { CalendarDays, ClipboardList, GraduationCap, FileText, Receipt, ArrowRight } from "lucide-react";

const CARDS = [
  {
    href: "/espace-entreprise/formation",
    icon: CalendarDays,
    title: "Formations",
    desc: "Le planning des sessions à venir et les places disponibles.",
  },
  {
    href: "/espace-entreprise/inscriptions",
    icon: ClipboardList,
    title: "Inscriptions",
    desc: "Les inscriptions de vos salariés : en cours, à venir, passées.",
  },
  {
    href: "/espace-entreprise/suivi",
    icon: GraduationCap,
    title: "Suivi pédagogique",
    desc: "Le résultat de chaque salarié : certifié, ajourné, abandon.",
  },
  {
    href: "/espace-entreprise/documents",
    icon: FileText,
    title: "Documents",
    desc: "Convocations, attestations et certificats à télécharger.",
  },
  {
    href: "/espace-entreprise/factures",
    icon: Receipt,
    title: "Factures",
    desc: "Vos factures à télécharger.",
  },
];

export default function EspaceEntrepriseHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.href}
            href={c.href}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-medium">
                {c.title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
