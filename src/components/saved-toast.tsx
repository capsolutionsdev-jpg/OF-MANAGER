"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Affiche un toast de succès quand l'URL porte `?saved=1` — motif « flash »
 * après un enregistrement via server action `<form action>` (qui, sans cela, ne
 * donne aucun retour visible). Nettoie le paramètre juste après (D11).
 */
export function SavedToast({
  message = "Modifications enregistrées.",
}: {
  message?: string;
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (sp.get("saved") === "1") {
      shown.current = true;
      toast.success(message);
      router.replace(pathname, { scroll: false });
    } else if (sp.get("error")) {
      shown.current = true;
      toast.error(sp.get("error")!);
      router.replace(pathname, { scroll: false });
    }
  }, [sp, router, pathname, message]);

  return null;
}
