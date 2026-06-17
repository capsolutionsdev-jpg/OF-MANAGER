import type { Role } from "@prisma/client";
import JSZip from "jszip";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  dockerfile,
  dockerCompose,
  envExample,
  importScript,
  readme,
  type SelfHostMeta,
} from "@/lib/selfhost/templates";

export const dynamic = "force-dynamic";

/**
 * Export du PACKAGE auto-hébergé d'un organisme (archive ZIP prête à déployer) :
 * config.json + Dockerfile + docker-compose.yml + .env.example + README + script
 * d'initialisation. SUPERADMIN uniquement. Les secrets (clés API) sont EXCLUS —
 * le client renseignera les siens sur son instance.
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

  const meta: SelfHostMeta = { nom: o.nom, sousDomaine: o.sousDomaine, appUrl: o.appUrl };

  // Assemble le paquet déployable.
  const zip = new JSZip();
  zip.file("config.json", JSON.stringify(bundle, null, 2));
  zip.file("Dockerfile", dockerfile());
  zip.file("docker-compose.yml", dockerCompose(meta));
  zip.file(".env.example", envExample(meta));
  zip.file("README.md", readme(meta));
  zip.file("prisma/import-config.mjs", importScript());
  const content = await zip.generateAsync({ type: "arraybuffer" });

  const safe = (o.nom || o.id).replace(/[^a-zA-Z0-9_-]/g, "_");
  return new Response(content, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ofmanager-selfhost-${safe}.zip"`,
    },
  });
}
