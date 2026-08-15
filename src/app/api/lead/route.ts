import { NextResponse } from "next/server";
import { FinancementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { orgConfig } from "@/lib/org-config";
import { appBaseUrl } from "@/lib/token";
import { checkLimit, clientIp } from "@/lib/rate-limit";
import { sendPushToOrgStaff } from "@/lib/push";

export const runtime = "nodejs";

// Envoie la notification "nouveau prospect" à l'organisme (e-mail de la plateforme,
// déjà fonctionnel). Non bloquant : n'échoue jamais la création du prospect.
async function notifierNouveauProspect(infos: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  formationTitre: string;
  financement: string;
  origine: string;
  sourceConnaissance: string;
  message: string | null;
  session?: string;
  objectifs?: string;
  dejaConnu: boolean;
}) {
  try {
    const to = process.env.LEAD_NOTIF_EMAIL || orgConfig.email;
    if (!to) return;
    const sujet = `🎓 ${infos.dejaConnu ? "Nouvelle demande" : "NOUVEAU PROSPECT"} (site) — à rappeler : ${infos.prenom} ${infos.nom}`;
    const corps = `Un ${infos.dejaConnu ? "prospect connu a refait une demande" : "nouveau prospect s'est inscrit"} depuis le site web.

Nom        : ${infos.prenom} ${infos.nom}
E-mail     : ${infos.email}
Téléphone  : ${infos.telephone ?? "—"}
Formation  : ${infos.formationTitre || "—"}
${infos.session ? `Session    : ${infos.session}\n` : ""}Financement: ${infos.financement || "—"}
Origine    : ${infos.origine} · ${infos.sourceConnaissance}
${infos.objectifs ? `Objectifs  : ${infos.objectifs}\n` : ""}${infos.message ? `Message    : ${infos.message}\n` : ""}
➡️ À rappeler. Fiche dans le CRM : ${appBaseUrl()}/crm`;
    await sendEmail({ to, subject: sujet, body: corps });
  } catch (e) {
    console.error("[api/lead] notif e-mail échouée (non bloquant):", e);
  }
}

// Réception des prospects venant du site vitrine → création dans le CRM.
// Protégé par un secret partagé (en-tête x-lead-secret = env LEAD_API_SECRET).
// Si LEAD_API_SECRET n'est pas défini, l'endpoint accepte (mode ouvert).
export async function POST(req: Request) {
  // Anti-flood : 10 leads / minute / IP (protège la création de prospects + e-mails).
  const rl = await checkLimit(`lead:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const secret = process.env.LEAD_API_SECRET;
  // Correctif audit P2-2 : en PRODUCTION le secret est OBLIGATOIRE (fail-closed).
  // Sans lui, l'endpoint créerait des prospects + e-mails/push pour tout tiers.
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[lead] LEAD_API_SECRET non défini en production → requête refusée.");
    return NextResponse.json({ ok: false, error: "Service indisponible." }, { status: 503 });
  }
  if (secret && req.headers.get("x-lead-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const prenom = String(body.prenom ?? "").trim();
  const nom = String(body.nom ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const telephone = String(body.telephone ?? body.tel ?? "").trim() || null;
  const message = String(body.message ?? "").trim() || null;
  const formationTitre = String(body.formation ?? body.formationTitre ?? "").trim();
  const formOrigine = String(body.source ?? "site").trim();
  const financementRaw = String(body.financement ?? "").trim().toUpperCase();
  const financementType = (Object.values(FinancementType) as string[]).includes(
    financementRaw,
  )
    ? (financementRaw as FinancementType)
    : null;
  const utmSource = String(body.utmSource ?? "").trim();
  const utmCampaign = String(body.utmCampaign ?? "").trim();

  // Tenant du site vitrine : sans lui, le candidat serait créé avec
  // organismeId=null → INVISIBLE dans la liste scopée par tenant (getTenantDb).
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  // ── Expression de besoin (champs optionnels envoyés par le formulaire d'inscription) ──
  // `undefined` = champ non fourni → Prisma ne l'écrase pas (utile en enrichissement).
  const str = (v: unknown) => {
    const s = String(v ?? "").trim();
    return s ? s : undefined;
  };
  const dnRaw = str(body.dateNaissance);
  const dn = dnRaw ? new Date(dnRaw) : null;
  const entreprise = str(body.entreprise);
  const activiteEntreprise = str(body.activiteEntreprise);
  const besoinData = {
    dateNaissance: dn && !Number.isNaN(dn.getTime()) ? dn : undefined,
    lieuNaissance: str(body.lieuNaissance),
    nationalite: str(body.nationalite),
    adresse: str(body.adresse),
    codePostal: str(body.codePostal ?? body.cp),
    ville: str(body.ville),
    situationPro: str(body.situationPro),
    // Raison sociale de l'entreprise (financement OPCO / plan de développement).
    employeur: entreprise,
    objectifsFormation: str(body.objectifs ?? body.objectifsFormation),
    periodeSouhaitee: str(body.periodeSouhaitee ?? body.periode),
    sessionSouhaitee: str(body.session ?? body.sessionSouhaitee),
    besoinsAdaptation: str(body.besoinsAdaptation),
    situationHandicap:
      body.situationHandicap === true || body.situationHandicap === "true"
        ? true
        : undefined,
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "E-mail invalide." }, { status: 422 });
  }

  // Source d'acquisition : la campagne UTM prime, sinon « Site web »
  const sourceConnaissance = utmSource
    ? `${utmSource}${utmCampaign ? ` / ${utmCampaign}` : ""}`
    : "Site web";

  // Rattachement à une formation (best-effort, par titre)
  let formationSouhaiteeId: string | null = null;
  if (formationTitre) {
    const f = await prisma.formation.findFirst({
      where: { titre: { contains: formationTitre, mode: "insensitive" } },
      select: { id: true },
    });
    formationSouhaiteeId = f?.id ?? null;
  }

  const detail = [
    `Demande via le site (${formOrigine}).`,
    formationTitre ? `Formation : ${formationTitre}.` : "",
    entreprise
      ? `Entreprise : ${entreprise}${activiteEntreprise ? ` (${activiteEntreprise})` : ""}.`
      : "",
    message ? `Message : ${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const existing = await prisma.candidat.findFirst({ where: { email, organismeId } });

    if (existing) {
      await prisma.candidatInteraction.create({
        data: {
          organismeId,
          candidatId: existing.id,
          type: "EMAIL",
          sujet: `Nouvelle demande depuis le site (${formOrigine})`,
          contenu: detail,
        },
      });
      // Enrichit la fiche existante avec les infos d'expression de besoin fournies.
      await prisma.candidat.update({
        where: { id: existing.id },
        data: {
          ...besoinData,
          ...(existing.sourceConnaissance ? {} : { sourceConnaissance }),
          ...(existing.formationSouhaiteeId || !formationSouhaiteeId
            ? {}
            : { formationSouhaiteeId }),
          ...(existing.financementType || !financementType ? {} : { financementType }),
        },
      });
      await notifierNouveauProspect({
        prenom, nom, email, telephone,
        formationTitre, financement: financementRaw,
        session: besoinData.sessionSouhaitee, objectifs: besoinData.objectifsFormation,
        origine: formOrigine, sourceConnaissance, message, dejaConnu: true,
      });
      await sendPushToOrgStaff(organismeId, {
        title: "🆕 Nouvelle demande",
        body: `${prenom} ${nom}${formationTitre ? ` — ${formationTitre}` : ""} · à rappeler`,
        data: { type: "prospect", candidatId: existing.id },
      }).catch(() => {});
      return NextResponse.json({ ok: true, candidatId: existing.id, dedup: true });
    }

    const candidat = await prisma.candidat.create({
      data: {
        organismeId,
        nom: nom || "—",
        prenom: prenom || "—",
        email,
        telephone,
        statut: "NOUVEAU",
        crmStage: "NOUVEAU",
        sourceConnaissance,
        formationSouhaiteeId,
        financementType,
        ...besoinData,
        interactionsCandidat: {
          create: {
            organismeId,
            type: "EMAIL",
            sujet: `Lead site (${formOrigine})`,
            contenu: detail,
          },
        },
      },
    });
    await notifierNouveauProspect({
      prenom, nom, email, telephone,
      formationTitre, financement: financementRaw,
      origine: formOrigine, sourceConnaissance, message, dejaConnu: false,
    });
    await sendPushToOrgStaff(organismeId, {
      title: "🆕 Nouveau prospect",
      body: `${prenom} ${nom}${formationTitre ? ` — ${formationTitre}` : ""} · à rappeler`,
      data: { type: "prospect", candidatId: candidat.id },
    }).catch(() => {});
    return NextResponse.json({ ok: true, candidatId: candidat.id });
  } catch (e) {
    console.error("[api/lead]", e);
    return NextResponse.json({ ok: false, error: "Erreur serveur." }, { status: 500 });
  }
}
