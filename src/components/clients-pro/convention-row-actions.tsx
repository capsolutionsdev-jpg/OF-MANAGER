"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadConventionSigneeStaff } from "@/lib/actions/convention-signature-actions";
import { signerConvention } from "@/lib/actions/convention-actions";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function ConventionRowActions({
  conventionId,
  isSignee,
}: {
  conventionId: string;
  isSignee: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Le fichier doit être un PDF.");
    if (file.size > 3.5 * 1024 * 1024) return toast.error("PDF trop volumineux (max 3,5 Mo).");
    start(async () => {
      try {
        const dataUrl = await readAsDataUrl(file);
        const res = await uploadConventionSigneeStaff(conventionId, dataUrl);
        if (!res.ok) {
          toast.error(res.error ?? "Le dépôt a échoué.");
          return;
        }
        toast.success("Convention signée déposée.");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch {
        toast.error("Le dépôt a échoué.");
      }
    });
  }

  function valider() {
    start(async () => {
      const res = await signerConvention(conventionId);
      if (!res.ok) {
        toast.error(res.error ?? "La validation a échoué.");
        return;
      }
      toast.success("Convention validée — inscriptions confirmées.");
      router.refresh();
    });
  }

  if (isSignee) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Validée
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
      <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()} disabled={pending}>
        <UploadCloud className="mr-1.5 h-4 w-4" /> Déposer le signé
      </Button>
      <Button size="sm" onClick={valider} disabled={pending}>
        {pending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        Valider
      </Button>
    </div>
  );
}
