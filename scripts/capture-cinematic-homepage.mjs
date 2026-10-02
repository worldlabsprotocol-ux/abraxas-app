#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = "/opt/cursor/artifacts/screenshots";
const shots = [
  { name: "cinematic-01-hero-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 0 },
  { name: "cinematic-02-scroll-story-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 1100 },
  { name: "cinematic-03-passport-object-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 2200 },
  { name: "cinematic-04-thesis-diagram-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 3200 },
  { name: "cinematic-05-footer-desktop", url: "/", viewport: { width: 1440, height: 900 }, scroll: 99999 },
  { name: "cinematic-06-hero-mobile", url: "/", viewport: { width: 390, height: 844 }, scroll: 0 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ colorScheme: "dark" });

for (const shot of shots) {
  const page = await context.newPage();
  await page.setViewportSize(shot.viewport);
  await page.goto(BASE + shot.url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (shot.scroll) await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${shot.name}.png`), fullPage: false });
  await page.close();
  console.log("saved", shot.name);
}

await browser.close();
console.log("done");
