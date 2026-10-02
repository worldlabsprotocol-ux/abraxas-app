#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdir } from "fs/promises";
import path from "path";

const OUT = "/opt/cursor/artifacts";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
  colorScheme: "dark",
});
const page = await context.newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 120000 });
await page.evaluate(() => window.scrollTo(0, 850));
await page.waitForTimeout(7000);
await page.close();
await context.close();
await browser.close();
console.log("video recorded to", OUT);
