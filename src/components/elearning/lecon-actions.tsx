"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Circle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setLeconDone } from "@/lib/actions/learning-actions";

export function LeconActions({
  leconId,
  coursId,
  done,
  prevId,
  nextId,
}: {
  leconId: string;
  coursId: string;
  done: boolean;
  prevId: string | null;
  nextId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await setLeconDone(leconId, !done);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur.");
        return;
      }
      toast.success(!done ? "Leçon terminée ✓" : "Marquée à revoir.");
      if (!done && nextId) router.push(`/mes-cours/${coursId}?l=${nextId}`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!prevId}
          render={prevId ? <Link href={`/mes-cours/${coursId}?l=${prevId}`} /> : undefined}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!nextId}
          render={nextId ? <Link href={`/mes-cours/${coursId}?l=${nextId}`} /> : undefined}
        >
          Suivant <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
      <Button
        onClick={toggle}
        disabled={isPending}
        variant={done ? "outline" : "default"}
      >
        {done ? (
          <>
            <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> Terminée — revoir
          </>
        ) : (
          <>
            <Circle className="mr-1.5 h-4 w-4" /> Marquer comme terminée
          </>
        )}
      </Button>
    </div>
  );
}
