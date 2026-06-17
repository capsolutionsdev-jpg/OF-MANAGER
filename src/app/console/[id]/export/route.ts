import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Export de la configuration d'un organisme (pour déploiement auto-hébergé chez
 * le client). SUPERADMIN uniquement. Les secrets (clés API) sont EXCLUS — le
 * client renseignera les siens sur son instance.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if ((session?.user?.role as Role) !== "SUPERADMIN") {
    return new Response("Accès refusé.", { status: 403 });
  }
  const { id } = await params;
  const o = await prisma.organisme.findUnique({ where: { id } });
  if (!o) return new Response("Organisme introuvable.", { status: 404 });

  const bundle = {
    _meta: {
      genere_le: new Date().toISOString(),
      produit: "OFManager",
      note: "Configuration d'organisme pour déploiement auto-hébergé. Les clés API/secrets ne sont PAS inclus : à renseigner sur l'instance cible.",
    },
    identite: {
      nom: o.nom, raisonSociale: o.raisonSociale, representant: o.representant,
      representantQualite: o.representantQualite, siret: o.siret, nda: o.nda,
      numeroTva: o.numeroTva, adresse: o.adresse, codePostal: o.codePostal,
      ville: o.ville, telephone: o.telephone, email: o.email, siteWeb: o.siteWeb,
      certificateur: o.certificateur, qualiopiNumero: o.qualiopiNumero, assujettiTva: o.assujettiTva,
    },
    design: {
      design: o.design, couleurPrimaire: o.couleurPrimaire, couleurSecondaire: o.couleurSecondaire,
      theme: o.theme, logoUrl: o.logoUrl, faviconUrl: o.faviconUrl,
      cachetUrl: o.cachetUrl, signatureUrl: o.signatureUrl,
    },
    abonnement: { formule: o.formule, fonctionnalites: o.fonctionnalites, maxUtilisateurs: o.maxUtilisateurs, maxSmsMois: o.maxSmsMois },
    communication: { sousDomaine: o.sousDomaine, emailExpediteurNom: o.emailExpediteurNom, emailExpediteur: o.emailExpediteur },
    documentsConfig: o.documentsConfig,
    automationsConfig: o.automationsConfig,
  };

  const safe = (o.nom || o.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ofmanager-config-${safe}.json"`,
    },
  });
}
