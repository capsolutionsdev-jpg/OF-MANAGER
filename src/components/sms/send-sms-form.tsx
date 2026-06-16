"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendSmsAction } from "@/lib/actions/sms-actions";

export type SmsRecipient = { id: string; label: string; phone: string | null };

const TEMPLATES: { label: string; text: string }[] = [
  { label: "Relance", text: "Bonjour, suite à votre demande de formation, êtes-vous toujours intéressé(e) ? N'hésitez pas à nous rappeler. " },
  { label: "Convocation", text: "Bonjour, nous vous confirmons votre session de formation. Vous recevrez la convocation détaillée par e-mail. À bientôt ! " },
  { label: "Rappel", text: "Rappel : votre formation débute prochainement. Pensez à préparer vos identifiants de connexion. " },
];

export function SendSmsForm({ recipients }: { recipients: SmsRecipient[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [candidatId, setCandidatId] = useState("");

  const selected = recipients.find((r) => r.id === candidatId);

  function onSubmit(formData: FormData) {
    if (!body.trim()) {
      toast.error("Saisissez un message.");
      return;
    }
    startTransition(async () => {
      const res = await sendSmsAction(formData);
      if (res.ok) {
        if (res.demo) {
          toast.info("Mode démo : SMS journalisé (configurez une clé Brevo pour l'envoi réel).");
        } else {
          toast.success("SMS envoyé.");
        }
        formRef.current?.reset();
        setBody("");
        setCandidatId("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Échec de l'envoi.");
      }
    });
  }

  const len = body.length;
  const segments = Math.max(1, Math.ceil(len / 160));

  return (
    <form ref={formRef} action={onSubmit} className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="candidatId">Destinataire (candidat)</Label>
          <select
            id="candidatId"
            name="candidatId"
            value={candidatId}
            onChange={(e) => setCandidatId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Numéro libre —</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id} disabled={!r.phone}>
                {r.label} {r.phone ? `(${r.phone})` : "— sans numéro"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to">Ou numéro libre</Label>
          <Input id="to" name="to" placeholder="+33 6 12 34 56 78" disabled={!!selected?.phone} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setBody(t.text)}
            className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="body">Message</Label>
        <Textarea
          id="body"
          name="body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message…"
        />
        <p className="text-right text-xs text-muted-foreground">
          {len} caractère{len > 1 ? "s" : ""} · {segments} SMS
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        <Send className="mr-1.5 h-4 w-4" /> {isPending ? "Envoi…" : "Envoyer le SMS"}
      </Button>
    </form>
  );
}
