import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ShieldCheck, FileSignature, GraduationCap, MonitorSmartphone } from "lucide-react";
import { LoginForm } from "./login-form";
import { getPublicBranding } from "@/lib/tenant-host";
import { designVars, getDesign } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Connexion — CAP Compétence Manager",
};

const points = [
  {
    icon: GraduationCap,
    title: "Gestion complète",
    desc: "Candidats, sessions, formations et émargements au même endroit.",
  },
  {
    icon: FileSignature,
    title: "Documents & signatures",
    desc: "Conventions, convocations et attestations signées en PDF.",
  },
  {
    icon: ShieldCheck,
    title: "Conforme Qualiopi",
    desc: "Suivi des indicateurs et traçabilité de bout en bout.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const brand = await getPublicBranding();
  const design = getDesign(brand.design);
  const isDark = design?.mode === "dark";
  const dataDesign = design && design.key !== "defaut" ? design.key : undefined;
  const brandStyle = {
    ...designVars(brand.design, brand.couleurPrimaire),
    ...(dataDesign ? { fontFamily: design!.fontSans } : {}),
  } as CSSProperties;
  return (
    <main
      className={cn("grid min-h-screen lg:grid-cols-2", isDark && "dark")}
      data-design={dataDesign}
      style={brandStyle}
    >
      {/* Titre de page pour lecteurs d'écran (structure / a11y) */}
      <h1 className="sr-only">Connexion à {brand.nom}</h1>

      {/* Panneau de marque — « cockpit » navy, aurora animée (accent tenant + ambre) */}
      <div
        className="login-hero relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={{ background: "linear-gradient(160deg, #0c1424 0%, #0a0f1c 55%, #0c1424 100%)" }}
      >
        {/* Aurora dérivante + grille « instrument » (décoratif) */}
        <div className="login-aurora" aria-hidden>
          <span className="login-blob-1" />
          <span className="login-blob-2" />
          <span className="login-blob-3" />
        </div>
        <div className="login-grid" aria-hidden />

        <div className="login-in login-d1 relative z-10">
          <span className="inline-flex items-center rounded-xl bg-white px-4 py-3 shadow-sm">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.nom} className="h-14 w-auto" />
            ) : (
              <Image
                src="/ofmanager-logo.png"
                alt={brand.nom}
                width={200}
                height={158}
                priority
                className="h-14 w-auto"
              />
            )}
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <span className="login-in login-d2 mb-3 inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-white/50">
            Espace de pilotage
          </span>
          <h2 className="login-in login-d2 text-4xl font-bold leading-[1.08] tracking-tight text-balance">
            Pilotez votre organisme de formation, simplement.
          </h2>
          <p className="login-in login-d3 mt-4 text-sm leading-relaxed text-white/65">
            Le back-office tout-en-un de {brand.nom} : prospection,
            inscriptions, sessions, e-learning et conformité.
          </p>

          <ul className="mt-9 space-y-4">
            {points.map((p, i) => (
              <li
                key={p.title}
                className={cn("login-in flex items-start gap-3.5", `login-d${i + 3}`)}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-inset ring-white/10">
                  <p.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                </span>
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-white/55">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="login-in login-d6 relative z-10 text-xs text-white/35">
          © {new Date().getFullYear()} {brand.nom} — Tous droits réservés.
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-muted/40 p-4 sm:p-8">
        <div className="login-in w-full max-w-sm">
          {/* Logo (mobile uniquement) */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <div className="relative mb-2 flex h-20 w-56 items-center justify-center">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brand.logoUrl} alt={brand.nom} className="max-h-20 max-w-full object-contain" />
              ) : (
                <Image
                  src="/ofmanager-logo.png"
                  alt={brand.nom}
                  fill
                  sizes="224px"
                  className="object-contain"
                  priority
                />
              )}
            </div>
            {brand.logoUrl && <span className="text-lg font-bold">{brand.nom}</span>}
          </div>

          {reason === "autre-appareil" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Vous avez été déconnecté car ce compte vient d&apos;être utilisé sur un autre
                appareil. Un compte ne peut être actif que sur un seul appareil à la fois.
              </span>
            </div>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Connexion</CardTitle>
              <CardDescription>
                Accédez à votre espace avec vos identifiants.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
