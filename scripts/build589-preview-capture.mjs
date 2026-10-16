/**
 * Capture PR preview screenshots. Requires:
 * - PREVIEW_BASE=https://....vercel.app
 * - BYPASS_SECRET or VERCEL_PROTECTION_BYPASS (deployment protection bypass)
 *
 * Usage:
 *   PREVIEW_BASE=... BYPASS_SECRET=... node scripts/build589-preview-capture.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts/build589-enhanced";
const BASE = process.env.PREVIEW_BASE;
const BYPASS = process.env.BYPASS_SECRET ?? process.env.VERCEL_PROTECTION_BYPASS;

if (!BASE) {
  console.error("PREVIEW_BASE required");
  process.exit(1);
}

const extraHeaders = BYPASS ? { "x-vercel-protection-bypass": BYPASS } : {};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-sandbox"],
});

async function shot(page, file) {
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
}

async function validatePage(page) {
  const title = await page.title();
  const text = await page.locator("body").innerText().catch(() => "");
  const building = /deployment is building/i.test(title + text);
  const blocked = /vercel.*login|login.*vercel|authenticate to access/i.test(title + text);
  const hasWorkspace =
    /integration studio|launchpad|integration inspector|partner launchpad/i.test(text);
  return { title, building, blocked, hasWorkspace, snippet: text.slice(0, 200) };
}

async function runRoute(routeKey, routePath, viewportName, viewport, isMobile) {
  const ctx = await browser.newContext({ viewport, isMobile, colorScheme: "dark", extraHTTPHeaders: extraHeaders });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    if (route.request().resourceType() === "media") void route.abort();
    else void route.continue();
  });
  const resp = await page.goto(`${BASE}${routePath}`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2500);
  const validation = await validatePage(page);
  await shot(page, `${routeKey}-${viewportName}-first.png`);
  await page.evaluate(() => window.scrollBy(0, Math.min(520, document.documentElement.scrollHeight - window.innerHeight)));
  await page.waitForTimeout(600);
  await shot(page, `${routeKey}-${viewportName}-workspace.png`);
  await ctx.close();
  return { status: resp?.status(), ...validation };
}

const results = [];
results.push(
  await runRoute("integration-studio", "/developers/integration-studio", "desktop-1440", { width: 1440, height: 900 }, false),
);
results.push(await runRoute("launchpad", "/developers/launchpad", "desktop-1440", { width: 1440, height: 900 }, false));
const iphone = devices["iPhone 12"];
results.push(
  await runRoute("integration-studio", "/developers/integration-studio", "mobile-390", iphone.viewport, true),
);
results.push(await runRoute("launchpad", "/developers/launchpad", "mobile-390", iphone.viewport, true));

await browser.close();
const summary = { base: BASE, bypass: Boolean(BYPASS), results };
await writeFile(path.join(OUT, "capture-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

if (results.some((r) => r.building || r.blocked || !r.hasWorkspace)) {
  process.exitCode = 2;
}
