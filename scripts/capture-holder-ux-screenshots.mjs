#!/usr/bin/env node
/**
 * Capture holder verification UX screenshots for PR evidence.
 * Requires: next dev running with PARTNER_VERIFY_PREVIEW_CONTROLS=1
 */
import { chromium, devices } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const OUT = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/holder-ux-screenshots";

const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
];

const SCENES = [
  {
    file: "wallet-control-request",
    query:
      "preview_phase=sign_in&preview_signin_configured=1&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375", "390", "1280"],
  },
  {
    file: "wallet-control-checking",
    query:
      "preview_phase=verifying&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375", "1280"],
  },
  {
    file: "wallet-control-success",
    query:
      "preview_phase=approved&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375", "1280"],
  },
  {
    file: "wallet-control-failure",
    query:
      "preview_phase=denied&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375", "1280"],
  },
  {
    file: "wallet-control-technical-details",
    query:
      "preview_phase=sign_in&preview_signin_configured=1&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["1280"],
    expandDetails: true,
  },
  {
    file: "wallet-control-return-failure",
    query:
      "preview_phase=invalid_binding&preview_environment=sandbox"
      + "&preview_partner_name=Post-Revocation%20Wallet%20Control%20Proof"
      + "&partner_id=ref-wc-postrev-5ffe"
      + "&policy_id=ref-wc-postrev-5ffe-wallet_control-v1"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375", "1280"],
  },
  {
    file: "age21-request-mobile",
    query:
      "preview_phase=sign_in&preview_signin_configured=1&preview_environment=sandbox"
      + "&partner_id=acme-sandbox&policy_id=acme-age_21_retail-v1&purpose=purchase"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375"],
  },
  {
    file: "age21-success-mobile",
    query:
      "preview_phase=approved&preview_environment=sandbox"
      + "&partner_id=acme-sandbox&policy_id=acme-age_21_retail-v1&purpose=purchase"
      + "&return_url=https%3A%2F%2Fexample.com%2Fcallback",
    viewports: ["375"],
  },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const scene of SCENES) {
    for (const vpName of scene.viewports) {
      const vp = VIEWPORTS.find((v) => v.name === vpName) ?? VIEWPORTS[0];
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: "dark",
      });
      const page = await context.newPage();
      const url = `${BASE}/partner/verify?${scene.query}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
      if (scene.expandDetails) {
        await page.locator("summary:has-text('View details')").first().click();
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(800);
      const suffix = scene.viewports.length > 1 ? `-${vpName}` : "";
      const path = join(OUT, `${scene.file}${suffix}.png`);
      await page.screenshot({ path, fullPage: true });
      console.log(`saved ${path}`);
      await context.close();
    }
  }

  // Reduced motion variant
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(
    `${BASE}/partner/verify?${SCENES[0].query}`,
    { waitUntil: "networkidle", timeout: 120_000 },
  );
  await page.waitForTimeout(500);
  await page.screenshot({
    path: join(OUT, "wallet-control-request-reduced-motion.png"),
    fullPage: true,
  });
  console.log(`saved ${join(OUT, "wallet-control-request-reduced-motion.png")}`);
  await context.close();

  await browser.close();
  console.log(`Screenshots written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
