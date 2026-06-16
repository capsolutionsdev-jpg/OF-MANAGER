const puppeteer = require("puppeteer");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  const txt = () => page.evaluate(() => document.body.innerText);
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  for (const route of ["/rapports", "/sms"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle0" });
    await new Promise(r=>setTimeout(r,800));
    console.log("\n===== " + route + " =====");
    console.log((await txt()).slice(0, 900));
  }
  await browser.close();
})();
