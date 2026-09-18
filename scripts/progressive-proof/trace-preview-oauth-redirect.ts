#!/usr/bin/env npx tsx
/**
 * Trace Preview OAuth redirect path (URLs + status codes only; no secrets).
 *
 * Usage:
 *   PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/trace-preview-oauth-redirect.ts
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
} from "@/lib/goodTrouble/constants";
import { referencePartnerBrowseCallbackUrl } from "@/lib/demo/referencePartnerBrowseCallback";
import {
  assertPreviewAuditOrigin,
  extractRedirectUriFromGoogleOAuthUrl,
  originFromUrl,
  redactOAuthUrlForTrace,
} from "@/lib/preview/previewAuditOrigin";
import {
  resolveVercelProtectionBypass,
  vercelBypassHeaders,
  vercelBypassSeedTarget,
} from "@/lib/preview/vercelBypass";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();
const OUT = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts";
const PROFILE = process.env.PLAYWRIGHT_PROFILE_DIR ?? join(OUT, ".trace-oauth-profile");

type TraceHop = {
  step: string;
  status: number | null;
  origin: string | null;
  path: string;
  location: string | null;
  redirect_uri?: string | null;
};

const chain: TraceHop[] = [];

function record(hop: TraceHop) {
  chain.push(hop);
  console.log(JSON.stringify(hop));
}

async function fetchHop(step: string, url: string): Promise<void> {
  const res = await fetch(url, {
    headers: vercelBypassHeaders(BYPASS, { setCookie: false }),
    redirect: "manual",
  });
  const location = res.headers.get("location");
  record({
    step,
    status: res.status,
    origin: originFromUrl(url),
    path: new URL(url).pathname + (new URL(url).search ? new URL(url).search.slice(0, 120) : ""),
    location: location ? redactOAuthUrlForTrace(location) : null,
  });
}

function browseVerifyUrl(): string {
  const q = new URLSearchParams({
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    purpose: "browse",
    return_url: referencePartnerBrowseCallbackUrl(PREVIEW_URL),
  });
  return `${PREVIEW_URL}/partner/verify?${q}`;
}

async function main() {
  if (!PREVIEW_URL) throw new Error("PREVIEW_URL required");
  if (!BYPASS) throw new Error("VERCEL_PROTECTION_BYPASS required");

  await mkdir(OUT, { recursive: true });
  await mkdir(PROFILE, { recursive: true });

  await fetchHop("http:partner_verify", browseVerifyUrl());
  await fetchHop("http:zklogin_callback", `${PREVIEW_URL}/auth/zklogin/callback`);
  await fetchHop("http:passport", `${PREVIEW_URL}/passport`);

  const browser = await chromium.launchPersistentContext(PROFILE, {
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    extraHTTPHeaders: vercelBypassHeaders(BYPASS, { setCookie: false }),
  });
  const page = browser.pages()[0] ?? await browser.newPage();

  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/auth/zklogin/register")) return;
    record({
      step: "browser:register_response",
      status: response.status(),
      origin: originFromUrl(url),
      path: new URL(url).pathname,
      location: null,
    });
  });

  await page.goto(vercelBypassSeedTarget(PREVIEW_URL), { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120_000 });
  record({
    step: "browser:partner_verify_loaded",
    status: 200,
    origin: originFromUrl(page.url()),
    path: new URL(page.url()).pathname,
    location: null,
  });
  assertPreviewAuditOrigin(page.url(), PREVIEW_URL, "partner_verify_loaded");

  const passportBtn = page.getByRole("button", { name: /create or open my passport/i });
  await passportBtn.click();

  await page.waitForURL(
    (url) => url.toString().includes("accounts.google.com"),
    { timeout: 60_000 },
  );

  const googleUrl = page.url();
  const redirectUri = extractRedirectUriFromGoogleOAuthUrl(googleUrl);
  record({
    step: "browser:google_oauth_request",
    status: null,
    origin: originFromUrl(googleUrl),
    path: new URL(googleUrl).pathname,
    location: redactOAuthUrlForTrace(googleUrl),
    redirect_uri: redirectUri,
  });

  const expectedCallback = `${new URL(PREVIEW_URL).origin}/auth/zklogin/callback`;
  if (redirectUri !== expectedCallback) {
    throw new Error(`redirect_uri mismatch: got ${redirectUri ?? "null"} expected ${expectedCallback}`);
  }

  await page.goto(`${PREVIEW_URL}/auth/zklogin/callback`, { waitUntil: "domcontentloaded" });
  record({
    step: "browser:callback_without_token",
    status: 200,
    origin: originFromUrl(page.url()),
    path: new URL(page.url()).pathname + new URL(page.url()).search,
    location: null,
  });
  assertPreviewAuditOrigin(page.url(), PREVIEW_URL, "callback_without_token");

  await browser.close();

  const reportPath = join(OUT, "preview-oauth-redirect-trace.json");
  await writeFile(reportPath, JSON.stringify({
    preview_url: PREVIEW_URL,
    expected_callback: expectedCallback,
    redirect_uri_matches_preview: redirectUri === expectedCallback,
    chain,
  }, null, 2));
  console.log(`TRACE_REPORT=${reportPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
