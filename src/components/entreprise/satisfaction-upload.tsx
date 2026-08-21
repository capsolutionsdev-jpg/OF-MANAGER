"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, Loader2 } from "lucide-react";
import { uploadSatisfactionRemplie } from "@/lib/actions/document-retour-actions";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

/** Bouton de dépôt de l'enquête de satisfaction remplie + signée (espace client). */
export function SatisfactionUpload({ documentId }: { documentId: string }) {
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
        const res = await uploadSatisfactionRemplie(documentId, dataUrl);
        if (!res.ok) {
          toast.error(res.error ?? "Le dépôt a échoué.");
          return;
        }
        toast.success("Enquête de satisfaction déposée. Merci !");
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
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        Déposer remplie
      </button>
    </>
  );
}
