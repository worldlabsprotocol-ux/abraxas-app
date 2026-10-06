#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = "/opt/cursor/artifacts";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});

const page = await context.newPage();
await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(1500);

const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
const steps = 24;
for (let i = 0; i <= steps; i += 1) {
  const y = Math.round((scrollHeight * i) / steps);
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
  await page.waitForTimeout(450);
}

await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(800);

const video = page.video();
const target = path.join(OUT, "cinematic-homepage-scroll.webm");
await page.close();
if (video) {
  await video.saveAs(target);
  console.log("saved", target);
}
await context.close();
await browser.close();
