#!/usr/bin/env node
// Capture Stocklana demo screenshots (desktop + mobile) against local or preview base URL.

import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseUrl = process.env.STOCKLANA_SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const outDir = resolve(process.cwd(), "docs/stocklana/screenshots");
mkdirSync(outDir, { recursive: true });

const paths = [
  { name: "stocklana-desktop", path: "/stocklana", viewport: { width: 1440, height: 900 } },
  { name: "stocklana-mobile", path: "/stocklana", device: devices["iPhone 13"] },
  { name: "stocklana-callback-desktop", path: "/stocklana/callback", viewport: { width: 1440, height: 900 } },
];

const browser = await chromium.launch();

for (const shot of paths) {
  const context = shot.device
    ? await browser.newContext({ ...shot.device })
    : await browser.newContext({ viewport: shot.viewport });
  const page = await context.newPage();
  await page.goto(`${baseUrl}${shot.path}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: resolve(outDir, `${shot.name}.png`), fullPage: true });
  await context.close();
  console.log(`wrote ${shot.name}.png`);
}

await browser.close();
