"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/lib/section-guard";
import { getTenantDb } from "@/lib/tenant";

/** Enregistre un lead saisi manuellement (ex. reçu via EDOF / Kairos / téléphone). */
export async function createManualLead(formData: FormData) {
  const session = await requireSection("leads-multicanal");
  const db = await getTenantDb();

  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telephone = String(formData.get("telephone") ?? "").trim() || null;
  const canal = String(formData.get("canal") ?? "").trim() || "Autre";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!nom && !email && !telephone) return; // au moins un identifiant

  await db.candidat.create({
    data: {
      nom: nom || "—",
      prenom: prenom || "—",
      email: email || `lead-${Date.now()}@import.local`,
      telephone,
      statut: "NOUVEAU",
      crmStage: "NOUVEAU",
      sourceConnaissance: canal,
      createdById: session?.user?.id ?? null,
      interactionsCandidat: note
        ? { create: { type: "NOTE", sujet: `Lead ${canal}`, contenu: note } }
        : undefined,
    },
  });
  revalidatePath("/leads-multicanal");
  revalidatePath("/crm");
}
