const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
const outDir = path.join(__dirname, "presentation-shots");
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  const hide = () => page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  const shots = [["/rapports","18-rapports"],["/scoring","19-scoring"],["/leads-multicanal","20-leads"],["/ia","21-assistant-ia"]];
  for (const [route, name] of shots) {
    await page.goto(BASE + route, { waitUntil: "networkidle0" });
    await hide(); await new Promise(r=>setTimeout(r,700));
    await page.screenshot({ path: path.join(outDir, name + ".png"), fullPage: true });
    console.log("shot", route);
  }
  await browser.close();
})();
