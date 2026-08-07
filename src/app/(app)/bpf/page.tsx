import Link from "next/link";
import {
  Clock,
  Users,
  GraduationCap,
  Wallet,
  Award,
  Hourglass,
  XCircle,
  MinusCircle,
  Briefcase,
  TrendingUp,
  Link2,
  Info,
} from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ExportMenu } from "@/components/export-menu";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { SITUATION_LABELS, EMPLOI_KEYS, type Suivi6MoisReponses } from "@/lib/suivi6mois";

export const dynamic = "force-dynamic";

/** Info discrète : l'explication réglementaire est disponible au survol de
 * l'icône (tooltip natif), au lieu d'un bloc de texte pleine largeur. */
function InfoHint({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="inline-flex cursor-help items-center text-muted-foreground/60 transition-colors hover:text-muted-foreground"
    >
      <Info className="h-3.5 w-3.5" />
    </span>
  );
}

export default async function BpfPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const db = await getTenantDb();
  const sp = await searchParams;
  const nowYear = new Date().getFullYear();
  const annee = sp.annee ? parseInt(sp.annee, 10) : nowYear;

  // Sessions de l'année choisie (basé sur la date de début), hors annulées
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee + 1, 0, 1);

  const sessions = await db.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      dateDebut: { gte: debut, lt: fin },
    },
    include: {
      formation: { select: { titre: true, reference: true, dureeHeures: true } },
      formateurs: { select: { id: true, nom: true, prenom: true } },
      inscriptions: {
        where: { statut: { not: "ANNULEE" } },
        select: {
          financementType: true,
          montant: true,
          resultatCertification: true,
          suivi6moisJson: true,
          suivi6moisCompletedAt: true,
        },
      },
    },
    orderBy: { dateDebut: "asc" },
  });

  // Années disponibles pour le sélecteur
  const allYears = await db.session.findMany({
    select: { dateDebut: true },
    orderBy: { dateDebut: "desc" },
  });
  const years = Array.from(
    new Set([nowYear, ...allYears.map((s) => s.dateDebut.getFullYear())]),
  ).sort((a, b) => b - a);

  const hoursOf = (h: number | null | undefined) => h ?? 0;

  // ── Agrégation par formation ──
  type FormStat = {
    titre: string;
    reference: string;
    nbSessions: number;
    heures: number; // heures de formation cumulées (par session)
    stagiaires: number;
    heuresStagiaires: number; // heures × stagiaires
  };
  const parFormation = new Map<string, FormStat>();

  // ── Agrégation par formateur ──
  const parFormateur = new Map<
    string,
    { nom: string; nbSessions: number; heures: number }
  >();

  // ── Agrégation par financement ──
  const parFinancement = new Map<string, { nb: number; montant: number }>();

  // ── Agrégation certification ──
  const cert = { CERTIFIE: 0, AJOURNE: 0, ABANDON: 0, NON_EVALUE: 0 };

  // ── Agrégation suivi à 6 mois (insertion professionnelle) ──
  const suivi = { repondants: 0, enquetes: 0, enEmploi: 0, enLien: 0, parSituation: new Map<string, number>() };

  let totalHeures = 0;
  let totalStagiaires = 0;
  let totalHeuresStagiaires = 0;

  for (const s of sessions) {
    const h = hoursOf(s.formation.dureeHeures);
    const nbStag = s.inscriptions.length;

    // Formation
    const key = s.formation.reference;
    const fs = parFormation.get(key) ?? {
      titre: s.formation.titre,
      reference: s.formation.reference,
      nbSessions: 0,
      heures: 0,
      stagiaires: 0,
      heuresStagiaires: 0,
    };
    fs.nbSessions += 1;
    fs.heures += h;
    fs.stagiaires += nbStag;
    fs.heuresStagiaires += h * nbStag;
    parFormation.set(key, fs);

    // Formateurs
    for (const f of s.formateurs) {
      const cur = parFormateur.get(f.id) ?? {
        nom: `${f.prenom} ${f.nom}`,
        nbSessions: 0,
        heures: 0,
      };
      cur.nbSessions += 1;
      cur.heures += h;
      parFormateur.set(f.id, cur);
    }

    // Financement + certification
    for (const i of s.inscriptions) {
      const fk = i.financementType ?? "NON_PRECISE";
      const cur = parFinancement.get(fk) ?? { nb: 0, montant: 0 };
      cur.nb += 1;
      cur.montant += i.montant ? Number(i.montant) : 0;
      parFinancement.set(fk, cur);

      cert[i.resultatCertification] += 1;

      // Suivi à 6 mois (devenir / insertion)
      if (i.suivi6moisCompletedAt && i.suivi6moisJson) {
        const r = i.suivi6moisJson as Suivi6MoisReponses;
        suivi.repondants += 1;
        suivi.parSituation.set(r.situation, (suivi.parSituation.get(r.situation) ?? 0) + 1);
        if (EMPLOI_KEYS.has(r.situation)) suivi.enEmploi += 1;
        if (r.lienFormation === "oui" || r.lienFormation === "partiel") suivi.enLien += 1;
      }
    }

    totalHeures += h;
    totalStagiaires += nbStag;
    totalHeuresStagiaires += h * nbStag;
  }

  const formations = [...parFormation.values()].sort((a, b) =>
    a.titre.localeCompare(b.titre),
  );
  const formateurs = [...parFormateur.values()].sort(
    (a, b) => b.heures - a.heures,
  );
  const financements = [...parFinancement.entries()].sort(
    (a, b) => b[1].nb - a[1].nb,
  );

  const certEvalues = cert.CERTIFIE + cert.AJOURNE + cert.ABANDON;
  const tauxReussite =
    certEvalues > 0 ? Math.round((cert.CERTIFIE / certEvalues) * 100) : null;

  const tauxEmploi = suivi.repondants > 0 ? Math.round((suivi.enEmploi / suivi.repondants) * 100) : null;
  const tauxLien = suivi.enEmploi > 0 ? Math.round((suivi.enLien / suivi.enEmploi) * 100) : null;
  const suiviSituations = [...suivi.parSituation.entries()].sort((a, b) => b[1] - a[1]);

  const finLabel = (k: string) =>
    k === "NON_PRECISE"
      ? "Non précisé"
      : FINANCEMENT_LABELS[k as keyof typeof FINANCEMENT_LABELS] ?? k;

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur d'année + export */}
      <PageHeader
        title="Bilan Pédagogique & Financier"
        subtitle={`Récapitulatif des sessions, heures, formateurs et financements pour l'année ${annee}.`}
      >
        <div className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <Link
              key={y}
              href={`/bpf?annee=${y}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                y === annee
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input hover:bg-muted"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
        <ExportMenu href={`/bpf/export?annee=${annee}`} />
      </PageHeader>

      {sessions.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-sm text-muted-foreground">
            Aucune session sur l&apos;année {annee}.
          </div>
        </Card>
      ) : (
        <Tabs defaultValue="synthese" className="space-y-6">
          <TabsList>
            <TabsTrigger value="synthese">Synthèse</TabsTrigger>
            <TabsTrigger value="formations">Par formation</TabsTrigger>
            <TabsTrigger value="repartition">Formateurs &amp; financements</TabsTrigger>
          </TabsList>

          {/* ───────── Synthèse ───────── */}
          <TabsContent value="synthese" className="space-y-6">
            {/* KPI globaux */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={GraduationCap}
                label="Sessions"
                value={sessions.length}
                tint="blue"
                trend={`${formations.length} formation${formations.length > 1 ? "s" : ""}`}
              />
              <StatCard
                icon={Clock}
                label="Heures de formation"
                value={`${totalHeures} h`}
                tint="violet"
              />
              <StatCard
                icon={Users}
                label="Stagiaires"
                value={totalStagiaires}
                tint="emerald"
              />
              <StatCard
                icon={Clock}
                label="Heures-stagiaires"
                value={`${totalHeuresStagiaires} h`}
                tint="amber"
                trend="heures × stagiaires"
              />
            </div>

            {/* Résultats de certification */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <GraduationCap className="h-4 w-4" /> Résultats de certification
                </h2>
                {tauxReussite !== null && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Taux de réussite : {tauxReussite}%
                  </Badge>
                )}
                <InfoHint text="Le taux de réussite est calculé sur les stagiaires évalués : certifiés / (certifiés + ajournés + abandons)." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Award} label="Certifiés" value={cert.CERTIFIE} tint="emerald" />
                <StatCard icon={Hourglass} label="Ajournés" value={cert.AJOURNE} tint="amber" />
                <StatCard icon={XCircle} label="Abandons" value={cert.ABANDON} tint="rose" />
                <StatCard icon={MinusCircle} label="Non évalués" value={cert.NON_EVALUE} tint="blue" />
              </div>
            </div>

            {/* Insertion à 6 mois (suivi Qualiopi indicateur 11) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4" /> Insertion à 6 mois (suivi Qualiopi)
                </h2>
                {tauxEmploi !== null && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    Taux d&apos;emploi : {tauxEmploi}%
                  </Badge>
                )}
                <InfoHint text="Le taux d'emploi rapporte les bénéficiaires en emploi (CDI, CDD/intérim, indépendant, alternance) au nombre de répondants. « En lien avec la formation » est calculé parmi les répondants en emploi. Les enquêtes sont envoyées automatiquement 6 mois après la fin de chaque session." />
              </div>
              {suivi.repondants === 0 ? (
                <Card>
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Aucune réponse à l&apos;enquête de suivi à 6 mois sur cette période.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard icon={Users} label="Répondants" value={suivi.repondants} tint="blue" />
                    <StatCard icon={Briefcase} label="En emploi" value={suivi.enEmploi} tint="emerald" />
                    <StatCard icon={TrendingUp} label="Taux d'emploi" value={`${tauxEmploi}%`} tint="violet" />
                    <StatCard
                      icon={Link2}
                      label="En lien avec la formation"
                      value={tauxLien !== null ? `${tauxLien}%` : "—"}
                      tint="amber"
                    />
                  </div>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">
                        Situation des bénéficiaires à 6 mois
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Situation à 6 mois</TableHead>
                            <TableHead className="text-right">Bénéficiaires</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {suiviSituations.map(([k, n]) => (
                            <TableRow key={k}>
                              <TableCell>{SITUATION_LABELS[k] ?? k}</TableCell>
                              <TableCell className="text-right">{n}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>

          {/* ───────── Par formation ───────── */}
          <TabsContent value="formations">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  Sessions par formation
                  <InfoHint text="Les heures sont calculées d'après la durée (heures) renseignée sur chaque formation. Les heures-stagiaires correspondent aux heures multipliées par le nombre de stagiaires inscrits (hors annulés)." />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formation</TableHead>
                      <TableHead className="text-right">Sessions</TableHead>
                      <TableHead className="text-right">Heures</TableHead>
                      <TableHead className="text-right">Stagiaires</TableHead>
                      <TableHead className="text-right">Heures-stag.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formations.map((f) => (
                      <TableRow key={f.reference}>
                        <TableCell className="font-medium">
                          {f.titre}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {f.reference}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{f.nbSessions}</TableCell>
                        <TableCell className="text-right">{f.heures} h</TableCell>
                        <TableCell className="text-right">{f.stagiaires}</TableCell>
                        <TableCell className="text-right">
                          {f.heuresStagiaires} h
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{sessions.length}</TableCell>
                      <TableCell className="text-right">{totalHeures} h</TableCell>
                      <TableCell className="text-right">{totalStagiaires}</TableCell>
                      <TableCell className="text-right">
                        {totalHeuresStagiaires} h
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────── Formateurs & financements ───────── */}
          <TabsContent value="repartition">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Par formateur */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" /> Formateurs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {formateurs.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      Aucun formateur affecté sur cette période.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Formateur</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Heures</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formateurs.map((f) => (
                          <TableRow key={f.nom}>
                            <TableCell className="font-medium">{f.nom}</TableCell>
                            <TableCell className="text-right">
                              {f.nbSessions}
                            </TableCell>
                            <TableCell className="text-right">{f.heures} h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Par financement */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="h-4 w-4" /> Modes de financement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mode</TableHead>
                        <TableHead className="text-right">Stagiaires</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {financements.map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell>
                            <Badge variant="secondary">{finLabel(k)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{v.nb}</TableCell>
                          <TableCell className="text-right">
                            {v.montant > 0
                              ? `${v.montant.toLocaleString("fr-FR")} €`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
