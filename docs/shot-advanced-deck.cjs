const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  const warnings = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/nativeButton|acts as a button/.test(t)) warnings.push(t.slice(0, 60));
  });
  const hide = () => page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);

  const shots = [
    ["/kanban", "22-kanban"],
    ["/taches", "23-taches"],
    ["/sms", "24-sms"],
    ["/portail-client", "25-portail-client"],
  ];
  for (const [route, name] of shots) {
    await page.goto(BASE + route, { waitUntil: "networkidle0" });
    await hide(); await new Promise(r=>setTimeout(r,700));
    await page.screenshot({ path: path.join(outDir, name + ".png"), fullPage: true });
    console.log("shot", route);
  }

  // Devis detail (panneau signature)
  await page.goto(BASE + "/devis", { waitUntil: "networkidle0" });
  const href = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/devis/"]')].find((x) => /\/devis\/[a-z0-9]{10,}$/.test(x.getAttribute("href") || ""));
    return a ? a.getAttribute("href") : null;
  });
  if (href) {
    await page.goto(BASE + href, { waitUntil: "networkidle0" });
    await hide(); await new Promise(r=>setTimeout(r,700));
    await page.screenshot({ path: path.join(outDir, "26-devis-signature.png"), fullPage: true });
    console.log("shot devis", href);
  }

  // Vérif warnings Button sur les pages visitées (dont portail-client qui en générait avant)
  console.log("WARNINGS Button:", warnings.length ? warnings : "AUCUN");
  await browser.close();
})();
