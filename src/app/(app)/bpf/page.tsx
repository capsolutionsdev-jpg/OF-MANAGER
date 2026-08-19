import Link from "next/link";
import { BarChart3, Clock, Users, GraduationCap, Wallet, AlertTriangle } from "lucide-react";
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
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { SITUATION_LABELS, EMPLOI_KEYS, type Suivi6MoisReponses } from "@/lib/suivi6mois";

export const dynamic = "force-dynamic";

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="hover-lift">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BpfPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const db = await getTenantDb();
  const sp = await searchParams;
  const now = new Date();
  const nowYear = now.getFullYear();
  // Année validée (parseInt peut donner NaN → repli sur l'année courante).
  const parsedAnnee = sp.annee ? parseInt(sp.annee, 10) : nowYear;
  const annee = Number.isFinite(parsedAnnee) ? parsedAnnee : nowYear;

  // Sessions de l'année choisie (basé sur la date de début), hors annulées.
  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee + 1, 0, 1);

  const sessions = await db.session.findMany({
    where: {
      statut: { not: "ANNULEE" },
      // Le BPF ne compte que l'activité RÉALISÉE : on exclut les sessions à venir
      // (non encore démarrées) pour l'année en cours.
      dateDebut: { gte: debut, lt: fin, ...(annee >= nowYear ? { lte: now } : {}) },
    },
    include: {
      formation: { select: { titre: true, reference: true, dureeHeures: true } },
      formateurs: { select: { id: true, nom: true, prenom: true } },
      inscriptions: {
        // Entrées EN FORMATION uniquement : on exclut EN_ATTENTE (prospect non
        // confirmé, ne doit pas gonfler les heures-stagiaires) et ANNULEE.
        where: { statut: { notIn: ["EN_ATTENTE", "ANNULEE"] } },
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

  // Sessions transverses à deux années civiles (déclarées ici à 100 % sur l'année
  // de début) : signalées pour vérification manuelle (pas de prorata automatique).
  const sessionsACheval = sessions.filter(
    (s) => s.dateFin && s.dateFin >= fin,
  ).length;

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

  // ── Formations sans durée (heures) renseignée mais avec des stagiaires ──
  // (sinon 0 h silencieux, incohérent avec un nombre de stagiaires > 0).
  const missingHours = new Set<string>();

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
    if ((s.formation.dureeHeures ?? null) === null && nbStag > 0) {
      missingHours.add(s.formation.reference);
    }

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

  // ── Cadre C du CERFA 10443*17 : origine des produits par financeur ──
  // (montants HT issus des inscriptions entrées en formation, ventilés selon les
  // lignes du formulaire — à reporter dans le télé-service « Mon activité formation »).
  const CERFA_C_LABELS: Record<string, string> = {
    ENTREPRISE: "Des entreprises (formation de leurs salariés)",
    OPCO: "Des opérateurs de compétences (OPCO)",
    CPF: "De la Caisse des dépôts (CPF)",
    FRANCE_TRAVAIL: "Des pouvoirs publics (France Travail)",
    AUTOFINANCEMENT: "Des contrats conclus avec des particuliers",
    AUTRE: "Autres produits",
    NON_PRECISE: "À ventiler (financement non précisé)",
  };
  const cadreC = financements
    .map(([k, v]) => ({ label: CERFA_C_LABELS[k] ?? finLabel(k), montant: v.montant, nb: v.nb }))
    .filter((r) => r.montant > 0 || r.nb > 0);
  const totalProduits = cadreC.reduce((a, r) => a + r.montant, 0);
  const totalFormateursHeures = formateurs.reduce((a, f) => a + f.heures, 0);

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur d'année */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="title-accent flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="h-6 w-6" /> Bilan Pédagogique &amp; Financier
          </h1>
          <p className="text-sm text-muted-foreground">
            Récapitulatif des sessions, heures, formateurs et financements pour
            l&apos;année {annee}.
          </p>
        </div>
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
      </div>

      {sessions.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-sm text-muted-foreground">
            Aucune session sur l&apos;année {annee}.
          </div>
        </Card>
      ) : (
        <>
          {/* KPI globaux */}
          <div className="stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              icon={GraduationCap}
              label="Sessions"
              value={String(sessions.length)}
              sub={`${formations.length} formation${formations.length > 1 ? "s" : ""}`}
            />
            <Kpi
              icon={Clock}
              label="Heures de formation"
              value={`${totalHeures} h`}
            />
            <Kpi
              icon={Users}
              label="Stagiaires"
              value={String(totalStagiaires)}
            />
            <Kpi
              icon={Clock}
              label="Heures-stagiaires"
              value={`${totalHeuresStagiaires} h`}
              sub="heures × stagiaires"
            />
          </div>

          {/* Alertes de fiabilité BPF */}
          {(missingHours.size > 0 || sessionsACheval > 0) && (
            <div className="space-y-1 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              {missingHours.size > 0 && (
                <p>
                  <AlertTriangle className="mr-1 inline h-4 w-4" /> {missingHours.size} formation{missingHours.size > 1 ? "s" : ""} sans durée (heures)
                  renseignée mais avec des stagiaires → leurs heures-stagiaires sont comptées à 0.
                  Renseignez la durée sur la fiche formation pour un BPF juste.
                </p>
              )}
              {sessionsACheval > 0 && (
                <p>
                  <AlertTriangle className="mr-1 inline h-4 w-4" /> {sessionsACheval} session{sessionsACheval > 1 ? "s" : ""} à cheval sur deux
                  années civiles : déclarée{sessionsACheval > 1 ? "s" : ""} ici à 100 % sur {annee}
                  {" "}(pas de prorata automatique — à vérifier).
                </p>
              )}
            </div>
          )}

          <Tabs defaultValue="synthese" className="space-y-6">
            <TabsList>
              <TabsTrigger value="synthese">Synthèse</TabsTrigger>
              <TabsTrigger value="formations">Par formation</TabsTrigger>
              <TabsTrigger value="ressources">Formateurs &amp; financements</TabsTrigger>
              <TabsTrigger value="cerfa">CERFA 10443*17</TabsTrigger>
            </TabsList>

            {/* Récapitulatif aligné sur le CERFA 10443*17 */}
            <TabsContent value="cerfa">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Récapitulatif CERFA 10443*17 — à reporter dans « Mon activité formation »
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5 text-sm">
                  {/* Cadre F — bilan pédagogique */}
                  <div>
                    <p className="mb-1.5 font-semibold">Cadre F — Bilan pédagogique (stagiaires formés directement)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-xl font-bold">{totalStagiaires}</p>
                        <p className="text-xs text-muted-foreground">Stagiaires (entrées)</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-xl font-bold">{totalHeures} h</p>
                        <p className="text-xs text-muted-foreground">Heures de formation</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-xl font-bold">{totalHeuresStagiaires} h</p>
                        <p className="text-xs text-muted-foreground">Heures-stagiaires</p>
                      </div>
                    </div>
                  </div>

                  {/* Cadre E — formateurs */}
                  <div>
                    <p className="mb-1.5 font-semibold">Cadre E — Personnes dispensant les heures de formation</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-xl font-bold">{formateurs.length}</p>
                        <p className="text-xs text-muted-foreground">Formateurs</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3 text-center">
                        <p className="text-xl font-bold">{totalFormateursHeures} h</p>
                        <p className="text-xs text-muted-foreground">Heures dispensées</p>
                      </div>
                    </div>
                  </div>

                  {/* Cadre C — origine des produits */}
                  <div>
                    <p className="mb-1.5 font-semibold">Cadre C — Origine des produits (financeurs)</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Origine</TableHead>
                          <TableHead className="text-right">Stagiaires</TableHead>
                          <TableHead className="text-right">Produits</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cadreC.map((r) => (
                          <TableRow key={r.label}>
                            <TableCell>{r.label}</TableCell>
                            <TableCell className="text-right">{r.nb}</TableCell>
                            <TableCell className="text-right">
                              {r.montant > 0 ? `${r.montant.toLocaleString("fr-FR")} €` : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-semibold">
                          <TableCell>Total produits</TableCell>
                          <TableCell className="text-right">{totalStagiaires}</TableCell>
                          <TableCell className="text-right">
                            {totalProduits > 0 ? `${totalProduits.toLocaleString("fr-FR")} €` : "—"}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Valeurs alignées sur les cadres du CERFA 10443*17. La déclaration est
                    dématérialisée sur « Mon activité formation » (MAF) — ce récapitulatif sert à
                    reporter volumes et montants. Imprimez cette page (Ctrl/Cmd + P) pour l&apos;archiver.
                    Les produits sont ventilés d&apos;après le type de financement des inscriptions
                    entrées en formation.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Par formation */}
            <TabsContent value="formations">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Sessions par formation</CardTitle>
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

            {/* Synthèse — certification & insertion */}
            <TabsContent value="synthese" className="space-y-6">
              {/* Résultats de certification */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <GraduationCap className="h-4 w-4" /> Résultats de certification
                    {tauxReussite !== null && (
                      <Badge variant="success">
                        Taux de réussite : {tauxReussite}%
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border bg-success/5 p-3 text-center">
                      <p className="text-2xl font-bold text-success">
                        {cert.CERTIFIE}
                      </p>
                      <p className="text-xs text-muted-foreground">Certifiés</p>
                    </div>
                    <div className="rounded-lg border bg-warning/5 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">
                        {cert.AJOURNE}
                      </p>
                      <p className="text-xs text-muted-foreground">Ajournés</p>
                    </div>
                    <div className="rounded-lg border bg-destructive/5 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">
                        {cert.ABANDON}
                      </p>
                      <p className="text-xs text-muted-foreground">Abandons</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">
                        {cert.NON_EVALUE}
                      </p>
                      <p className="text-xs text-muted-foreground">Non évalués</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Le taux de réussite est calculé sur les stagiaires évalués
                    (certifiés / (certifiés + ajournés + abandons)).
                  </p>
                </CardContent>
              </Card>

              {/* Insertion à 6 mois (suivi Qualiopi indicateur 11) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <Users className="h-4 w-4" /> Insertion à 6 mois (suivi Qualiopi)
                    {tauxEmploi !== null && (
                      <Badge variant="success">Taux d&apos;emploi : {tauxEmploi}%</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {suivi.repondants === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune réponse à l&apos;enquête de suivi à 6 mois sur cette période (les enquêtes sont
                      envoyées automatiquement 6 mois après la fin de chaque session).
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border bg-muted/30 p-3 text-center">
                          <p className="text-2xl font-bold">{suivi.repondants}</p>
                          <p className="text-xs text-muted-foreground">Répondants</p>
                        </div>
                        <div className="rounded-lg border bg-success/5 p-3 text-center">
                          <p className="text-2xl font-bold text-success">{suivi.enEmploi}</p>
                          <p className="text-xs text-muted-foreground">En emploi</p>
                        </div>
                        <div className="rounded-lg border bg-info/5 p-3 text-center">
                          <p className="text-2xl font-bold text-info">{tauxEmploi}%</p>
                          <p className="text-xs text-muted-foreground">Taux d&apos;emploi</p>
                        </div>
                        <div className="rounded-lg border bg-primary/5 p-3 text-center">
                          <p className="text-2xl font-bold text-primary">{tauxLien ?? "—"}{tauxLien !== null ? "%" : ""}</p>
                          <p className="text-xs text-muted-foreground">En lien avec la formation</p>
                        </div>
                      </div>
                      <div className="mt-3">
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
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Le taux d&apos;emploi rapporte les bénéficiaires en emploi (CDI, CDD/intérim, indépendant,
                        alternance) au nombre de répondants. « En lien avec la formation » est calculé parmi les
                        répondants en emploi.
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Formateurs & financements */}
            <TabsContent value="ressources">
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

          <p className="text-xs text-muted-foreground">
            Les heures sont calculées d&apos;après la durée (heures) renseignée sur
            chaque formation. Les heures-stagiaires correspondent aux heures
            multipliées par le nombre de stagiaires <strong>entrés en formation</strong>
            {" "}(inscriptions confirmées ; hors « en attente » et annulées).
          </p>
        </>
      )}
    </div>
  );
}
