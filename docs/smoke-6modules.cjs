const puppeteer = require("puppeteer");

const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const log = (...a) => console.log(...a);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const txt = () => page.evaluate(() => document.body.innerText);
  const clickByText = (re) =>
    page.evaluate((src) => {
      const rx = new RegExp(src);
      const b = [...document.querySelectorAll("button")].find((x) => rx.test(x.textContent || ""));
      if (b) { b.click(); return true; } return false;
    }, re.source ?? re);

  try {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.type("#email", EMAIL);
    await page.type("#password", PASS);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    log("LOGIN ->", page.url());

    // 1) RAPPORTS
    await page.goto(BASE + "/rapports", { waitUntil: "networkidle0" });
    let t = await txt();
    log("RAPPORTS:", t.includes("Rapports analytiques") && t.includes("Taux de conversion"));

    // 2) SCORING
    await page.goto(BASE + "/scoring", { waitUntil: "networkidle0" });
    t = await txt();
    log("SCORING:", t.includes("Scoring & segmentation") && /Chaud|Tiède|Froid/.test(t));

    // 3) LEADS MULTI-CANAL — créer un lead
    await page.goto(BASE + "/leads-multicanal", { waitUntil: "networkidle0" });
    log("LEADS page:", (await txt()).includes("Capture de leads multi-canal"));
    await clickByText("Saisir un lead");
    await new Promise((r) => setTimeout(r, 400));
    const leadName = "SMOKE6 Lead " + Date.now();
    await page.type("#nom", leadName);
    await page.type("#email", `smoke6_${Date.now()}@test.local`);
    await clickByText("Enregistrer le lead");
    await new Promise((r) => setTimeout(r, 1500));
    await page.reload({ waitUntil: "networkidle0" });
    log("LEAD créé visible:", (await txt()).includes(leadName));

    // 4) PORTAIL CLIENT — activer + ouvrir le lien public
    await page.goto(BASE + "/portail-client", { waitUntil: "networkidle0" });
    log("PORTAIL page:", (await txt()).includes("Espace client entreprise"));
    const hadActivate = await clickByText("Activer l'espace");
    if (hadActivate) {
      await new Promise((r) => setTimeout(r, 1600));
      await page.reload({ waitUntil: "networkidle0" });
    }
    const portalUrl = await page.evaluate(() => {
      const inp = [...document.querySelectorAll("input[readonly]")].find((x) => /\/portail\//.test(x.value || ""));
      return inp ? inp.value : null;
    });
    log("PORTAIL lien:", portalUrl ? "généré" : "ABSENT (aucune entreprise ?)");
    if (portalUrl) {
      const path = portalUrl.replace(/^https?:\/\/[^/]+/, "");
      await page.goto(BASE + path, { waitUntil: "networkidle0" });
      const pt = await txt();
      log("PORTAIL public:", pt.includes("Espace client") && pt.includes("lecture seule"));
    }

    // 5) SMS — envoi en mode démo
    await page.goto(BASE + "/sms", { waitUntil: "networkidle0" });
    log("SMS page:", (await txt()).includes("SMS & séquences"));
    await page.type("#to", "+33612345678");
    await page.type("#body", "SMOKE6 message de test relance");
    await clickByText("Envoyer le SMS");
    await new Promise((r) => setTimeout(r, 1800));
    await page.reload({ waitUntil: "networkidle0" });
    const smsTxt = await txt();
    log("SMS journalisé:", smsTxt.includes("SMOKE6 message") && /DEMO|ENVOYE/.test(smsTxt));

    // 6) ASSISTANT IA — page + bannière démo (sans clé)
    await page.goto(BASE + "/ia", { waitUntil: "networkidle0" });
    const iaTxt = await txt();
    log("IA page:", iaTxt.includes("Assistant IA"));
    log("IA bannière démo:", /Mode démo|ANTHROPIC_API_KEY/.test(iaTxt));

    log("ERREURS console:", errors.length ? errors.slice(0, 6) : "aucune");
  } catch (e) {
    log("FATAL", e.message);
  } finally {
    await browser.close();
  }
})();
