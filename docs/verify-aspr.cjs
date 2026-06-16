const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;   // compte SUPERADMIN éditeur
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 950 } });
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  page.on("response", (r) => { if (r.status() >= 400) errs.push("HTTP " + r.status() + " " + r.url().replace(BASE, "")); });

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  console.log("login ->", page.url());

  // Catalogue : liste des organismes
  await page.goto(BASE + "/console/organismes", { waitUntil: "networkidle0" }).catch(()=>{});
  let txt = await page.evaluate(() => document.body.innerText);
  console.log("ASPR dans le catalogue:", /ASPR Manager/i.test(txt));

  // Ouvrir la fiche ASPR
  const href = await page.evaluate(() => {
    const a = [...document.querySelectorAll('a[href^="/console/"]')].find((x) => /ASPR/i.test(x.textContent || ""));
    return a ? a.getAttribute("href") : null;
  });
  if (href) {
    await page.goto(BASE + href, { waitUntil: "networkidle0" });
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});
    await new Promise(r=>setTimeout(r,700));
    txt = await page.evaluate(() => document.body.innerText);
    console.log("fiche ASPR — version:", /Autonome|mono-locataire/i.test(txt), "| lien app:", /Ouvrir l'app|Ouvrir l’app/.test(txt));
    await page.screenshot({ path: path.join(outDir, "36-aspr-fiche.png"), fullPage: true });
    console.log("capture fiche ASPR OK ->", href);
  } else {
    console.log("lien fiche ASPR introuvable");
  }
  console.log("erreurs:", errs.length ? errs.slice(0,5) : "aucune");
  await browser.close();
})();
