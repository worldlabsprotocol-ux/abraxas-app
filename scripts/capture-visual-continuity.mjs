#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const OUT = "/opt/cursor/artifacts/screenshots";
mkdirSync(OUT, { recursive: true });

const base = process.env.BASE_URL ?? "http://localhost:3000";

async function capture(page, name, path, width) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${name}`, fullPage: width !== 390 });
  console.log(`saved ${name}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await capture(page, "homepage-desktop-visual-continuity.png", "/", 1280);
  await capture(page, "homepage-mobile-visual-continuity.png", "/", 390);
  await capture(page, "passport-product-shell.png", "/passport", 1280);
  await capture(page, "integration-studio-product-shell.png", "/developers/integration-studio", 1280);
} finally {
  await browser.close();
}
