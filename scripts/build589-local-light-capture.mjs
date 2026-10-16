/**
 * Lightweight local captures (one browser launch, domcontentloaded, asset blocking).
 * Use when preview is building or to validate branch UI without OOM.
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const OUT = process.env.OUT_DIR ?? "/opt/cursor/artifacts/build589-enhanced";
const BASE = process.env.ABRAXAS_BASE ?? "http://127.0.0.1:3122";

await mkdir(OUT, { recursive: true });

async function captureSet(viewportName, viewport, isMobile, recordVideo) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--single-process"],
  });
  const ctx = await browser.newContext({
    viewport,
    isMobile,
    colorScheme: "dark",
    recordVideo: recordVideo ? { dir: OUT, size: viewport } : undefined,
  });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    const t = route.request().resourceType();
    if (t === "media" || t === "font" || t === "image") void route.abort();
    else void route.continue();
  });

  const routes = [
    { key: "integration-studio", path: "/developers/integration-studio" },
    { key: "launchpad", path: "/developers/launchpad" },
  ];

  const log = [];
  for (const route of routes) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(2000);
    if (route.key === "integration-studio") {
      const responseTab = page.getByRole("tab", { name: /^Response$/i });
      if (await responseTab.count()) await responseTab.first().click();
      await page.waitForTimeout(400);
    }
    const body = await page.locator("body").innerText();
    log.push({ route: route.key, hasShell: /institutional|launchpad|integration studio/i.test(body) });
    await page.screenshot({
      path: path.join(OUT, `${route.key}-${viewportName}-first.png`),
      fullPage: false,
    });
    await page.evaluate(() => window.scrollBy(0, 480));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, `${route.key}-${viewportName}-workspace.png`),
      fullPage: false,
    });
  }

  const videoPath = page.video() ? await page.video().path() : null;
  await ctx.close();
  await browser.close();
  return { viewportName, log, videoPath };
}

const summary = [];
summary.push(await captureSet("desktop-1440", { width: 1440, height: 900 }, false, true));
summary.push(await captureSet("mobile-390", devices["iPhone 12"].viewport, true, false));

await writeFile(
  path.join(OUT, "local-capture-summary.json"),
  JSON.stringify({ base: BASE, summary }, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
