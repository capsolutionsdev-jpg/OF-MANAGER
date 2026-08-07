import { PenLine, CheckCircle2, Clock } from "lucide-react";
import { getTenantDb } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { yousignConfigured } from "@/lib/yousign";
import {
  requestDocumentSignature,
  markSignatureSigned,
} from "@/lib/actions/signature-actions";

export async function SignatureSection({
  inscriptionId,
  type,
  label,
}: {
  inscriptionId: string;
  type: string;
  label: string;
}) {
  const db = await getTenantDb();
  const sig = await db.signatureRequest.findFirst({
    where: { inscriptionId, signataires: { path: ["type"], equals: type } },
    orderBy: { createdAt: "desc" },
  });
  const demo = !yousignConfigured();

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <span className="font-medium">Signature électronique :</span>

      {sig?.statut === "SIGNEE" ? (
        <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Signé le {sig.signedAt?.toLocaleDateString("fr-FR")}
        </Badge>
      ) : sig?.statut === "ENVOYEE" ? (
        <>
          <Badge variant="secondary">
            <Clock className="mr-1 h-3.5 w-3.5" /> Envoyée — en attente
          </Badge>
          <form action={markSignatureSigned}>
            <input type="hidden" name="id" value={sig.id} />
            <input
              type="hidden"
              name="back"
              value={`/documents/${inscriptionId}/${type}`}
            />
            <Button type="submit" size="sm" variant="outline">
              Marquer comme signé
            </Button>
          </form>
        </>
      ) : (
        <form action={requestDocumentSignature}>
          <input type="hidden" name="inscriptionId" value={inscriptionId} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="label" value={label} />
          <Button type="submit" size="sm" variant="outline">
            <PenLine className="mr-1.5 h-4 w-4" /> Demander la signature (Yousign)
          </Button>
        </form>
      )}

      {demo && (
        <span className="text-xs text-muted-foreground">
          Mode démo — renseignez YOUSIGN_API_KEY pour l&apos;envoi réel.
        </span>
      )}
    </div>
  );
}
