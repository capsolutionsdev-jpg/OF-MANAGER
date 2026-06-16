const puppeteer = require("puppeteer");
const path = require("node:path");
const BASE = "http://localhost:3100";
const outDir = path.join(__dirname, "presentation-shots");
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 820 } });
  const page = await browser.newPage();
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dev-tools-button]{display:none !important}" }).catch(()=>{});
  await new Promise(r=>setTimeout(r,600));
  await page.screenshot({ path: path.join(outDir, "35-login-ofmanager.png") });
  console.log("login shot OK");
  await browser.close();
})();
