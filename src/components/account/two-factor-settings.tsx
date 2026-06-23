"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startTotpEnrollment, confirmTotp, disableTotp } from "@/lib/actions/totp-actions";

// Réglage de la double authentification (TOTP) — enrôlement par clé manuelle,
// confirmation par un premier code, désactivation protégée par un code.
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const [pending, start] = useTransition();
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  if (enabled) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm text-emerald-600">
          <ShieldCheck className="h-4 w-4" /> Double authentification <strong>activée</strong>.
        </p>
        <Label htmlFor="disable-code">Saisissez un code pour la désactiver</Label>
        <div className="flex gap-2">
          <Input
            id="disable-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="max-w-[140px]"
          />
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await disableTotp(code);
                if (r.ok) {
                  toast.success("2FA désactivée.");
                  window.location.reload();
                } else toast.error(r.error ?? "Erreur");
                setCode("");
              })
            }
          >
            <ShieldOff className="mr-2 h-4 w-4" /> Désactiver
          </Button>
        </div>
      </div>
    );
  }

  if (!secret) {
    return (
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await startTotpEnrollment();
            if (r.ok) setSecret(r.secret);
            else toast.error(r.error);
          })
        }
      >
        <ShieldCheck className="mr-2 h-4 w-4" /> Activer la double authentification
      </Button>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <p>
        1. Dans votre application d&apos;authentification (Google Authenticator, Authy,
        1Password…), ajoutez un compte avec cette clé :
      </p>
      <code className="block break-all rounded bg-muted p-2 font-mono text-xs">{secret}</code>
      <p>2. Saisissez le code à 6 chiffres affiché pour confirmer l&apos;activation :</p>
      <div className="flex gap-2">
        <Input
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="max-w-[140px]"
        />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await confirmTotp(code);
              if (r.ok) {
                toast.success("2FA activée.");
                window.location.reload();
              } else toast.error(r.error ?? "Erreur");
            })
          }
        >
          Confirmer
        </Button>
      </div>
    </div>
  );
}
