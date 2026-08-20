import Link from "next/link";

const RUBRIQUES = [
  { href: "/espace-entreprise/formation", label: "Formations (planning)" },
  { href: "/espace-entreprise/inscriptions", label: "Inscriptions" },
  { href: "/espace-entreprise/suivi", label: "Suivi pédagogique" },
  { href: "/espace-entreprise/documents", label: "Documents" },
  { href: "/espace-entreprise/factures", label: "Factures" },
];

export default function EspaceEntrepriseHome() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RUBRIQUES.map((r) => (
        <Link key={r.href} href={r.href} className="rounded-xl border bg-card p-4 hover:border-primary">
          {r.label}
        </Link>
      ))}
    </div>
  );
}
