"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";
import { sendSms } from "@/lib/sms";

export type SmsActionResult = { ok: boolean; demo?: boolean; error?: string };

/** Envoie un SMS à un candidat (ou à un numéro libre) et le journalise. */
export async function sendSmsAction(formData: FormData): Promise<SmsActionResult> {
  const session = await requireSection("sms");
  const db = await getTenantDb();
  const organismeId = session?.user?.organismeId ?? null;

  const candidatId = String(formData.get("candidatId") ?? "").trim() || null;
  let to = String(formData.get("to") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { ok: false, error: "Message vide." };

  if (candidatId && !to) {
    const c = await db.candidat.findUnique({
      where: { id: candidatId },
      select: { telephone: true },
    });
    to = c?.telephone ?? "";
  }
  if (!to) return { ok: false, error: "Aucun numéro de téléphone." };

  // sendSms journalise lui-même (SmsLog) + applique le quota + gère le numéro
  // invalide → plus de journalisation en double ici.
  const res = await sendSms({
    to,
    body,
    organismeId,
    candidatId,
    createdById: session?.user?.id ?? null,
  });

  revalidatePath("/sms");
  if (!res.sent && !res.demo) {
    return { ok: false, error: res.error ?? "Échec de l'envoi du SMS." };
  }
  return { ok: true, demo: res.demo };
}
