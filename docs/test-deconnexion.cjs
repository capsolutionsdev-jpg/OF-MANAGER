const puppeteer = require("puppeteer");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().replace(BASE, "")); });
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  console.log("login ->", page.url());
  await page.goto(BASE + "/deconnexion", { waitUntil: "networkidle0" });
  console.log("after /deconnexion ->", page.url());
  // Session purgée ? /dashboard doit rebondir vers /login
  await page.goto(BASE + "/dashboard", { waitUntil: "networkidle0" });
  console.log("dashboard after logout ->", page.url());
  await browser.close();
})();
