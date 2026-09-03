import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";

const base = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = process.env.SCREENSHOT_DIR ?? "/opt/cursor/artifacts/screenshots/sitewide-unification";

const ROUTES = [
  { slug: "home", path: "/" },
  { slug: "passport", path: "/passport" },
  { slug: "for-businesses", path: "/integrate" },
  { slug: "developer-receipt-tester", path: "/verify" },
  { slug: "partner-flow-docs", path: "/docs/partner-flow" },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

async function dismissBoot(page) {
  const enter = page.getByRole("button", { name: /enter abraxas/i });
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(1200);
  }
}

async function captureRoute(route, label, viewport, device) {
  const context = device
    ? await browser.newContext({ ...devices[device] })
    : await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${base}${route.path}`, { waitUntil: "networkidle", timeout: 120000 });
  if (route.path === "/") await dismissBoot(page);
  else await page.waitForTimeout(1500);
  await page.screenshot({
    path: `${outDir}/${route.slug}-${label}.png`,
    fullPage: true,
  });
  await context.close();
}

for (const route of ROUTES) {
  await captureRoute(route, "desktop-1440", { width: 1440, height: 900 });
  await captureRoute(route, "mobile-390", null, "iPhone 13");
}

await browser.close();
console.log(`Screenshots saved to ${outDir}`);
