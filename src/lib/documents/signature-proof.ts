import { createHash } from "node:crypto";

/** Référence unique et stable d'une signature (piste d'audit). */
export function signatureRef(inscriptionId: string, signedAt: Date): string {
  return createHash("sha256")
    .update(`${inscriptionId}|${signedAt.toISOString()}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

/** Bloc HTML « signé électroniquement » apposé en pied de chaque document signé. */
export function signatureMentionHtml(opts: {
  nom: string;
  signedAt: Date;
  ip: string | null;
  ref: string;
}): string {
  const d = opts.signedAt.toLocaleString("fr-FR");
  return `<div class="doc-footer" style="margin-top:10pt;border-top:1px solid #999;padding-top:6pt">
  ✔ Document signé électroniquement par <strong>${opts.nom}</strong> le ${d}
  — référence ${opts.ref}${opts.ip ? ` — IP ${opts.ip}` : ""}.<br/>
  Signature électronique de niveau « avancé » (consentement horodaté). Preuve : certificat de signature joint.
</div>`;
}
