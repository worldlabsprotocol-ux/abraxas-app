#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  const scrolls = [0, 900, 1800, 2700, 3600, 4500, 5400];
  for (let i = 0; i < scrolls.length; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), scrolls[i]);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/homepage-scroll-phase-${i}.png` });
  }
  console.log("saved scroll phases");
} finally {
  await browser.close();
}
