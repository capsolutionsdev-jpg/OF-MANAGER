"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadConventionSigneeClient } from "@/lib/actions/convention-signature-actions";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function ConventionUpload({ conventionId }: { conventionId: string }) {
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
        const res = await uploadConventionSigneeClient(conventionId, dataUrl);
        if (!res.ok) {
          toast.error(res.error ?? "Le dépôt a échoué.");
          return;
        }
        toast.success("Convention signée déposée. Votre organisme va la valider.");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } catch {
        toast.error("Le dépôt a échoué.");
      }
    });
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
      <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={pending}>
        {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
        Déposer la version signée
      </Button>
    </>
  );
}
