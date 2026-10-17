import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = "/opt/cursor/artifacts/build589-baseline";
const BASE = process.env.ABRAXAS_BASE ?? "https://abraxasworld.xyz";
const ROUTES = [
  { key: "integration-studio", path: "/developers/integration-studio" },
  { key: "launchpad", path: "/developers/launchpad" },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(viewportName, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, colorScheme: "dark" });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(1200);
    const first = path.join(OUT, `${route.key}-${viewportName}-first.png`);
    await page.screenshot({ path: first, fullPage: false });
    const full = path.join(OUT, `${route.key}-${viewportName}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
  }
  await ctx.close();
}

await capture("desktop-1440", { width: 1440, height: 900 }, false);
const iphone = devices["iPhone 12"];
await capture("mobile-390", iphone.viewport, true);

await browser.close();
console.log("baseline captured to", OUT);
