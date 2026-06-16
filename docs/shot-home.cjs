const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 900 } });
  const page = await browser.newPage();
  page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().replace(BASE, "")); });

  // 1) Visiteur non connecté → landing
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  console.log("/ (visiteur) ->", page.url());
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 160));
  console.log("contient OFManager/landing:", /organismes de formation|Se connecter/i.test(txt));
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});
  await page.screenshot({ path: path.join(outDir, "34-accueil-ofmanager.png"), fullPage: true });
  console.log("capture accueil OK");

  // 2) Connecté → redirigé vers l'espace
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  console.log("/ (connecté) ->", page.url());
  await browser.close();
})();
