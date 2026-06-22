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

/** Rend plusieurs documents HTML en PDF dans une seule session de navigateur. */
export async function htmlToPdfMany(
  htmls: string[],
  opts: PdfOptions = {},
): Promise<Uint8Array[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browser: any = await launchBrowser();
  try {
    const pdfOpts = { ...PDF_OPTS, landscape: !!opts.landscape };
    const out: Uint8Array[] = [];
    for (const html of htmls) {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      out.push(new Uint8Array(await page.pdf(pdfOpts)));
      await page.close();
    }
    return out;
  } finally {
    await browser.close();
  }
}

/** Rend un seul document HTML en PDF. */
export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Uint8Array> {
  return (await htmlToPdfMany([html], opts))[0];
}
