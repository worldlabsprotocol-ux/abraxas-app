import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = "/opt/cursor/artifacts/build589-enhanced";
const BASE = process.env.ABRAXAS_BASE ?? "http://127.0.0.1:3110";
const ROUTES = [
  { key: "integration-studio", path: "/developers/integration-studio" },
  { key: "launchpad", path: "/developers/launchpad" },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function capture(viewportName, viewport, isMobile) {
  const ctx = await browser.newContext({
    viewport,
    isMobile,
    colorScheme: "dark",
    recordVideo: viewportName === "desktop-1440" ? { dir: OUT, size: { width: 1440, height: 900 } } : undefined,
  });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(1000);
    if (route.key === "integration-studio") {
      const tab = page.getByRole("tab", { name: /Overview/i }).first();
      if (await tab.count()) await tab.click().catch(() => {});
    }
    await page.screenshot({
      path: path.join(OUT, `${route.key}-${viewportName}-first.png`),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(OUT, `${route.key}-${viewportName}-full.png`),
      fullPage: true,
    });
  }
  const video = page.video()?.path();
  await ctx.close();
  return video;
}

await capture("desktop-1440", { width: 1440, height: 900 }, false);
await capture("mobile-390", devices["iPhone 12"].viewport, true);

await browser.close();
console.log("enhanced captured to", OUT);
