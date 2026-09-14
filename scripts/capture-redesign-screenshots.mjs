import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";

const base = process.env.SCREENSHOT_BASE ?? "http://localhost:3000";
const outDir = process.env.SCREENSHOT_DIR ?? "/opt/cursor/artifacts/screenshots/redesign-complete";

const ROUTES = [
  { slug: "home", path: "/" },
  { slug: "passport", path: "/passport" },
  { slug: "partner-verify", path: "/partner/verify?partner_id=good-trouble&policy_id=good-trouble-browse-v1" },
  { slug: "integrate", path: "/integrate" },
  { slug: "docs-partner-flow", path: "/docs/partner-flow" },
  { slug: "admin-identity", path: "/admin/identity" },
  { slug: "marketplace", path: "/marketplace" },
  { slug: "legal", path: "/legal/privacy" },
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

async function capture(route, label, viewport, device) {
  const context = device
    ? await browser.newContext({ ...devices[device] })
    : await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${base}${route.path}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (route.path === "/") await dismissBoot(page);
  else await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/${route.slug}-${label}.png`, fullPage: false });
  await context.close();
}

for (const route of ROUTES) {
  await capture(route, "desktop", { width: 1440, height: 900 });
  await capture(route, "mobile", null, "iPhone 13");
  console.log(`captured ${route.slug}`);
}

await browser.close();
console.log(`Saved to ${outDir}`);
