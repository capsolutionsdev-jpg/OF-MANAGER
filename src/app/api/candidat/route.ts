import { NextResponse } from "next/server";

/**
 * Stub POST endpoint pour la soumission du formulaire candidat.
 * Ne persiste rien en base — sert uniquement à ne pas casser
 * `submitForm()` côté client durant le développement.
 */
export async function POST(_request: Request) {
  return NextResponse.json(
    {
      ok: true,
      message: "Candidat créé (stub)",
      id: "stub-id",
    },
    { status: 201 }
  );
}
