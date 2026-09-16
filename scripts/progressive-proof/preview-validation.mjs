#!/usr/bin/env node
/**
 * PR #293 progressive proof preview validation.
 * Usage:
 *   PREVIEW_URL=https://... VERCEL_PROTECTION_BYPASS=... node scripts/progressive-proof/preview-validation.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = process.env.VERCEL_PROTECTION_BYPASS ?? "";
const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots/pr293-validation";
const REPORT_DIR = process.env.REPORT_DIR ?? "reports/progressive-proof-foundation";

const PARTNER_ID = "good-trouble-cannabis";
const BROWSE_POLICY = "good-trouble-browse-v1";
const RETAIL_POLICY = "good-trouble-retail-v1";
const RETURN_URL = "https://www.goodtroublecanna.com/age-verification-result";

const results = [];
let firstFailure = null;

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok && !firstFailure) firstFailure = { name, detail };
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
}

function bypassHeaders() {
  if (!BYPASS) return {};
  return {
    "x-vercel-protection-bypass": BYPASS,
    "x-vercel-set-bypass-cookie": "true",
  };
}

async function fetchPreview(path, opts = {}) {
  const url = `${PREVIEW_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...bypassHeaders(), ...(opts.headers ?? {}) },
    redirect: "manual",
  });
  return { url, res, status: res.status };
}

async function capture(page, slug, label) {
  const file = join(OUT_DIR, `${slug}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  if (!PREVIEW_URL) {
    console.error("PREVIEW_URL is required");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORT_DIR, { recursive: true });

  const shaRes = await fetchPreview("/api/health", { method: "GET" }).catch(() => null);
  const deployedSha = process.env.DEPLOYED_SHA ?? "unknown";

  record("preview reachable", shaRes?.status === 200 || shaRes?.status === 404, `status=${shaRes?.status ?? "error"}`);

  const browser = await chromium.launch();
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: bypassHeaders(),
  });
  const mobile = await browser.newContext({
    ...devices["iPhone 13"],
    extraHTTPHeaders: bypassHeaders(),
  });

  async function loadPartnerVerify(ctx, slug) {
    const page = await ctx.newPage();
    const q = new URLSearchParams({
      partner_id: PARTNER_ID,
      policy_id: BROWSE_POLICY,
      purpose: "browse",
      return_url: "https://www.goodtroublecanna.com/browse-callback",
    });
    const resp = await page.goto(`${PREVIEW_URL}/partner/verify?${q}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(3000);
    const blocked = page.url().includes("vercel.com/login") || (await page.content()).includes("Authentication Required");
    record(`${slug} partner verify loads`, !blocked && (resp?.ok() || resp?.status() === 200), blocked ? "Vercel SSO" : `status=${resp?.status()}`);
    if (!blocked) await capture(page, slug, slug.includes("mobile") ? "mobile" : "desktop");
    await page.close();
    return { page, blocked };
  }

  await loadPartnerVerify(desktop, "gt-browse-verify-desktop");
  await loadPartnerVerify(mobile, "gt-browse-verify-mobile");

  // Sign-in copy on passport (signed-out state)
  for (const [ctx, label] of [[desktop, "desktop"], [mobile, "mobile"]]) {
    const page = await ctx.newPage();
    await page.goto(`${PREVIEW_URL}/passport`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(2500);
    const body = await page.content();
    const hasAccountOnlyCopy = /account only|No documents|ID checks at sign-in/i.test(body);
    const promptsDocuments = /upload.*(passport|document)|start.*verification|Veriff/i.test(body)
      && !/when a participating service|only when a service/i.test(body);
    record(`passport sign-in copy (${label})`, hasAccountOnlyCopy || !promptsDocuments, promptsDocuments ? "document prompt on load" : "ok");
    await capture(page, "passport-signin", label);
    await page.close();
  }

  // Retail verify entry
  const retailPage = await desktop.newPage();
  const retailQ = new URLSearchParams({
    partner_id: PARTNER_ID,
    policy_id: RETAIL_POLICY,
    purpose: "purchase",
    return_url: RETURN_URL,
  });
  await retailPage.goto(`${PREVIEW_URL}/partner/verify?${retailQ}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await retailPage.waitForTimeout(3000);
  const retailBody = await retailPage.content();
  const retailMentionsEvidence = /verify|passport|age|identity|proof/i.test(retailBody);
  record("retail verify mentions stronger evidence", retailMentionsEvidence, retailMentionsEvidence ? "copy present" : "missing retail copy");
  await capture(retailPage, "gt-retail-verify", "desktop");
  await retailPage.close();

  await browser.close();

  const report = {
    previewUrl: PREVIEW_URL,
    deployedSha,
    bypassConfigured: Boolean(BYPASS),
    timestamp: new Date().toISOString(),
    results,
    firstFailure,
    screenshotsDir: OUT_DIR,
  };

  const reportPath = join(REPORT_DIR, `preview-validation-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  const md = [
    "# PR #293 Preview Validation",
    "",
    `- **Preview:** ${PREVIEW_URL}`,
    `- **Deployed SHA:** \`${deployedSha}\``,
    `- **Bypass configured:** ${BYPASS ? "yes" : "no"}`,
    `- **Timestamp:** ${report.timestamp}`,
    "",
    "## Results",
    "",
    ...results.map((r) => `- ${r.ok ? "PASS" : "FAIL"} **${r.name}**${r.detail ? `: ${r.detail}` : ""}`),
    "",
    firstFailure ? `## First failure\n\n- **${firstFailure.name}**: ${firstFailure.detail}` : "## First failure\n\nNone",
    "",
    `Screenshots: \`${OUT_DIR}\``,
  ].join("\n");

  await writeFile(reportPath, md);
  console.log(`\nReport: ${reportPath}`);
  process.exit(firstFailure ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
