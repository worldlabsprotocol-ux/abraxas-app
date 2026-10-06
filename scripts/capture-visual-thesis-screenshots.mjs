#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = "/opt/cursor/artifacts/screenshots";
const shots = [
  { name: "01-homepage-hero-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 0 },
  { name: "02-verify-once-thesis-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 900 },
  { name: "03-privacy-architecture-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 1700 },
  { name: "04-verify-once-thesis-mobile", url: "/", viewport: { width: 390, height: 844 }, scroll: 700 },
  { name: "05-passport-desktop", url: "/passport", viewport: { width: 1440, height: 900 }, scroll: 0 },
  { name: "06-integration-studio-desktop", url: "/developers/integration-studio", viewport: { width: 1440, height: 900 }, scroll: 0 },
  { name: "07-launchpad-desktop", url: "/developers/partner-launchpad", viewport: { width: 1440, height: 900 }, scroll: 0 },
  { name: "08-verification-gateway-desktop", url: "/verification", viewport: { width: 1440, height: 900 }, scroll: 0 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ colorScheme: "dark" });

for (const shot of shots) {
  const page = await context.newPage();
  await page.setViewportSize(shot.viewport);
  await page.goto(BASE + shot.url, { waitUntil: "networkidle", timeout: 120000 });
  if (shot.scroll) await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), fullPage: false });
  await page.close();
  console.log("saved", shot.name);
}

await browser.close();
console.log("done");
