import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3025";
const outDir = process.env.CAPTURE_OUT_DIR ?? "/opt/cursor/artifacts/pr769-screenshots";

const shots = [
  { name: "desktop-01-hero-emblem", path: "/", viewport: { width: 1440, height: 900 } },
  { name: "desktop-02-check-the-result", path: "/#verify-the-decision", viewport: { width: 1440, height: 900 } },
  { name: "desktop-03-ready-to-build", path: "/#ready-to-build", viewport: { width: 1440, height: 900 } },
  { name: "desktop-04-ephemeral-sandbox", path: "/developers/ephemeral-sandbox", viewport: { width: 1440, height: 900 } },
  { name: "mobile-01-hero-emblem", path: "/", viewport: devices["iPhone 13"].viewport },
  { name: "mobile-02-check-the-result", path: "/#verify-the-decision", viewport: devices["iPhone 13"].viewport },
  { name: "mobile-03-ready-to-build", path: "/#ready-to-build", viewport: devices["iPhone 13"].viewport },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
for (const shot of shots) {
  const context = await browser.newContext({
    viewport: shot.viewport,
    reducedMotion: shot.name.includes("reduced") ? "reduce" : undefined,
  });
  const page = await context.newPage();
  await page.goto(`${base}${shot.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const file = path.join(outDir, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: shot.name.includes("check") || shot.name.includes("ready") });
  await context.close();
  console.log("wrote", file);
}

await browser.close();
