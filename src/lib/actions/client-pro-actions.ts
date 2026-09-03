"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { isValidSiret, SIRET_ERROR_MESSAGE } from "@/lib/validators/siret";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireUser() {
  // Correctif audit P2-1 (BFLA) : réservé au personnel — rejette APPRENANT/FORMATEUR
  // (qui ont un login + un organisme mais ne doivent pas gérer les clients pro).
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || role === "APPRENANT" || role === "FORMATEUR") {
    throw new Error("Non autorisé.");
  }
  return session.user;
}

function champs(formData: FormData) {
  const v = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const data = {
    raisonSociale: String(formData.get("raisonSociale") ?? "").trim(),
    siret: v("siret"),
    numeroTva: v("numeroTva"),
    adresse: v("adresse"),
    codePostal: v("codePostal"),
    ville: v("ville"),
    representant: v("representant"),
    fonction: v("fonction"),
    contactNom: v("contactNom"),
    contactEmail: v("contactEmail"),
    contactTel: v("contactTel"),
    opco: v("opco"),
    notes: v("notes"),
  };
  // Le SIRET et l'e-mail du contact partent dans les conventions/devis : on les
  // refuse à la source plutôt que de les laisser filer dans un document signé.
  if (data.siret && !isValidSiret(data.siret)) throw new Error(SIRET_ERROR_MESSAGE);
  if (data.contactEmail && !EMAIL_RE.test(data.contactEmail))
    throw new Error("Adresse e-mail du contact invalide.");
  return data;
}

export async function creerClientPro(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const data = champs(formData);
  if (!data.raisonSociale) throw new Error("Raison sociale requise.");
  const client = await db.entreprise.create({ data });
  revalidatePath("/clients-pro");
  redirect(`/clients-pro/${client.id}`);
}

export async function majClientPro(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.entreprise.update({ where: { id }, data: champs(formData) });
  revalidatePath(`/clients-pro/${id}`);
  revalidatePath("/clients-pro");
}

export async function rattacherCandidat(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const candidatId = String(formData.get("candidatId") ?? "");
  if (!entrepriseId || !candidatId) return;
  await db.candidat.update({
    where: { id: candidatId },
    data: { entrepriseId },
  });
  revalidatePath(`/clients-pro/${entrepriseId}`);
}

export async function detacherCandidat(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const candidatId = String(formData.get("candidatId") ?? "");
  if (!candidatId) return;
  await db.candidat.update({
    where: { id: candidatId },
    data: { entrepriseId: null },
  });
  revalidatePath(`/clients-pro/${entrepriseId}`);
}
