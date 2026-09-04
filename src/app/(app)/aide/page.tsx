import Link from "next/link";
import { BookOpen, GraduationCap, LifeBuoy, ArrowUpRight } from "lucide-react";

// Centre d'aide in-app (A10-016) : accès direct aux guides, au glossaire métier
// et au support — plutôt que de rediriger sèchement vers le seul support.
export const metadata = { title: "Aide & ressources" };

const RESSOURCES = [
  {
    href: "/guides",
    external: true,
    icon: BookOpen,
    title: "Guides pratiques",
    desc: "Prise en main pas à pas : sessions, émargement, BPF, Qualiopi, facturation…",
  },
  {
    href: "/glossaire",
    external: true,
    icon: GraduationCap,
    title: "Glossaire métier",
    desc: "Les termes de la formation professionnelle (OPCO, BPF, Qualiopi, CPF…) expliqués simplement.",
  },
  {
    href: "/support",
    external: false,
    icon: LifeBuoy,
    title: "Contacter le support",
    desc: "Une question ou un blocage ? Écrivez-nous depuis la messagerie, on vous répond.",
  },
];

export default function AidePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aide &amp; ressources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guides, glossaire et support — tout pour avancer sans blocage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RESSOURCES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            target={r.external ? "_blank" : undefined}
            rel={r.external ? "noopener" : undefined}
            className="group relative rounded-xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            {r.external && (
              <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            )}
            <r.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">{r.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
