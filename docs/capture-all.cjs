const puppeteer = require("puppeteer");
const fs = require("node:fs");
const path = require("node:path");

const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");
fs.mkdirSync(outDir, { recursive: true });

const PAGES = [
  ["/dashboard", "01-tableau-de-bord"],
  ["/crm", "02-crm-prospects"],
  ["/crm/pipeline", "03-crm-pipeline"],
  ["/candidats", "04-candidats"],
  ["/clients-pro", "05-clients-pro"],
  ["/formations", "06-formations"],
  ["/sessions", "07-sessions"],
  ["/elearning", "08-elearning"],
  ["/signatures", "09-signatures"],
  ["/automatisations", "10-automatisations"],
  ["/formateurs", "11-formateurs"],
  ["/comptabilite", "12-suivi-comptable"],
  ["/bpf", "13-bpf"],
  ["/qualiopi", "14-qualiopi"],
  ["/rgpd", "15-rgpd"],
  ["/administration", "16-administration"],
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  // Masque l'indicateur/overlay de dev Next.js pour des captures propres.
  const hideDevOverlay = () =>
    page
      .addStyleTag({
        content:
          "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button],#__next-build-watcher,#__next-prerender-indicator{display:none !important;visibility:hidden !important}",
      })
      .catch(() => {});
  const shot = async (n, full = false) => {
    await hideDevOverlay();
    await page.screenshot({ path: path.join(outDir, n + ".png"), fullPage: full });
  };

  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await shot("00-connexion");
    await page.type("#email", EMAIL);
    await page.type("#password", PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    for (const [route, name] of PAGES) {
      try {
        await page.goto(BASE + route, { waitUntil: "networkidle0", timeout: 45000 });
        await new Promise((r) => setTimeout(r, 1200));
        await shot(name);
        // version pleine page pour le tableau de bord (riche)
        if (route === "/dashboard") await shot(name + "-full", true);
        console.log("OK", route);
      } catch (e) {
        console.log("ERR", route, e.message);
      }
    }

    // Fiche candidat détaillée (1re fiche de la liste)
    try {
      await page.goto(BASE + "/candidats", { waitUntil: "networkidle0" });
      const href = await page.evaluate(() => {
        const a = [...document.querySelectorAll('a[href^="/candidats/"]')].find(
          (x) => /\/candidats\/[a-z0-9]{10,}$/.test(x.getAttribute("href") || ""),
        );
        return a ? a.getAttribute("href") : null;
      });
      if (href) {
        await page.goto(BASE + href, { waitUntil: "networkidle0" });
        await new Promise((r) => setTimeout(r, 1200));
        await shot("04b-fiche-candidat", true);
        console.log("OK fiche candidat", href);
      }
    } catch (e) {
      console.log("ERR fiche candidat", e.message);
    }
  } finally {
    await browser.close();
  }
})();
