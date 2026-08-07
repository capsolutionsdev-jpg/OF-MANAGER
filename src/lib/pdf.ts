// Conversion HTML → PDF.
// En local : puppeteer (Chrome embarqué). En production (Vercel) :
// puppeteer-core + @sparticuz/chromium (binaire compatible serverless).

async function launchBrowser() {
  const onServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (onServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    // Désactive le mode graphique (WebGL/animations) : inutile pour le PDF,
    // réduit la mémoire et les dépendances système manquantes en serverless.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chromium as any).setGraphicsMode = false;
    const executablePath = await chromium.executablePath();
    return puppeteer.launch({
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });
  }
  const puppeteer = (await import("puppeteer")).default;
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

const PDF_OPTS = {
  format: "A4" as const,
  printBackground: true,
  margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
};

export type PdfOptions = { landscape?: boolean };

// Fail-fast : plafond de durée de la génération PDF, sous le maxDuration (60 s)
// des routes/pages. Un Chromium bloqué (démarrage à froid, page qui pend) rejette
// ainsi AVANT que la plateforme ne tue la fonction — l'appelant peut alors
// dégrader proprement (ex. envoyer le lien sans la pièce jointe) au lieu de planter.
const PDF_TIMEOUT_MS = 45_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout ${label} après ${ms} ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

async function renderPdfs(htmls: string[], opts: PdfOptions): Promise<Uint8Array[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browser: any = await launchBrowser();
  try {
    const pdfOpts = { ...PDF_OPTS, landscape: !!opts.landscape };
    const out: Uint8Array[] = [];
    for (const html of htmls) {
      const page = await browser.newPage();
      // "load" (et non "networkidle0") : nos HTML sont auto-suffisants (CSS + images
      // en data:), aucune ressource externe à attendre → rendu rapide et déterministe.
      await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
      out.push(new Uint8Array(await page.pdf(pdfOpts)));
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}

/** Rend plusieurs documents HTML en PDF dans une seule session de navigateur. */
export async function htmlToPdfMany(
  htmls: string[],
  opts: PdfOptions = {},
): Promise<Uint8Array[]> {
  return withTimeout(renderPdfs(htmls, opts), PDF_TIMEOUT_MS, "génération PDF");
}

/** Rend un seul document HTML en PDF. */
export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Uint8Array> {
  return (await htmlToPdfMany([html], opts))[0];
}
