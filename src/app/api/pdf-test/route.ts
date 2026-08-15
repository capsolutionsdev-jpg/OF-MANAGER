import { htmlToPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Diagnostic : génère un PDF minimal (sans base de données ni token) pour
// vérifier que Chromium fonctionne en environnement serverless (Vercel).
// → /api/pdf-test : renvoie le PDF si OK, sinon l'erreur exacte en clair.
export async function GET(req: Request) {
  // Correctif audit P2-3 : en PRODUCTION, endpoint de diagnostic protégé par un
  // secret (Bearer CRON_SECRET) — évite le DoS Chromium par un tiers. 404 si non
  // autorisé (on ne révèle pas l'existence de l'endpoint).
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!secret || provided !== secret) {
      return new Response("Not found", { status: 404 });
    }
  }
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
    // Correctif audit P2-3 : ne jamais divulguer la stack au client en production.
    const detail = isProd
      ? "(détail masqué — voir les logs serveur)"
      : e instanceof Error ? `${e.message}\n\n${e.stack ?? ""}` : String(e);
    if (isProd) console.error("[pdf-test] échec génération PDF:", e);
    return new Response(
      `ERREUR génération PDF (Chromium serverless)\n` +
        `Environnement: ${process.env.VERCEL ? "Vercel" : "local"}\n` +
        `Durée avant échec: ${Date.now() - t0} ms\n\n${detail}`,
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
