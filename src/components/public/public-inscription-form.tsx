"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";

import {
  publicInscriptionSchema,
  type PublicInscriptionValues,
} from "@/lib/validators/public-inscription";
import { FINANCEMENT_LABELS } from "@/lib/validators/candidat";
import { submitPublicInscription } from "@/lib/actions/public-inscription-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

type SessionOption = { id: string; label: string };

export function PublicInscriptionForm({
  sessions,
}: {
  sessions: SessionOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  // Détecte les types de formations sécurité à partir du libellé de session.
  // On normalise (accents retirés, minuscules) puis on matche sur les tokens
  // réellement présents dans les titres du catalogue — sinon un bloc de
  // prérequis ne s'afficherait jamais (ex. "Opérateur en Vidéoprotection" ne
  // contient pas "opérateur vidéo", "Agent en Protection Physique (A3P)" ne
  // contient pas "agent de protection").
  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const normLabel = (selectedSession?.label ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const isTfpAps = normLabel.includes("tfp aps");
  const isApsLikeFormation =
    normLabel.includes("mac aps") ||
    normLabel.includes("videoprotection") ||
    normLabel.includes("a3p") ||
    normLabel.includes("protection physique");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PublicInscriptionValues>({
    resolver: zodResolver(publicInscriptionSchema),
    defaultValues: {
      sessionId: "",
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      dateNaissance: "",
      ville: "",
      codePostal: "",
      situationPro: "",
      employeur: "",
      financementType: "",
      cnapsHasCertification: false,
      hasCarteProAps: false,
      carteProNumero: "",
      carteProValiditeDate: "",
      hasCnapsAuth: false,
      cnapsNumero: "",
      cnapsValiditeDate: "",
      consentement: false,
    },
  });

  const cnapsHasCertification = watch("cnapsHasCertification");
  const hasCarteProAps = watch("hasCarteProAps");
  const hasCnapsAuth = watch("hasCnapsAuth");

  function onSubmit(values: PublicInscriptionValues) {
    startTransition(async () => {
      const res = await submitPublicInscription(values);
      if (res.ok) setSubmitted(true);
      else toast.error(res.error);
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
        <h2 className="text-lg font-semibold">Demande envoyée !</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Merci, votre demande d&apos;inscription a bien été enregistrée. Notre
          équipe vous recontactera rapidement pour finaliser votre dossier et le
          financement.
        </p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune session n&apos;est ouverte aux inscriptions pour le moment.
        Revenez bientôt ou contactez-nous.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="sessionId">Formation / session souhaitée *</Label>
        <select
          id="sessionId"
          className={selectClass}
          {...register("sessionId")}
          onChange={(e) => {
            setSelectedSessionId(e.target.value);
            register("sessionId").onChange?.(e);
          }}
        >
          <option value="">— Choisir —</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <ErrorText msg={errors.sessionId?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input id="prenom" {...register("prenom")} />
          <ErrorText msg={errors.prenom?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input id="nom" {...register("nom")} />
          <ErrorText msg={errors.nom?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...register("email")} />
          <ErrorText msg={errors.email?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" {...register("telephone")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="codePostal">Code postal</Label>
          <Input id="codePostal" {...register("codePostal")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="ville">Ville</Label>
          <Input id="ville" {...register("ville")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="situationPro">Situation professionnelle</Label>
          <Input
            id="situationPro"
            placeholder="Salarié, demandeur d'emploi…"
            {...register("situationPro")}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="financementType">Financement envisagé</Label>
          <select
            id="financementType"
            className={selectClass}
            {...register("financementType")}
          >
            <option value="">Non précisé</option>
            {Object.entries(FINANCEMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Prérequis TFP APS : autorisation préalable CNAPS ── */}
      {isTfpAps && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Prérequis réglementaire : Autorisation préalable CNAPS
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              {...register("cnapsHasCertification")}
            />
            <span>
              Je suis titulaire d&apos;une autorisation préalable CNAPS (valable 6 mois)
            </span>
          </label>

          {cnapsHasCertification && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="cnapsNumero" className="text-xs">
                  Numéro d&apos;autorisation CNAPS *
                </Label>
                <Input
                  id="cnapsNumero"
                  placeholder="Format : AAAA-XXXXX"
                  {...register("cnapsNumero")}
                />
                <ErrorText msg={errors.cnapsNumero?.message} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnapsValiditeDate" className="text-xs">
                  Date d&apos;expiration (fin de validité) *
                </Label>
                <Input
                  id="cnapsValiditeDate"
                  type="date"
                  {...register("cnapsValiditeDate")}
                />
                <ErrorText msg={errors.cnapsValiditeDate?.message} />
                <p className="text-xs text-muted-foreground">
                  La formation doit débuter avant cette date.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Prérequis APS-like (MAC APS, Opérateur vidéo, Agent protection) ── */}
      {isApsLikeFormation && (
        <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Prérequis réglementaire</p>

          {/* Option 1: Carte professionnelle APS */}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              {...register("hasCarteProAps")}
            />
            <span>Je possède une carte professionnelle APS valide</span>
          </label>

          {hasCarteProAps && (
            <>
              <div className="grid gap-2 pl-6">
                <Label htmlFor="carteProNumero" className="text-xs">
                  Numéro de carte professionnelle *
                </Label>
                <Input id="carteProNumero" placeholder="Format : XXXXXX" {...register("carteProNumero")} />
                <ErrorText msg={errors.carteProNumero?.message} />
              </div>
              <div className="grid gap-2 pl-6">
                <Label htmlFor="carteProValiditeDate" className="text-xs">
                  Date d&apos;expiration *
                </Label>
                <Input id="carteProValiditeDate" type="date" {...register("carteProValiditeDate")} />
                <ErrorText msg={errors.carteProValiditeDate?.message} />
              </div>
            </>
          )}

          {/* Option 2: Autorisation CNAPS (si pas de carte pro) */}
          {!hasCarteProAps && (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  {...register("hasCnapsAuth")}
                />
                <span>Je possède une autorisation préalable CNAPS valide (si carte pro expirée)</span>
              </label>

              {hasCnapsAuth && (
                <>
                  <div className="grid gap-2 pl-6">
                    <Label htmlFor="cnapsNumero" className="text-xs">
                      Numéro d&apos;autorisation CNAPS *
                    </Label>
                    <Input id="cnapsNumero" placeholder="Format : AAAA-XXXXX" {...register("cnapsNumero")} />
                    <ErrorText msg={errors.cnapsNumero?.message} />
                  </div>
                  <div className="grid gap-2 pl-6">
                    <Label htmlFor="cnapsValiditeDate" className="text-xs">
                      Date d&apos;expiration *
                    </Label>
                    <Input id="cnapsValiditeDate" type="date" {...register("cnapsValiditeDate")} />
                    <ErrorText msg={errors.cnapsValiditeDate?.message} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          {...register("consentement")}
        />
        <span>
          J&apos;accepte que mes données soient traitées par CAP Compétences dans
          le cadre de ma demande d&apos;inscription (RGPD). *
        </span>
      </label>
      <ErrorText msg={errors.consentement?.message} />

      <Button type="submit" className="w-full" disabled={isPending}>
        <Send className="mr-2 h-4 w-4" />
        {isPending ? "Envoi…" : "Envoyer ma demande d'inscription"}
      </Button>
    </form>
  );
}
