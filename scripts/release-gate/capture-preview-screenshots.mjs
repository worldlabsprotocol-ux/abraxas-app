// scripts/release-gate/capture-preview-screenshots.mjs
// Capture PR preview screenshots for release gate evidence.

import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";
import path from "path";

const PREVIEW_BASE =
  process.env.PREVIEW_URL
  ?? "https://abraxas-app-git-cursor-go-ccf1d9-worldlabsprotocol-uxs-projects.vercel.app";

const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots";

const ROUTES = [
  {
    name: "verify_age_partner_continue",
    path: "/partner/continue?verify_request=demo-gate&partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1&return=https%3A%2F%2Fexample.com%2Fage-verification-result",
    waitFor: "text=Verify your age",
  },
  {
    name: "under_review_partner_continue",
    path: "/partner/continue?verify_request=demo-gate&partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1&return=https%3A%2F%2Fexample.com%2Fage-verification-result",
    waitFor: "text=Loading",
  },
  {
    name: "admin_identity_review",
    path: "/admin/identity",
    waitFor: "text=identity",
  },
];

async function capture(viewport, label, routes) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(viewport);
  const page = await context.newPage();

  for (const route of routes) {
    const url = `${PREVIEW_BASE}${route.path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(2000);
      const file = path.join(OUT_DIR, `${route.name}_${label}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
    } catch (err) {
      console.error(`failed ${route.name} (${label}):`, err.message);
    }
  }

  await browser.close();
}

await mkdir(OUT_DIR, { recursive: true });

await capture({ viewport: { width: 1280, height: 800 } }, "desktop", ROUTES);
await capture(devices["iPhone 13"], "mobile", ROUTES);

console.log("done");
