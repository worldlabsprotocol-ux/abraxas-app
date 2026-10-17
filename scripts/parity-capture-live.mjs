import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = "/opt/cursor/artifacts/parity";
const BASES = [
  { env: "production", url: "https://abraxasworld.xyz" },
  { env: "demo", url: "https://demo.abraxasworld.xyz" },
];
const ROUTES = ["/", "/passport", "/verify", "/developers/integration-studio", "/developers/launchpad"];
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "mobile-390", ...devices["iPhone 12"].viewport, isMobile: true },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const meta = [];

for (const base of BASES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile ?? false,
      colorScheme: "dark",
    });
    const page = await context.newPage();
    for (const route of ROUTES) {
      const target = `${base.url}${route}`;
      try {
        const resp = await page.goto(target, { waitUntil: "networkidle", timeout: 90000 });
        await page.waitForTimeout(route === "/" ? 1500 : 800);
        const file = path.join(OUT, `${base.env}-${vp.name}${route.replace(/\//g, "_") || "_home"}.png`);
        await page.screenshot({ path: file, fullPage: false });
        meta.push({
          env: base.env,
          route,
          viewport: vp.name,
          status: resp?.status(),
          shot: file,
          title: await page.title(),
        });
      } catch (e) {
        meta.push({ env: base.env, route, viewport: vp.name, error: String(e) });
      }
    }
    await context.close();
  }
}

await browser.close();
console.log(JSON.stringify({ meta }, null, 2));
