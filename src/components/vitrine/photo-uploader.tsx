"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { addPhotoVitrineAction } from "@/lib/actions/photo-vitrine-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Upload d'une photo pour une zone du site vitrine : POST /api/upload (Vercel
// Blob) → URL, puis enregistrement via la server action.
export function PhotoUploader({ zone }: { zone: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [legende, setLegende] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const up = new FormData();
      up.set("file", file);
      up.set("folder", "vitrine-photos");
      const res = await fetch("/api/upload", { method: "POST", body: up });
      const j = await res.json();
      if (!res.ok || !j.url) {
        toast.error(j.error || "Échec de l'upload.");
        setBusy(false);
        return;
      }
      const fd = new FormData();
      fd.set("zone", zone);
      fd.set("url", j.url);
      fd.set("legende", legende);
      await addPhotoVitrineAction(fd);
      toast.success("Photo ajoutée.");
      setFile(null);
      setLegende("");
      router.refresh();
    } catch {
      toast.error("Erreur réseau pendant l'upload.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center">
      <Input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      <Input
        placeholder="Légende (nom du partenaire, titre de la session…)"
        value={legende}
        onChange={(e) => setLegende(e.target.value)}
        className="flex-1"
      />
      <Button type="button" onClick={submit} disabled={!file || busy} className="shrink-0">
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        Ajouter
      </Button>
    </div>
  );
}
