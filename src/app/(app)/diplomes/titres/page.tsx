import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { getTitreDef } from "@/lib/documents/titres";
import { PageHeader } from "@/components/ui/page-header";
import { TitresRegistre, type TitreRow } from "@/components/titres/titres-registre";

export const dynamic = "force-dynamic";

/** Registre des titres vérifiables : suivi et révocation / annulation. */
export default async function TitresRegistrePage() {
  const db = await getTenantDb();
  const titres = await db.titreDelivre.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });

  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("fr-FR") : null);
  // Composant serveur rendu à chaque requête : heure courante volontaire.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const rows: TitreRow[] = titres.map((t) => ({
    id: t.id,
    numero: t.numeroVerification,
    titulaire: `${t.nomTitulaire.toUpperCase()} ${t.prenomTitulaire}`,
    type: getTitreDef(t.typeCode)?.label ?? t.typeCode,
    delivreLe: fmt(t.dateDelivrance) ?? "—",
    finValidite: fmt(t.dateFinValidite),
    expire: !!t.dateFinValidite && t.dateFinValidite.getTime() < now,
    statut: t.statut,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/diplomes"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux diplômes
        </Link>
        <PageHeader
          title="Registre des titres vérifiables"
          subtitle="Diplômes et attestations indexés pour la vérification publique. Révoquez ou annulez un titre en cas de fraude ou d'erreur : il ne sera alors plus reconnu en ligne."
        />
      </div>

      <TitresRegistre rows={rows} />
    </div>
  );
}
