"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sendAutomationEventNow } from "@/lib/actions/manual-send-actions";
import { MANUAL_EVENTS, type ManualEvent } from "@/lib/manual-events";

/** Menu « Envoyer manuellement » un automatisme pour une inscription précise. */
export function ManualSendMenu({ inscriptionId }: { inscriptionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function envoyer(event: ManualEvent, label: string) {
    startTransition(async () => {
      const r = await sendAutomationEventNow(inscriptionId, event);
      if (r.ok) {
        toast.success(`${label} — envoyé.`);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Envoyer manuellement" disabled={isPending} />}>
        <Send className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Envoyer manuellement</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MANUAL_EVENTS.map((e) => (
          <DropdownMenuItem key={e.key} onClick={() => envoyer(e.key, e.label)}>
            {e.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
