const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  let crash = null;
  page.on("pageerror", (e) => { if (/MenuGroupContext|Menu group/.test(String(e))) crash = String(e).slice(0,120); });
  page.on("console", (m) => { if (m.type()==="error" && /MenuGroupContext|Menu group/.test(m.text())) crash = m.text().slice(0,120); });

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  console.log("login ->", page.url());

  // Ouvrir le menu avatar
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("header button")].find((b) => /[A-Z]{2}/.test((b.textContent||"").trim()));
    t && t.click();
  });
  await new Promise(r=>setTimeout(r,700));
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});
  await page.screenshot({ path: path.join(outDir, "33-avatar-menu.png") });
  console.log("menu ouvert — crash MenuGroupContext:", crash || "AUCUN");

  // Cliquer le lien de déconnexion
  const ok = await page.evaluate(() => {
    const a = document.querySelector('a[href="/deconnexion"]');
    if (a) { a.click(); return true; } return false;
  });
  console.log("lien déconnexion cliqué:", ok);
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{});
  await new Promise(r=>setTimeout(r,1500));
  console.log("après déconnexion ->", page.url());
  await browser.close();
})();
