"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role, OrganismeStatut, FormuleAbonnement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/superadmin-guard";
import { FEATURE_KEYS, CORE_FEATURE_KEYS } from "@/lib/features";
import { FORMULE_KEYS, type FormuleKey } from "@/lib/plans";
import { resolveFeaturesForFormule } from "@/lib/pricing";
import { uniqueSubdomain, toSubdomain, isValidSubdomain } from "@/lib/subdomain";

export type ConsoleState = { ok?: boolean; error?: string; id?: string; sousDomaine?: string };

// Valeurs d'amorçage d'un nouvel organisme (modifiables ensuite dans la console).
const DEFAULT_DESIGN = "defaut";
const DEFAULT_COULEUR = "#2C53C0";

const clean = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

const STATUTS = new Set(Object.values(OrganismeStatut) as string[]);

/** Lit le champ `formule` du formulaire (ou null si absent/invalide). */
const readFormule = (fd: FormData): FormuleAbonnement | null => {
  const raw = String(fd.get("formule") ?? "");
  return FORMULE_KEYS.has(raw) ? (raw as FormuleAbonnement) : null;
};

/** Lit un entier positif (ou null si vide/invalide). */
const readPositiveInt = (v: FormDataEntryValue | null): number | null => {
  const raw = String(v ?? "").trim();
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
};

/** Crée un organisme client + son compte gérant (ADMIN). SUPERADMIN uniquement. */
export async function createOrganisme(
  _prev: ConsoleState | undefined,
  formData: FormData,
): Promise<ConsoleState> {
  await requireSuperAdmin();

  const nom = String(formData.get("nom") ?? "").trim();
  const gerantName = String(formData.get("gerantName") ?? "").trim();
  const gerantEmail = String(formData.get("gerantEmail") ?? "").trim().toLowerCase();
  const gerantPassword = String(formData.get("gerantPassword") ?? "");

  if (!nom) return { error: "Le nom commercial de l'organisme est requis." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gerantEmail))
    return { error: "E-mail du gérant invalide." };
  if (gerantPassword.length < 8)
    return { error: "Mot de passe du gérant : 8 caractères minimum." };

  const exists = await prisma.user.findUnique({ where: { email: gerantEmail } });
  if (exists) return { error: "Un compte existe déjà avec cet e-mail." };

  // Sous-domaine : choisi par l'éditeur (validé) sinon généré à partir du nom.
  const sousDomaineRaw = toSubdomain(String(formData.get("sousDomaine") ?? ""));
  let sousDomaine: string;
  if (sousDomaineRaw) {
    if (!isValidSubdomain(sousDomaineRaw))
      return { error: "Sous-domaine invalide ou réservé (lettres, chiffres et tirets uniquement)." };
    const taken = await prisma.organisme.findUnique({
      where: { sousDomaine: sousDomaineRaw },
      select: { id: true },
    });
    if (taken) return { error: `Le sous-domaine « ${sousDomaineRaw} » est déjà utilisé.` };
    sousDomaine = sousDomaineRaw;
  } else {
    sousDomaine = await uniqueSubdomain(nom);
  }

  const formule = readFormule(formData);
  let fonctionnalites = FEATURE_KEYS.filter((k) => formData.get(`feat_${k}`) === "on");
  if (fonctionnalites.length === 0) {
    // repli : composition (résolue) de la formule choisie, sinon le « Cœur ».
    fonctionnalites = formule ? await resolveFeaturesForFormule(formule as FormuleKey) : CORE_FEATURE_KEYS;
  }

  const org = await prisma.organisme.create({
    data: {
      nom,
      raisonSociale: clean(formData.get("raisonSociale")),
      statut: OrganismeStatut.ESSAI,
      formule,
      fonctionnalites,
      // Provisioning : sous-domaine + apparence par défaut (personnalisables ensuite).
      sousDomaine,
      design: DEFAULT_DESIGN,
      couleurPrimaire: DEFAULT_COULEUR,
    },
  });

  await prisma.user.create({
    data: {
      name: gerantName || "Gérant",
      email: gerantEmail,
      passwordHash: await bcrypt.hash(gerantPassword, 10),
      role: Role.ADMIN,
      isActive: true,
      organismeId: org.id,
    },
  });

  revalidatePath("/console");
  revalidatePath("/console/organismes");
  return { ok: true, id: org.id, sousDomaine };
}

/** Met à jour l'identité, les fonctionnalités activées et le statut d'un organisme. */
export async function updateOrganisme(
  id: string,
  _prev: ConsoleState | undefined,
  formData: FormData,
): Promise<ConsoleState> {
  await requireSuperAdmin();

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom) return { error: "Le nom commercial est requis." };

  const statutRaw = String(formData.get("statut") ?? "");
  const statut = STATUTS.has(statutRaw)
    ? (statutRaw as OrganismeStatut)
    : OrganismeStatut.ESSAI;

  const fonctionnalites = FEATURE_KEYS.filter(
    (k) => formData.get(`feat_${k}`) === "on",
  );

  // Documents personnalisés (choix « notre modèle / doc du client » par document)
  let documentsConfig: Record<string, unknown> = {};
  const dcRaw = formData.get("documentsConfig");
  if (typeof dcRaw === "string" && dcRaw.trim() !== "") {
    try {
      documentsConfig = JSON.parse(dcRaw);
    } catch {
      documentsConfig = {};
    }
  }

  // Matrice d'automatisations (quoi / quand / canal + modèles)
  let automationsConfig: Record<string, unknown> = {};
  const acRaw = formData.get("automationsConfig");
  if (typeof acRaw === "string" && acRaw.trim() !== "") {
    try {
      automationsConfig = JSON.parse(acRaw);
    } catch {
      automationsConfig = {};
    }
  }

  // Clés API (write-only) : on ne met à jour que si une nouvelle valeur est
  // saisie — un champ laissé vide conserve la clé existante (jamais d'effacement
  // accidentel), et la valeur n'a jamais transité par le navigateur (SecretField).
  const newBrevo = String(formData.get("brevoApiKey") ?? "").trim();
  const newAnthropic = String(formData.get("anthropicApiKey") ?? "").trim();
  const newYousign = String(formData.get("yousignApiKey") ?? "").trim();

  await prisma.organisme.update({
    where: { id },
    data: {
      nom,
      raisonSociale: clean(formData.get("raisonSociale")),
      representant: clean(formData.get("representant")),
      representantQualite: clean(formData.get("representantQualite")),
      siret: clean(formData.get("siret")),
      nda: clean(formData.get("nda")),
      numeroTva: clean(formData.get("numeroTva")),
      adresse: clean(formData.get("adresse")),
      codePostal: clean(formData.get("codePostal")),
      ville: clean(formData.get("ville")),
      telephone: clean(formData.get("telephone")),
      email: clean(formData.get("email")),
      siteWeb: clean(formData.get("siteWeb")),
      certificateur: clean(formData.get("certificateur")),
      qualiopiNumero: clean(formData.get("qualiopiNumero")),
      assujettiTva: formData.get("assujettiTva") === "on",
      couleurPrimaire: clean(formData.get("couleurPrimaire")),
      couleurSecondaire: clean(formData.get("couleurSecondaire")),
      theme: clean(formData.get("theme")),
      design: clean(formData.get("design")),
      appUrl: clean(formData.get("appUrl")),
      version: clean(formData.get("version")),
      sousDomaine: clean(formData.get("sousDomaine")),
      emailExpediteurNom: clean(formData.get("emailExpediteurNom")),
      emailExpediteur: clean(formData.get("emailExpediteur")),
      ...(newBrevo ? { brevoApiKey: newBrevo } : {}),
      ...(newAnthropic ? { anthropicApiKey: newAnthropic } : {}),
      ...(newYousign ? { yousignApiKey: newYousign } : {}),
      automationsConfig: automationsConfig as Prisma.InputJsonValue,
      maxSmsMois: readPositiveInt(formData.get("maxSmsMois")),
      logoUrl: clean(formData.get("logoUrl")),
      cachetUrl: clean(formData.get("cachetUrl")),
      signatureUrl: clean(formData.get("signatureUrl")),
      faviconUrl: clean(formData.get("faviconUrl")),
      maxUtilisateurs: readPositiveInt(formData.get("maxUtilisateurs")),
      notes: clean(formData.get("notes")),
      documentsConfig: documentsConfig as Prisma.InputJsonValue,
      statut,
      formule: readFormule(formData),
      fonctionnalites,
    },
  });

  revalidatePath("/console");
  revalidatePath("/console/organismes");
  revalidatePath(`/console/${id}`);
  return { ok: true };
}
