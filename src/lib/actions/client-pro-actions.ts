"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTenantDb } from "@/lib/tenant";
import { isValidSiret, SIRET_ERROR_MESSAGE } from "@/lib/validators/siret";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireUser() {
  // Correctif audit P2-1 (BFLA) : réservé au personnel — rejette les rôles non-staff.
  // OFM-01 : ENTREPRISE (client B2B, tiers externe) a un login + un organisme mais
  // ne doit déclencher AUCUNE action de gestion (cf. NON_STAFF_ROLES dans tenant.ts).
  // Il manquait à cette liste → un compte client pouvait piloter les clients pro.
  const session = await auth();
  const role = session?.user?.role as string | undefined;
  if (!session?.user || role === "APPRENANT" || role === "FORMATEUR" || role === "ENTREPRISE") {
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
  // Retour visible après enregistrement (D11) + gestion propre des erreurs de
  // validation (SIRET/e-mail) au lieu d'un 500 : redirection avec un drapeau lu
  // par <SavedToast>. NB : redirect() lève en interne → hors du try/catch.
  let error: string | null = null;
  try {
    await db.entreprise.update({ where: { id }, data: champs(formData) });
    revalidatePath(`/clients-pro/${id}`);
    revalidatePath("/clients-pro");
  } catch (e) {
    error = e instanceof Error ? e.message : "Enregistrement impossible.";
  }
  if (error) redirect(`/clients-pro/${id}?error=${encodeURIComponent(error)}`);
  redirect(`/clients-pro/${id}?saved=1`);
}

export async function rattacherCandidat(formData: FormData) {
  const db = await getTenantDb();
  await requireUser();
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const candidatId = String(formData.get("candidatId") ?? "");
  if (!entrepriseId || !candidatId) return;
  // OFM-01 (défense en profondeur) : vérifier que l'entreprise appartient bien au
  // tenant avant de rattacher (db est cloisonné → findFirst renvoie null sinon).
  const ent = await db.entreprise.findFirst({ where: { id: entrepriseId }, select: { id: true } });
  if (!ent) throw new Error("Client pro introuvable pour cet organisme.");
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
