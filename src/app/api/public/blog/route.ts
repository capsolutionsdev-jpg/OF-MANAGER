import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// API publique : articles de blog PUBLIÉS pour le SITE VITRINE.
// Lecture seule, sans données personnelles, CORS ouvert.
//
// Le vitrine joint ces entrées par `slug` (surcouche sur ses articles
// statiques) : un slug console PUBLIEE prime ; sinon le statique est conservé.
// API injoignable → le vitrine garde entièrement ses articles statiques.
//
// Portée scopable à un organisme via l'env VITRINE_ORGANISME_ID.

type Bloc =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] };

/**
 * Convertit un corps en markdown léger vers les blocs attendus par le vitrine :
 *   « ## …» → sous-titre, « - …» → puce (groupées), sinon paragraphe.
 * Les lignes vides séparent les blocs.
 */
function toBlocs(contenu: string | null): Bloc[] {
  if (!contenu) return [];
  const lignes = contenu.replace(/\r\n/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  let para: string[] = [];
  let liste: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocs.push({ type: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushListe = () => {
    if (liste.length) {
      blocs.push({ type: "list", items: liste });
      liste = [];
    }
  };

  for (const raw of lignes) {
    const ligne = raw.trim();
    if (ligne === "") {
      flushListe();
      flushPara();
      continue;
    }
    if (ligne.startsWith("## ")) {
      flushListe();
      flushPara();
      blocs.push({ type: "h2", text: ligne.slice(3).trim() });
      continue;
    }
    if (ligne.startsWith("- ") || ligne.startsWith("* ")) {
      flushPara();
      liste.push(ligne.slice(2).trim());
      continue;
    }
    flushListe();
    para.push(ligne);
  }
  flushListe();
  flushPara();
  return blocs;
}

export async function GET() {
  const organismeId = process.env.VITRINE_ORGANISME_ID || undefined;

  const articles = await prisma.article.findMany({
    where: {
      isArchived: false,
      statut: "PUBLIEE",
      ...(organismeId ? { organismeId } : {}),
    },
    orderBy: { datePublication: "desc" },
    take: 100,
  });

  const data = articles.map((a) => ({
    slug: a.slug,
    title: a.titre,
    excerpt: a.extrait ?? "",
    date: a.datePublication.toISOString().slice(0, 10),
    author: a.auteur ?? "",
    category: a.categorie ?? "",
    image: a.imageUrl ?? "",
    imageAlt: a.imageAlt ?? "",
    content: toBlocs(a.contenu),
  }));

  return NextResponse.json(
    { articles: data, generatedAt: new Date().toISOString() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
