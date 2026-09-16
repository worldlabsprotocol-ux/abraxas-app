#!/usr/bin/env npx tsx
/**
 * Good Trouble browse E2E on DEMO preview.
 *
 * Phase 1 (default): run automated checks, open browse flow, pause at Google sign-in.
 * Phase 2 (--resume): after human Google sign-in, complete DOB self-attest → receipt → retail denial.
 *
 * Usage:
 *   PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/preview-browse-e2e.ts
 *   PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/preview-browse-e2e.ts --resume
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  redactBypassFromUrl,
  resolveVercelProtectionBypass,
  vercelBypassHeaders,
  vercelBypassSeedTarget,
  urlContainsBypassSecret,
} from "@/lib/preview/vercelBypass";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();
const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots/pr293-browse-e2e";
const REPORT_DIR = process.env.REPORT_DIR ?? "reports/progressive-proof-foundation";
const STATE_PATH = process.env.PLAYWRIGHT_STATE_PATH ?? join(OUT_DIR, "auth-state.json");
const RESUME = process.argv.includes("--resume");
const BROWSE_RETURN = process.env.BROWSE_RETURN_URL ?? "https://www.goodtroublecanna.com/browse-callback";

const results: Array<{ step: string; ok: boolean; detail: string }> = [];

function log(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : ok === false ? "FAIL" : "PAUSE"} ${step}: ${detail}`);
}

async function seedContext(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const ctx = await browser.newContext({
    extraHTTPHeaders: vercelBypassHeaders(BYPASS),
    storageState: RESUME && existsSync(STATE_PATH) ? STATE_PATH : undefined,
  });
  if (!RESUME) {
    const page = await ctx.newPage();
    const target = vercelBypassSeedTarget(PREVIEW_URL);
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (urlContainsBypassSecret(page.url())) {
      throw new Error("Bypass secret leaked into browser URL after seed navigation");
    }
    await page.close();
  }
  return ctx;
}

function browseVerifyUrl(): string {
  const q = new URLSearchParams({
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    purpose: "browse",
    return_url: BROWSE_RETURN,
  });
  return `${PREVIEW_URL}/partner/verify?${q}`;
}

async function capture(page: import("playwright").Page, name: string) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function runPhase1(ctx: Awaited<ReturnType<typeof seedContext>>) {
  const page = await ctx.newPage();
  const url = browseVerifyUrl();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);

  if (page.url().includes("vercel.com/login")) {
    log("browse entry", false, "Vercel SSO — bypass headers not applied");
    await browserClose(ctx);
    return false;
  }

  await capture(page, "01-browse-verify-entry");

  const googleBtn = page.getByRole("button", { name: /continue with google/i });
  const passportBtn = page.getByRole("button", { name: /create or open my passport/i });

  if (await googleBtn.count()) {
    log("browse entry", true, "partner verify loaded; Google sign-in CTA visible");
    await capture(page, "02-google-signin-required");
    await ctx.storageState({ path: STATE_PATH });
    await writeFile(join(REPORT_DIR, "browse-e2e-pause.md"), [
      "# Pause — human Google sign-in required",
      "",
      `1. Open this URL in your browser (bypass is header-only in automation; use the preview with deployment protection bypass enabled for your session):`,
      `   ${redactBypassFromUrl(url)}`,
      `2. Click **Continue with Google** (or **Create or open my Passport** on browse flow).`,
      `3. Complete Google OAuth with a test account.`,
      `4. Re-run: \`npm run walkthrough:progressive-proof:browse-e2e -- --resume\``,
      "",
      `Storage state path: \`${STATE_PATH}\``,
    ].join("\n"));
    log("HUMAN ACTION", false, "Complete Google sign-in, then re-run with --resume");
    await page.close();
    return false;
  }

  if (await passportBtn.count()) {
    log("browse entry", true, "browse DOB-first entry (already signed in or alternate CTA)");
    await passportBtn.click();
    await page.waitForTimeout(2000);
    await capture(page, "02-after-passport-cta");
  }

  await page.close();
  return true;
}

async function browserClose(ctx: Awaited<ReturnType<typeof seedContext>>) {
  await ctx.close();
}

async function runPhase2(ctx: Awaited<ReturnType<typeof seedContext>>) {
  const page = await ctx.newPage();
  await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(3000);

  // Partner continue / DOB form path
  const continueUrl = page.url();
  if (continueUrl.includes("/partner/continue")) {
    log("post-sign-in routing", true, "landed on partner continue");
  }

  const month = page.locator('input[placeholder="MM"], input[id*="month" i]').first();
  const day = page.locator('input[placeholder="DD"], input[id*="day" i]').first();
  const year = page.locator('input[placeholder="YYYY"], input[id*="year" i]').first();

  if (await month.count()) {
    await month.fill("06");
    await day.fill("15");
    await year.fill("1990");
    await capture(page, "03-dob-filled");
    const submit = page.getByRole("button", { name: /confirm|continue|submit|21/i }).first();
    await submit.click();
    await page.waitForTimeout(5000);
    await capture(page, "04-after-self-attest");
  }

  let browseReceipt: string | null = null;
  const finalUrl = page.url();
  if (finalUrl.includes("browse_receipt=")) {
    browseReceipt = new URL(finalUrl).searchParams.get("browse_receipt");
    log("browse receipt redirect", Boolean(browseReceipt), redactBypassFromUrl(finalUrl).slice(0, 120));
  } else {
    const content = await page.content();
    const match = content.match(/browse_receipt["':\s]+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
    browseReceipt = match?.[1] ?? null;
    log("browse receipt capture", Boolean(browseReceipt), browseReceipt ? "receipt JWT captured from page" : "no receipt yet");
  }

  if (!browseReceipt) {
    log("browse self-attest E2E", false, "no browse_receipt after DOB submit");
    await page.close();
    return;
  }

  // Verify receipt is L0 browse only
  const verifyRes = await fetch(`${PREVIEW_URL}/api/age-assurance/browse-receipt/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...vercelBypassHeaders(BYPASS),
    },
    body: JSON.stringify({
      browse_receipt: browseReceipt,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }),
  });
  const verifyJson = await verifyRes.json() as { verified?: boolean; valid_for_purchase?: boolean; assurance_level?: string };
  log(
    "browse receipt verify API",
    verifyRes.ok && verifyJson.verified === true && verifyJson.valid_for_purchase === false,
    `verified=${verifyJson.verified}; L0=${verifyJson.assurance_level}; valid_for_purchase=${verifyJson.valid_for_purchase}`,
  );

  // Retail evaluate should not approve with browse receipt alone (no session — policy check via API)
  const retailRes = await fetch(`${PREVIEW_URL}/api/age-assurance/browse-receipt/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...vercelBypassHeaders(BYPASS),
    },
    body: JSON.stringify({
      browse_receipt: browseReceipt,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    }),
  });
  const retailJson = await retailRes.json() as { verified?: boolean; code?: string };
  log(
    "browse receipt cannot unlock retail policy",
    !retailJson.verified,
    `verified=${retailJson.verified}; code=${retailJson.code ?? "n/a"}`,
  );

  await page.close();
}

async function main() {
  if (!PREVIEW_URL) throw new Error("PREVIEW_URL required");
  if (!BYPASS) throw new Error("VERCEL_PROTECTION_BYPASS or VERCEL_AUTOMATION_BYPASS_SECRET required");

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await seedContext(browser);

  if (!RESUME) {
    const continued = await runPhase1(ctx);
    await ctx.close();
    await browser.close();
    const reportPath = join(REPORT_DIR, `browse-e2e-${RESUME ? "resume" : "pause"}-${Date.now()}.md`);
    await writeFile(reportPath, [
      `# Browse E2E ${RESUME ? "resume" : "pause"}`,
      `- Preview: ${PREVIEW_URL}`,
      `- SHA: ${process.env.DEPLOYED_SHA ?? "unknown"}`,
      "",
      ...results.map((r) => `- ${r.step}: ${r.detail}`),
    ].join("\n"));
    process.exit(continued ? 0 : 2);
  }

  await runPhase2(ctx);
  await ctx.close();
  await browser.close();

  const failed = results.some((r) => r.ok === false && r.step !== "HUMAN ACTION");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
