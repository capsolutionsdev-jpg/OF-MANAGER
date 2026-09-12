import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/token";
import { seedDemoData } from "@/lib/demo/seed";
import { logLeadEvent } from "@/lib/growth/events";
import { purgeDemoOrganisme } from "@/lib/demo/purge";
import { reportError } from "@/lib/observability/report-error";

export type DemoMetier = "securite" | "vtc_taxi" | "les_deux" | "autre";

const DEMO_HARD_TTL_DAYS = Number(process.env.DEMO_HARD_TTL_DAYS ?? 7);

const ALL_FEATURES = [
  "crm", "candidats", "clients-pro", "formations", "sessions", "suivi-pedagogique",
  "formateurs", "planning", "salles", "documents", "signatures", "automatisations",
  "elearning", "comptabilite", "facturation", "qualiopi", "bpf", "rgpd", "kanban",
  "taches", "notifications", "devis-signature", "leads-multicanal", "sms",
  "portail-client", "rapports", "scoring", "ia", "support", "diplomes", "jurys",
];

/** Métier → Academies à seeder (les_deux = les deux). */
function academiesFor(metier: DemoMetier): ("SAFETY" | "TRANSPORT")[] {
  switch (metier) {
    case "vtc_taxi": return ["TRANSPORT"];
    case "les_deux": return ["SAFETY", "TRANSPORT"];
    case "securite":
    case "autre":
    default: return ["SAFETY"];
  }
}

function slug(s: string): string {
  return (s || "demo")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 24) || "demo";
}

/** Mot de passe aléatoire fort (12 caractères URL-safe). */
function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

export type ProvisionInput = {
  email: string;
  nom?: string | null;
  organisme?: string | null;
  telephone?: string | null;
  metier: DemoMetier;
  utm?: { source?: string; medium?: string; campaign?: string } | null;
  ip?: string | null;
};

export type ProvisionResult = { ok: true; orgId: string; login: string } | { ok: false; error: string };

/**
 * Provisionne un environnement de démonstration ISOLÉ pour un prospect :
 * crée le Lead, un tenant `isDemo`, un admin dédié, injecte les données de démo,
 * envoie l'e-mail d'accès et notifie l'éditeur. Ne renvoie/journalise JAMAIS le
 * mot de passe en clair (il ne transite que dans l'e-mail au prospect).
 */
export async function provisionDemo(input: ProvisionInput): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  const academies = academiesFor(input.metier);
  const primary = academies[0];

  // 1) Lead (source "demo") — trace la demande côté console éditeur.
  const utmTxt = input.utm
    ? `UTM: ${[input.utm.source, input.utm.medium, input.utm.campaign].filter(Boolean).join(" / ")}`
    : null;
  const lead = await prisma.lead.create({
    data: {
      nom: input.nom?.trim() || email,
      organisme: input.organisme?.trim() || null,
      email,
      telephone: input.telephone?.trim() || null,
      source: "demo",
      message: [`Demande de démo (${input.metier})`, utmTxt].filter(Boolean).join(" — ") || null,
    },
    select: { id: true },
  });
  await logLeadEvent(lead.id, "creation", { meta: { source: "demo" } });
  await logLeadEvent(lead.id, "demo_demandee", { meta: { metier: input.metier } });

  // 2→5) Tenant démo + admin + données + lien Lead — sous COMPENSATION (A12-011) :
  // ces étapes ne sont pas transactionnelles (seedDemoData = nombreuses écritures) ;
  // si l'une échoue, on PURGE le tenant partiel (purgeDemoOrganisme, réservé aux
  // démos) pour ne laisser ni résidu ni doublon au réessai.
  const short = randomBytes(3).toString("hex"); // 6 hex
  const nomBase = input.organisme?.trim() || input.nom?.trim() || "Prospect";
  const login = `demo-${slug(nomBase)}-${short}`.slice(0, 40);
  const loginEmail = `${login}@demo.local`;
  const password = genPassword();
  let orgId: string | null = null;
  try {
    const org = await prisma.organisme.create({
      data: {
        nom: `DÉMO — ${nomBase}`.slice(0, 80),
        email,
        sousDomaine: `demo-${slug(nomBase)}-${short}`.slice(0, 60),
        statut: "ACTIF",
        formule: "RESEAU",
        couleurPrimaire: "#7C3AED",
        design: "defaut",
        fonctionnalites: { set: ALL_FEATURES },
        isDemo: true,
        demoHardExpiresAt: new Date(Date.now() + DEMO_HARD_TTL_DAYS * 86_400_000),
      },
      select: { id: true },
    });
    orgId = org.id;

    // Admin de démo (login lisible ; auth par e-mail interne au tenant démo).
    await prisma.user.create({
      data: {
        email: loginEmail,
        name: `${input.nom?.trim() || "Utilisateur"} (Démo)`,
        role: "ADMIN",
        organismeId: org.id,
        isActive: true,
        mustChangePassword: false,
        passwordHash: bcrypt.hashSync(password, 12),
      },
    });

    // Données de démo selon le métier.
    for (const ac of academies) {
      await seedDemoData(org.id, ac);
    }

    // Lien Lead → démo.
    await prisma.lead.update({ where: { id: lead.id }, data: { demoOrganismeId: org.id } });
    await logLeadEvent(lead.id, "demo_provisionnee", {
      meta: { orgId: org.id, academies: academies.join(",") },
    });
  } catch (e) {
    if (orgId) {
      try {
        await purgeDemoOrganisme(orgId);
      } catch {
        /* compensation best-effort : le cron de purge (filet dur) rattrapera un résidu */
      }
    }
    await reportError(e, { tag: "demo:provision", extra: { leadId: lead.id } });
    return { ok: false, error: "La création de votre démo a échoué. Réessayez ou contactez-nous." };
  }
  // À ce stade le provisionnement a réussi (sinon le catch ci-dessus a retourné).
  if (!orgId) return { ok: false, error: "Création de démo incomplète." };

  // 6) E-mail d'accès au prospect (mot de passe en clair UNIQUEMENT ici).
  const link = appBaseUrl();
  await sendEmail({
    to: email,
    subject: "Votre démo OFManager est prête",
    body:
      `Bonjour${input.nom ? " " + input.nom.trim() : ""},\n\n` +
      `Votre environnement de démonstration OFManager est prêt. Il est pré-rempli avec des données ` +
      `d'exemple (${primary === "TRANSPORT" ? "VTC / taxi" : "sécurité / prévention"}) et reste actif ` +
      `48 heures après votre première connexion.\n\n` +
      `Accès : ${link}/login\n` +
      `Identifiant : ${loginEmail}\n` +
      `Mot de passe : ${password}\n\n` +
      `À tout moment, vous pouvez prendre rendez-vous ou souscrire depuis l'application.\n\n` +
      `Bonne découverte !\nL'équipe OFManager`,
  });

  // 7) Notification éditeur (non bloquante).
  const notify = process.env.DEMO_NOTIFY_EMAIL || process.env.LEAD_NOTIF_EMAIL || process.env.BREVO_SENDER;
  if (notify) {
    await sendEmail({
      to: notify,
      subject: `Nouvelle démo provisionnée — ${nomBase}`,
      body:
        `Nouvelle demande de démo :\n` +
        `- Nom : ${input.nom ?? "—"}\n- Organisme : ${input.organisme ?? "—"}\n` +
        `- E-mail : ${email}\n- Téléphone : ${input.telephone ?? "—"}\n` +
        `- Métier : ${input.metier}\n${utmTxt ? "- " + utmTxt + "\n" : ""}` +
        `\nTenant démo : ${orgId}`,
    });
  }

  return { ok: true, orgId, login: loginEmail };
}
