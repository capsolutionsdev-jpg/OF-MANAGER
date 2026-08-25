// src/app/comparatif/[versus]/page.tsx
// Route dynamique statique des pages « OFManager vs X ». Server Component.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { COMPETITORS, COMPARATIF_BASE, getCompetitorByVs } from "@/lib/comparatif/data";
import { VsPage } from "@/components/comparatif/vs-page";

export const dynamicParams = false; // seules les paires connues → 404 sinon

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ versus: c.vsSlug }));
}

export async function generateMetadata({ params }: { params: Promise<{ versus: string }> }): Promise<Metadata> {
  const { versus } = await params;
  const c = getCompetitorByVs(versus);
  if (!c) return {};
  const title = `OFManager vs ${c.name} : comparatif (2026)`;
  const description = `Comparatif OFManager vs ${c.name} pour organismes de formation : spécialisation métier, fonctionnalités et tarifs. Quel logiciel choisir en 2026 ?`;
  return {
    title,
    description,
    alternates: { canonical: `${COMPARATIF_BASE}/${c.vsSlug}` },
    openGraph: { title, description, url: `${COMPARATIF_BASE}/${c.vsSlug}`, type: "article" },
  };
}

export default async function Page({ params }: { params: Promise<{ versus: string }> }) {
  const { versus } = await params;
  const c = getCompetitorByVs(versus);
  if (!c) notFound();
  return <VsPage competitor={c} />;
}
