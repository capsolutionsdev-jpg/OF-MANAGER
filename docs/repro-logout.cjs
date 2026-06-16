const puppeteer = require("puppeteer");
const BASE = "http://localhost:3100";
const EMAIL = process.env.E2E_EMAIL;
const PASS = process.env.E2E_PASS;
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE.ERR:", m.text().slice(0, 300)); });
  page.on("response", (r) => {
    const s = r.status();
    if (s >= 400) console.log("HTTP", s, r.request().method(), r.url().replace(BASE, ""));
  });

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("#email", EMAIL); await page.type("#password", PASS);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(()=>{}), page.click('button[type="submit"]')]);
  console.log("after login:", page.url());

  // Ouvrir le menu avatar
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /Administrateur|Utilisateur|@/.test(x.textContent || "") || x.querySelector('[class*="AvatarFallback"]'));
    // fallback: dernier bouton de la barre
  });
  // Clique le bouton avatar (celui contenant les initiales / le nom)
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("header button, header [role=button]")];
    const av = btns.find((b) => /[A-Z]{2}/.test((b.textContent || "").trim()) || b.getAttribute("aria-haspopup"));
    if (av) { av.click(); return true; }
    return false;
  });
  console.log("avatar clicked:", clicked);
  await new Promise(r=>setTimeout(r,300));
  // Clique le bouton « Déconnexion » visible (ou « Se déconnecter »)
  const found = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      /Déconnexion|déconnecter/i.test(x.textContent || "") ||
      /déconnecter/i.test(x.getAttribute("title") || ""),
    );
    if (b) { b.click(); return (b.textContent || b.getAttribute("title") || "").trim().slice(0,40); }
    return false;
  });
  console.log("logout clicked:", found);
  await new Promise(r=>setTimeout(r,3500));
  console.log("after logout url:", page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log("BODY:", JSON.stringify(body));
  await browser.close();
})();
