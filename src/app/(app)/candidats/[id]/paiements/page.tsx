import { notFound } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getCandidatDetail } from "@/lib/candidats/detail";
import { CandidatDetailHeader } from "@/components/candidats/candidat-detail-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { INSCRIPTION_STATUT_LABELS } from "@/lib/validators/inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { RecordPaymentDialog } from "@/components/comptabilite/record-payment-dialog";

export default async function CandidatPaiementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getCandidatDetail(id);
  if (!detail) notFound();

  const { candidat, peutEncaisser } = detail;

  // Format monétaire FR
  const eur = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";

  return (
    <div className="space-y-6">
      <CandidatDetailHeader candidat={candidat} active="paiements" t3pTab={detail.t3pTab} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" /> Paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidat.inscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ce candidat n&apos;est inscrit à aucune session.
            </p>
          ) : (
            <ul className="space-y-4">
              {candidat.inscriptions.map((i) => {
                const du = i.montant != null ? Number(i.montant) : 0;
                const paye = i.paiements.reduce((s, p) => s + Number(p.montant), 0);
                const restant = Math.max(0, du - paye);
                const modeDefaut =
                  i.modePaiement ??
                  (i.financementType ? FINANCEMENT_LABELS[i.financementType] : undefined);
                return (
                  <li key={i.id} className="rounded-lg border bg-muted/20 p-3">
                    {/* Rappel de l'inscription pour situer le règlement */}
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/sessions/${i.sessionId}`}
                        className="font-medium hover:underline"
                      >
                        {i.session.formation.titre}
                      </Link>
                      <span className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{i.session.dateDebut.toLocaleDateString("fr-FR")}</span>
                        <Badge variant="secondary">
                          {INSCRIPTION_STATUT_LABELS[i.statut]}
                        </Badge>
                      </span>
                    </div>

                    {/* Paiement */}
                    <div className="mt-3 border-t pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Paiement
                        </p>
                        {peutEncaisser && (
                          <RecordPaymentDialog
                            inscriptionId={i.id}
                            candidatNom={`${candidat.prenom} ${candidat.nom}`}
                            formation={i.session.formation.titre}
                            restant={restant}
                            defaultMode={modeDefaut}
                          />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <span>
                          Dû :{" "}
                          <span className="font-medium">{du > 0 ? eur(du) : "—"}</span>
                        </span>
                        <span>
                          Payé :{" "}
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">{eur(paye)}</span>
                        </span>
                        <span>
                          Restant :{" "}
                          <span className="font-medium">{du > 0 ? eur(restant) : "—"}</span>
                        </span>
                      </div>
                      {i.paiements.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {i.paiements.map((p) => (
                            <li key={p.id} className="flex flex-wrap gap-2">
                              <span>{p.date.toLocaleDateString("fr-FR")}</span>
                              <span className="font-medium text-foreground">
                                {eur(Number(p.montant))}
                              </span>
                              {p.mode && <span>· {p.mode}</span>}
                              <span>· par {p.enregistrePar?.name ?? "—"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
