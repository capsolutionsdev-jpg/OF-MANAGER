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

// ── Anti-SSRF (OFM-20) : filtre d'egress du rendu Chromium ───────────────────
// Le HTML rendu embarque des <img src> pilotés par la config tenant (org.logoUrl,
// cachetUrl, signatureUrl) + les polices Google des titres. On AUTORISE data:/blob:/
// about: et http(s) vers des hôtes PUBLICS ; on BLOQUE loopback / IP privées /
// link-local / metadata cloud (169.254.169.254) et les schémas non-web (file:, ftp:…).
// NB : filtre par HÔTE (pas de résolution DNS) — couvre les URLs à IP directe (le
// vecteur réaliste ici) ; un rebinding DNS reste hors de portée de ce contrôle.

/** true si l'hôte est une cible interne (loopback / RFC1918 / link-local / metadata). */
export function isPrivateHost(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) {
    return true;
  }
  const m4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m4) {
    const a = Number(m4[1]), b = Number(m4[2]);
    if (a === 0 || a === 127 || a === 10) return true;          // 0/8, loopback 127/8, 10/8
    if (a === 172 && b >= 16 && b <= 31) return true;           // 172.16/12
    if (a === 192 && b === 168) return true;                    // 192.168/16
    if (a === 169 && b === 254) return true;                    // link-local + metadata 169.254/16
    if (a === 100 && b >= 64 && b <= 127) return true;          // CGNAT 100.64/10
    return false;
  }
  // IPv6 (contient « : ») : loopback/unspecified + link-local fe80::/10 + ULA fc00::/7
  // + IPv4-mapped. Un vrai nom d'hôte (ex. « fcbarcelona.com ») n'a pas de « : ».
  if (h.includes(":")) {
    if (h === "::1" || h === "::") return true;
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
    if (h.startsWith("::ffff:")) return isPrivateHost(h.slice(7));
    return false;
  }
  return false; // nom d'hôte public
}

/** true si le rendu Chromium a le droit d'émettre cette requête. */
export function isEgressAllowed(url: string): boolean {
  if (/^(data|blob|about):/i.test(url)) return true; // ressources inline (nos HTML sont surtout en data:)
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false; // bloque file:/ftp:/gopher:…
  return !isPrivateHost(u.hostname);
}

async function renderPdfs(htmls: string[], opts: PdfOptions): Promise<Uint8Array[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browser: any = await launchBrowser();
  try {
    const pdfOpts = { ...PDF_OPTS, landscape: !!opts.landscape };
    const out: Uint8Array[] = [];
    for (const html of htmls) {
      const page = await browser.newPage();
      // Anti-SSRF (OFM-20) : chaque requête sortante du rendu est filtrée (isEgressAllowed).
      // Avec l'interception active, TOUTE requête doit être résolue (continue/abort) sinon
      // la page pend jusqu'au timeout → le handler tranche systématiquement.
      await page.setRequestInterception(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      page.on("request", (r: any) => {
        if (isEgressAllowed(r.url())) r.continue().catch(() => {});
        else r.abort("blockedbyclient").catch(() => {});
      });
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
