import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Image from "next/image";
import { ShieldCheck, FileSignature, GraduationCap, MonitorSmartphone } from "lucide-react";
import { LoginForm } from "./login-form";
import { LoginBackdrop } from "./login-backdrop";
import { getPublicBranding } from "@/lib/tenant-host";
import { designVars, getDesign } from "@/lib/themes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Connexion — OFManager",
};

const points = [
  {
    icon: GraduationCap,
    title: "Gestion complète",
    desc: "Candidats, sessions, formations et émargements.",
  },
  {
    icon: FileSignature,
    title: "Documents & signatures",
    desc: "Conventions, convocations et attestations en PDF.",
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
  const dataDesign = design && design.key !== "defaut" ? design.key : undefined;
  const brandStyle = {
    ...designVars(brand.design, brand.couleurPrimaire),
    ...(dataDesign ? { fontFamily: design!.fontSans } : {}),
  } as CSSProperties;

  return (
    <main
      className="relative min-h-screen bg-[#080d1a] text-white"
      data-design={dataDesign}
      style={brandStyle}
    >
      <h1 className="sr-only">Connexion à {brand.nom}</h1>

      {/* Fond génératif animé (halos + constellation) + voile de lisibilité */}
      <LoginBackdrop />
      <div className="login-scrim" aria-hidden />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.05fr_.95fr] lg:px-14">
        {/* Marque */}
        <div className="flex flex-col items-center text-center lg:block lg:text-left">
          <span className="login-in login-d1 inline-flex items-center rounded-xl bg-white px-4 py-3 shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)]">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.nom} className="h-12 w-auto" />
            ) : (
              <Image
                src="/ofmanager-logo.png"
                alt={brand.nom}
                width={200}
                height={158}
                priority
                className="h-12 w-auto"
              />
            )}
          </span>

          {/* Bloc marketing : desktop uniquement — sur mobile (app) on va droit au but. */}
          <div className="hidden lg:block">
          <div className="login-in login-d2 mt-7 mb-3.5 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/45">
            <span className="login-pulse" /> Espace de pilotage
          </div>
          <h2 className="login-in login-d2 login-title max-w-[14ch] text-balance text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.03em]">
            Pilotez votre organisme de formation.
          </h2>
          <p className="login-in login-d3 mt-5 max-w-[42ch] text-[15px] leading-relaxed text-white/60">
            Le back-office tout-en-un de {brand.nom} : prospection,
            inscriptions, sessions, e-learning et conformité — au même endroit.
          </p>

          <ul className="mt-9 space-y-3.5">
            {points.map((p, i) => (
              <li
                key={p.title}
                className={cn("login-in flex items-center gap-3.5", `login-d${i + 3}`)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
                  <p.icon className="h-[19px] w-[19px]" style={{ color: "var(--primary)" }} />
                </span>
                <div>
                  <div className="text-[13.5px] font-semibold">{p.title}</div>
                  <div className="text-xs text-white/45">{p.desc}</div>
                </div>
              </li>
            ))}
          </ul>
          </div>
        </div>

        {/* Carte de connexion (verre, contexte sombre pour le formulaire) */}
        <div className="flex justify-center lg:justify-end">
          <div className="login-card login-in login-d3 dark w-full max-w-[390px]">
            {reason === "autre-appareil" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
                <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Vous avez été déconnecté car ce compte vient d&apos;être utilisé sur un autre
                  appareil. Un compte ne peut être actif que sur un seul appareil à la fois.
                </span>
              </div>
            )}

            <h2 className="text-xl font-semibold tracking-tight text-white">Connexion</h2>
            <p className="mt-1 mb-5 text-sm text-white/55">
              Accédez à votre espace avec vos identifiants.
            </p>

            <LoginForm />

            <div className="mt-5 flex items-center gap-2 text-[11px] text-white/40">
              <span className="login-pulse" /> Plateforme opérationnelle · connexion chiffrée
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
