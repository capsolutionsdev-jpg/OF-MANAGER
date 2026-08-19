import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Clock, MonitorSmartphone } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { appBaseUrl } from "@/lib/token";
import { salleToken, jourKey } from "@/lib/emargement-salle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PrintButton } from "@/components/documents/print-button";

export const dynamic = "force-dynamic";

export default async function EmargementSalleAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date: dateParam } = await searchParams;
  const db = await getTenantDb();

  const s = await db.session.findUnique({
    where: { id },
    select: {
      id: true,
      formation: { select: { titre: true } },
      emargementSignatures: {
        select: { id: true, nom: true, role: true, date: true, demi: true, signedAt: true },
        orderBy: [{ date: "asc" }, { demi: "asc" }, { nom: "asc" }],
      },
    },
  });
  if (!s) notFound();

  const sigs = s.emargementSignatures;
  const days = [...new Set(sigs.map((r) => jourKey(r.date)))].sort();
  const todayKey = jourKey(new Date());
  const targetKey =
    dateParam && days.includes(dateParam) ? dateParam
    : days.includes(todayKey) ? todayKey
    : (days.find((d) => d >= todayKey) ?? days[days.length - 1] ?? todayKey);

  const token = salleToken(id);
  const hubUrl = `${appBaseUrl()}/emarger/salle/${id}/${token}${targetKey ? `?date=${targetKey}` : ""}`;
  const qr = sigs.length > 0 ? await QRCode.toDataURL(hubUrl, { margin: 1, width: 320 }) : null;

  const dayRows = sigs.filter((r) => jourKey(r.date) === targetKey);
  const signed = dayRows.filter((r) => r.signedAt).length;
  const dayLabel = targetKey
    ? (() => {
        const [y, m, d] = targetKey.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      })()
    : "";

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link href={`/sessions/${id}/emargement`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;émargement
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Émargement en salle (QR)</h1>
            <p className="text-sm text-muted-foreground">{s.formation.titre}</p>
          </div>
          {qr && <PrintButton />}
        </div>
      </div>

      {sigs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <MonitorSmartphone className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Signatures non préparées</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Préparez d&apos;abord les émargements de la session, puis revenez ici pour afficher le QR en salle.
            </p>
            <Button render={<Link href={`/sessions/${id}/emargement`} />} className="mt-2">
              Aller à l&apos;émargement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* QR à projeter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base capitalize">{dayLabel}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {qr && <img src={qr} alt="QR code d'émargement" className="h-64 w-64 rounded-lg border bg-white p-2" />}
              <p className="text-sm text-muted-foreground">
                Projetez ce QR en salle. Chaque participant le scanne avec son téléphone,
                sélectionne son nom et signe. Vous pouvez aussi ouvrir le lien sur une tablette
                (mode borne) et la faire passer.
              </p>
              <Link href={hubUrl} target="_blank" className="break-all text-xs text-primary hover:underline print:hidden">
                {hubUrl}
              </Link>
              <div className="print:hidden">
                <Button variant="outline" size="sm" render={<Link href={hubUrl} target="_blank" />}>
                  <MonitorSmartphone className="mr-1.5 h-4 w-4" /> Ouvrir en mode borne (tablette)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suivi en direct */}
          <Card className="print:hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">Suivi en direct</CardTitle>
              <Badge variant={signed === dayRows.length ? "success" : "warning"}>
                {signed}/{dayRows.length} signé(s)
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {days.map((dk) => {
                    const [yy, mm, dd] = dk.split("-").map(Number);
                    const lbl = new Date(yy, mm - 1, dd).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
                    const active = dk === targetKey;
                    return (
                      <Link key={dk} href={`/sessions/${id}/emargement/salle?date=${dk}`}
                        className={`rounded-full border px-3 py-1 text-xs ${active ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                        {lbl}
                      </Link>
                    );
                  })}
                </div>
              )}
              <ul className="space-y-1.5">
                {dayRows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase">{r.role === "FORMATEUR" ? "Formateur" : "Stagiaire"}</Badge>
                      <span className="font-medium">{r.nom}</span>
                      <span className="text-xs text-muted-foreground">{r.demi === "MATIN" ? "matin" : "après-midi"}</span>
                    </span>
                    {r.signedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {r.signedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> en attente
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Rechargez la page pour actualiser le suivi.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
