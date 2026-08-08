import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileSignature, FolderUp, BookOpenCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { orgConfigFor } from "@/lib/org-identity";
import { linkExpired } from "@/lib/token";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParcoursForm } from "@/components/parcours/parcours-form";
import { DocsLire } from "@/components/parcours/docs-lire";
import { SignBox } from "@/components/parcours/sign-box";
import { DossierUpload } from "@/components/parcours/dossier-upload";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Documents contractuels que le candidat doit consulter avant de signer.
const DOCS_CONTRACTUELS = [
  "Fiche d'inscription",
  "Contrat de formation",
  "Convention de formation",
  "Programme de la formation",
  "Règlement intérieur",
];

function Step({
  done,
  current,
  label,
}: {
  done: boolean;
  current: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
      ) : (
        <Circle
          className={`h-5 w-5 ${current ? "text-primary" : "text-muted-foreground"}`}
        />
      )}
      <span
        className={`text-sm ${
          current ? "font-semibold" : done ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export default async function ParcoursPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const insc = await prisma.inscription.findUnique({
    where: { accessToken: token },
    include: {
      candidat: true,
      session: { include: { formation: true } },
    },
  });
  if (!insc) notFound();
  const org = await orgConfigFor(insc.organismeId);

  // Expiration : au-delà de 12 mois après la fin de session, le lien n'est plus
  // exploitable (limite l'exposition d'un lien fuité).
  if (linkExpired(insc.session?.dateFin)) {
    return (
      <main className="min-h-screen bg-muted/40 px-4 py-10">
        <div className="mx-auto max-w-md rounded-lg border bg-background p-8 text-center">
          <h1 className="text-lg font-bold">Lien expiré</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ce lien d&apos;inscription n&apos;est plus valide. Contactez{" "}
            {org.name} pour obtenir un nouveau lien.
          </p>
        </div>
      </main>
    );
  }

  const c = insc.candidat;
  const formDone = !!insc.formCompletedAt;
  const docsLus = !!insc.docsLusAt;
  const signed = !!insc.signedAt;
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR");

  // Étape 4 — dossier administratif : pièces attendues (par formation) + déposées.
  const piecesAttendues = insc.session.formation.piecesAttendues ?? [];
  const pieces = await prisma.pieceJointe.findMany({
    where: { candidatId: insc.candidatId },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, categorie: true, url: true, mimeType: true, statut: true, motifRefus: true },
  });
  const piecesCompletes =
    piecesAttendues.length === 0 ||
    piecesAttendues.every((p) => insc.piecesRecues.includes(p));
  const toutFinalise = signed && piecesCompletes;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={org.logoUrl ?? "/cap-competences-logo.png"}
            alt={org.name}
            className="mb-3 h-12 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">Finalisez votre inscription</h1>
          <p className="text-sm text-muted-foreground">
            {insc.session.formation.titre} — du {fmt(insc.session.dateDebut)} au{" "}
            {fmt(insc.session.dateFin)}
          </p>
        </div>

        {/* Progression — 4 étapes */}
        <Card>
          {/* Mobile : grille 2 colonnes (libellés longs) ; ≥ sm : une ligne centrée. */}
          <CardContent className="grid grid-cols-2 gap-x-3 gap-y-2 py-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5">
            <Step done={formDone} current={!formDone} label="1. Mes informations" />
            <Step done={docsLus} current={formDone && !docsLus} label="2. Lire les documents" />
            <Step done={signed} current={docsLus && !signed} label="3. Signature" />
            <Step done={toutFinalise} current={signed && !toutFinalise} label="4. Pièces du dossier" />
          </CardContent>
        </Card>

        {/* ── Étape 1 : informations ── */}
        {!formDone && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bonjour {c.prenom}, complétez vos informations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ParcoursForm
                token={token}
                defaults={{
                  telephone: c.telephone ?? "",
                  dateNaissance: c.dateNaissance
                    ? c.dateNaissance.toISOString().slice(0, 10)
                    : "",
                  adresse: c.adresse ?? "",
                  codePostal: c.codePostal ?? "",
                  ville: c.ville ?? "",
                  situationPro: c.situationPro ?? "",
                  employeur: c.employeur ?? "",
                  financementType: insc.financementType ?? "",
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* ── Étape 2 : lire les documents contractuels ── */}
        {formDone && !docsLus && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpenCheck className="h-5 w-5 text-primary" /> Lire vos
                documents contractuels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocsLire token={token} documents={DOCS_CONTRACTUELS} />
            </CardContent>
          </Card>
        )}

        {/* ── Étape 3 : signature ── */}
        {formDone && docsLus && !signed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSignature className="h-5 w-5 text-primary" /> Signez vos
                documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous avez consulté vos documents. Signez-les électroniquement
                ci-dessous ; une copie signée vous sera envoyée par e-mail.
              </p>
              <SignBox token={token} defaultName={`${c.prenom} ${c.nom}`} />
            </CardContent>
          </Card>
        )}

        {/* ── Étape 4 : envoi des pièces du dossier administratif ── */}
        {signed && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderUp className="h-5 w-5 text-primary" /> Envoyer les pièces
                de votre dossier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {toutFinalise ? (
                <div className="space-y-2 rounded-lg bg-emerald-500/10 p-4 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                  <p className="font-medium">Tout est finalisé, merci !</p>
                  <p className="text-sm text-muted-foreground">
                    Vos documents signés vous ont été envoyés par e-mail. Vous
                    pouvez ajouter ou remplacer une pièce ci-dessous si besoin.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Vos documents sont signés. Dernière étape : transmettez les
                  pièces justificatives demandées ci-dessous. Pour chacune,
                  choisissez un fichier ou prenez-la en photo — une par une.
                </p>
              )}
              <DossierUpload
                token={token}
                piecesAttendues={piecesAttendues}
                initialPieces={pieces}
                initialRecues={insc.piecesRecues}
              />
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {org.name} — {org.email} · {org.telephone}
        </p>
      </div>
    </main>
  );
}
