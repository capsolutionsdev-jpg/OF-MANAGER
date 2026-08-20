"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SessionOption } from "@/components/inscriptions/quick-enroll-modal";
import { inviterInscriptionDistance } from "@/lib/actions/inscription-actions";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Inscription « à distance » : nom, prénom, e-mail + formation + session. Le
 * candidat reçoit un e-mail l'invitant à compléter son dossier, consulter ses
 * documents et signer en ligne ; son inscription à la session est validée après
 * signature (flux parcours).
 */
export function InvitationDistanceForm({
  formations,
  sessions,
}: {
  formations: { id: string; titre: string }[];
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [formationSouhaiteeId, setFormationSouhaiteeId] = useState("");
  const [sessionId, setSessionId] = useState("");

  const sessionsPourFormation = sessions.filter(
    (s) => s.formationId === formationSouhaiteeId,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim() || !email.trim()) {
      toast.error("Nom, prénom et e-mail sont requis.");
      return;
    }
    if (!formationSouhaiteeId) {
      toast.error("Choisissez la formation.");
      return;
    }
    if (!sessionId) {
      toast.error("Choisissez la session.");
      return;
    }
    startTransition(async () => {
      const res = await inviterInscriptionDistance({
        nom,
        prenom,
        email,
        formationSouhaiteeId,
        sessionId,
      });
      if (res.ok) {
        if (res.sent) {
          toast.success("Invitation envoyée au candidat par e-mail.");
        } else {
          toast.warning(
            `Inscription créée, mais l'e-mail n'a pas pu être envoyé. ${res.error ?? "Vérifiez la configuration e-mail."} Vous pourrez renvoyer le lien depuis la fiche.`,
          );
        }
        if (res.candidatId) router.push(`/candidats/${res.candidatId}`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Erreur.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Inscription à distance</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Le candidat recevra un e-mail pour{" "}
            <b>compléter son dossier, consulter ses documents et signer en ligne</b>.
            Son inscription à la session choisie sera validée après signature.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="d-nom">Nom *</Label>
              <Input id="d-nom" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-prenom">Prénom *</Label>
              <Input id="d-prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="d-email">Email *</Label>
              <Input
                id="d-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.fr"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="d-formation">Formation *</Label>
              <select
                id="d-formation"
                className={selectClass}
                value={formationSouhaiteeId}
                onChange={(e) => {
                  setFormationSouhaiteeId(e.target.value);
                  setSessionId("");
                }}
              >
                <option value="">— Sélectionnez —</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titre}
                  </option>
                ))}
              </select>
            </div>
            {formationSouhaiteeId && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="d-session">Session *</Label>
                {sessionsPourFormation.length > 0 ? (
                  <select
                    id="d-session"
                    className={selectClass}
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                  >
                    <option value="">— Sélectionnez —</option>
                    {sessionsPourFormation.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aucune session à venir pour cette formation. Créez une session,
                    ou utilisez le mode « Sur place ».
                  </p>
                )}
              </div>
            )}
          </div>
          <Button type="submit" disabled={isPending || !sessionId}>
            <Send className="mr-2 h-4 w-4" />
            {isPending ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
