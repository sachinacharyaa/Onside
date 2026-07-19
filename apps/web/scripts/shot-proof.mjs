import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";

mkdirSync("apps/web/.data", { recursive: true });
const proof = JSON.parse(readFileSync("apps/web/.data/last-settlement.json", "utf8"));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } });

await page.addInitScript((payload) => {
  sessionStorage.setItem("onside:last-settlement", JSON.stringify(payload));
}, proof);

await page.goto("http://localhost:5173/proof", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);

const out = "apps/web/.data/proof-fra-eng-screenshot.png";
await page.screenshot({ path: out, fullPage: true });

const text = await page.locator("body").innerText();
const links = await page.locator('a[href*="explorer.solana.com/tx"]').evaluateAll((els) =>
  els.map((a) => ({
    href: a.getAttribute("href"),
    label: (a.textContent || "").trim().replace(/\s+/g, " "),
  })),
);

console.log(
  JSON.stringify(
    {
      out,
      hasValidateStatCta: links.some((l) => /validateStat/i.test(l.label)),
      hasSettlementCta: links.some((l) => /settlement/i.test(l.label)),
      hasFraEng: /France vs England|18257865|txline-18257865/i.test(text),
      txLinks: links,
      snippet: text.slice(0, 800),
    },
    null,
    2,
  ),
);

await browser.close();
