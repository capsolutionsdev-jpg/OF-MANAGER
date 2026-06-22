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

      {/* Panneau de marque (encre chaude) — visible en grand écran */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex"
        style={{
          background:
            "radial-gradient(120% 150% at 88% -20%, #3a3550 0%, transparent 52%), radial-gradient(90% 120% at 5% 120%, #5a3a1e 0%, transparent 50%), linear-gradient(135deg, #1b1825, #221f19)",
        }}
      >
        {/* halos décoratifs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#2c53c0]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[#de8a43]/20 blur-3xl" />

        <div className="relative z-10">
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
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Pilotez votre organisme de formation, simplement.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Le back-office tout-en-un de {brand.nom} : prospection,
            inscriptions, sessions, e-learning et conformité.
          </p>

          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <p.icon className="h-5 w-5" style={{ color: "var(--primary)" }} />
                </span>
                <div>
                  <div className="text-sm font-semibold">{p.title}</div>
                  <div className="text-xs text-white/60">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {brand.nom} — Tous droits réservés.
        </p>
      </div>

      {/* Formulaire */}
      <div className="flex items-center justify-center bg-muted/40 p-4 sm:p-8">
        <div className="w-full max-w-sm">
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
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Vous avez été déconnecté car ce compte vient d&apos;être utilisé sur un autre
                appareil. Un compte ne peut être actif que sur un seul appareil à la fois.
              </span>
            </div>
          )}

          <Card>
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
