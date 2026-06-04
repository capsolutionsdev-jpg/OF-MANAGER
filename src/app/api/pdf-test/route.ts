import { htmlToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Diagnostic : génère un PDF minimal (sans base de données ni token) pour
// vérifier que Chromium fonctionne en environnement serverless (Vercel).
// → /api/pdf-test : renvoie le PDF si OK, sinon l'erreur exacte en clair.
export async function GET() {
  const t0 = Date.now();
  try {
    const html = `<!doctype html><html><head><meta charset="utf-8"></head>
      <body style="font-family:sans-serif;padding:40px">
        <h1>Test PDF — Chromium OK ✅</h1>
        <p>Généré le ${new Date().toLocaleString("fr-FR")}.</p>
        <p>Environnement : ${process.env.VERCEL ? "Vercel (serverless)" : "local"}.</p>
      </body></html>`;
    const pdf = await htmlToPdf(html);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="test.pdf"',
        "X-Gen-Ms": String(Date.now() - t0),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
    return new Response(
      `ERREUR génération PDF (Chromium serverless)\n` +
        `Environnement: ${process.env.VERCEL ? "Vercel" : "local"}\n` +
        `Durée avant échec: ${Date.now() - t0} ms\n\n${msg}`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
