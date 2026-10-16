#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const base = process.env.BUILD583_SCREENSHOT_BASE_URL?.trim() || "http://127.0.0.1:3010";
const outDir = process.env.BUILD583_SCREENSHOT_DIR?.trim() || "/opt/cursor/artifacts";

const routes = [
  {
    name: "build583-integration-studio-institutional-desktop",
    path: "/developers/integration-studio?pack=sandbox_institutional_protocol_access&path=institutional_eligibility_gate&action=org_protocol_access&category=institutional_eligibility&environment=sandbox",
    width: 1280,
    height: 900,
  },
  {
    name: "build583-launchpad-institutional-desktop",
    path: "/developers/launchpad?template=sandbox_institutional_protocol_access",
    width: 1280,
    height: 900,
  },
  {
    name: "build583-launchpad-institutional-mobile",
    path: "/developers/launchpad?template=sandbox_institutional_protocol_access",
    width: 390,
    height: 844,
  },
  {
    name: "build583-passport-signin-desktop",
    path: "/passport",
    width: 1280,
    height: 900,
  },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: route.width, height: route.height } });
  const url = `${base.replace(/\/$/, "")}${route.path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const file = join(outDir, `${route.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`wrote ${file}`);
  await page.close();
}
await browser.close();
