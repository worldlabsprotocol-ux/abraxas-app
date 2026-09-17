#!/usr/bin/env npx tsx
/**
 * Good Trouble browse E2E on DEMO preview.
 *
 * Recommended (same-session handoff):
 *   PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/preview-browse-e2e.ts --interactive
 *   → headed Chromium on the agent VM; complete Google sign-in in that window (Cursor Agents → Desktop).
 *
 * Legacy split phases (same VM profile only — do not open links in your local browser):
 *   ... preview-browse-e2e.ts
 *   ... preview-browse-e2e.ts --resume
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
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
import { referencePartnerBrowseCallbackUrl } from "@/lib/demo/referencePartnerBrowseCallback";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();
const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots/pr293-browse-e2e";
const REPORT_DIR = process.env.REPORT_DIR ?? "reports/progressive-proof-foundation";
const PROFILE_DIR = process.env.PLAYWRIGHT_PROFILE_DIR ?? join(OUT_DIR, ".playwright-profile");
const RESUME = process.argv.includes("--resume");
const INTERACTIVE = process.argv.includes("--interactive");
const BROWSE_RETURN = process.env.BROWSE_RETURN_URL ?? referencePartnerBrowseCallbackUrl(PREVIEW_URL);
const SIGN_IN_TIMEOUT_MS = Number(process.env.SIGN_IN_TIMEOUT_MS ?? 30 * 60 * 1000);

const results: Array<{ step: string; ok: boolean; detail: string }> = [];

type ZkLoginRegisterProbe = {
  status: number | null;
  code: string | null;
  error: string | null;
  expected_supabase_ref: string | null;
};

const zkLoginRegisterProbe: ZkLoginRegisterProbe = {
  status: null,
  code: null,
  error: null,
  expected_supabase_ref: null,
};

function log(step: string, ok: boolean, detail: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : ok === false ? "FAIL" : "PAUSE"} ${step}: ${detail}`);
}

/** Observe register API outcomes without logging OAuth tokens or PII. */
function attachZkLoginRegisterMonitor(page: Page) {
  page.on("response", async (response) => {
    if (!response.url().includes("/api/auth/zklogin/register")) return;
    zkLoginRegisterProbe.status = response.status();
    try {
      const json = await response.json() as Record<string, unknown>;
      zkLoginRegisterProbe.code = typeof json.code === "string" ? json.code : null;
      zkLoginRegisterProbe.error = typeof json.error === "string" ? json.error : null;
      zkLoginRegisterProbe.expected_supabase_ref = typeof json.expected_supabase_ref === "string"
        ? json.expected_supabase_ref
        : null;
    } catch {
      zkLoginRegisterProbe.code = null;
      zkLoginRegisterProbe.error = "non_json_response";
    }
    console.log(
      `zklogin/register probe: status=${zkLoginRegisterProbe.status}; code=${zkLoginRegisterProbe.code ?? "n/a"}`,
    );
  });
}

function assertZkLoginRegisterSucceeded(): boolean {
  const { status, code, expected_supabase_ref } = zkLoginRegisterProbe;
  if (status === null) {
    log(
      "zklogin register API",
      false,
      "no POST /api/auth/zklogin/register observed during sign-in",
    );
    return false;
  }
  if (status === 503 && code === "preview_supabase_not_demo_bound") {
    log(
      "zklogin register API",
      false,
      `preview still bound to production Supabase — bind Preview env to DEMO ref ${expected_supabase_ref ?? "ocntwbxarpjeixdnzide"}`,
    );
    return false;
  }
  if (status === 500 && code === "identity_save_permission_denied") {
    log(
      "zklogin register API",
      false,
      "service_role lacks INSERT on sui_zklogin_identities (Postgres 42501) — use DEMO Supabase on Preview",
    );
    return false;
  }
  if (status < 200 || status >= 300) {
    log(
      "zklogin register API",
      false,
      `HTTP ${status}; code=${code ?? "n/a"}; error=${zkLoginRegisterProbe.error ?? "n/a"}`,
    );
    return false;
  }
  log("zklogin register API", true, `HTTP ${status}`);
  return true;
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

async function capture(page: Page, name: string) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function seedBypassCookie(page: Page) {
  const target = vercelBypassSeedTarget(PREVIEW_URL);
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
  if (urlContainsBypassSecret(page.url())) {
    throw new Error("Bypass secret leaked into browser URL after seed navigation");
  }
}

async function assertNotVercelSso(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes("vercel.com/login") || url.includes("vercel.com/sso")) return false;
  const body = await page.content();
  return !body.includes("Log in to Vercel");
}

async function waitForPastVercelProtection(page: Page): Promise<void> {
  if (await assertNotVercelSso(page)) return;
  console.log(`
=== VERCEL DEPLOYMENT PROTECTION (same Desktop Chromium) ===
Complete Vercel team login in the Desktop browser window.
This script waits, then continues to Abraxas Google sign-in.
============================================================
`);
  await page.waitForFunction(
    () => !window.location.hostname.includes("vercel.com"),
    undefined,
    { timeout: SIGN_IN_TIMEOUT_MS },
  );
  log("preview access", true, "past Vercel deployment protection");
}

function printInteractiveHandoff() {
  console.log(`
=== SAME-SESSION GOOGLE SIGN-IN (do not use your local browser) ===
1. Open this agent run: https://cursor.com/agents/bc-aca75cd0-6e1a-48bf-8c99-a1790f3dc2c0
2. Open the **Desktop** panel (headed Chromium on this VM, DISPLAY=${process.env.DISPLAY ?? "unset"}).
3. In that Chromium window only: finish Google OAuth (Good Trouble browse uses Create or open my Passport).
4. Stay in the same window — this script waits, then continues DOB → callback → API checks.
   Do not export cookies, tokens, or auth state.
===================================================================
`);
}

async function waitForGoogleSignIn(page: Page): Promise<void> {
  page.setDefaultTimeout(SIGN_IN_TIMEOUT_MS);
  printInteractiveHandoff();

  const passportBtn = page.getByRole("button", { name: /create or open my passport/i });
  const googleBtn = page.getByRole("button", { name: /continue with google/i });
  if (await passportBtn.count()) {
    log("interactive handoff", true, "clicked Create or open my Passport; take control in Desktop Chromium for Google");
    await passportBtn.first().click();
  } else if (await googleBtn.count()) {
    log("interactive handoff", true, "clicked Continue with Google; take control in Desktop Chromium for Google");
    await googleBtn.first().click();
  } else {
    log("interactive handoff", true, "waiting for Google sign-in in agent Desktop Chromium");
  }
  console.log("HANDOFF_READY: take control in Desktop Chromium for Google sign-in");

  await page.waitForURL(
    (url) => {
      const href = url.toString();
      return href.includes("accounts.google.com")
        || href.includes("/auth/zklogin/callback")
        || href.includes("/partner/continue");
    },
    { timeout: 60_000 },
  );
  const oauthHost = (() => {
    try {
      return new URL(page.url()).hostname;
    } catch {
      return "unknown";
    }
  })();
  console.log(`oauth_navigation_host=${oauthHost}`);

  await page.waitForFunction(
    () => {
      const href = window.location.href;
      if (window.location.hostname.includes("accounts.google.com")) return false;
      const onContinue = window.location.pathname.includes("/partner/continue");
      const onCallback = window.location.pathname.includes("/auth/zklogin/callback");
      const hasDobInputs = Boolean(
        document.querySelector('input[placeholder="MM"]')
        || document.querySelector('input[placeholder="YYYY"]')
        || document.querySelector('input[id*="month" i]'),
      );
      return onContinue || onCallback || hasDobInputs;
    },
    undefined,
    { timeout: SIGN_IN_TIMEOUT_MS },
  );

  const registerOk = assertZkLoginRegisterSucceeded();
  log(
    "google sign-in",
    registerOk,
    registerOk
      ? "session detected; zklogin register succeeded"
      : "session UI progressed but zklogin register did not succeed",
  );
  if (!registerOk) {
    throw new Error("zklogin register failed — browse flow blocked");
  }
}

async function runPostSignInFlow(page: Page) {
  await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);

  const passportBtn = page.getByRole("button", { name: /create or open my passport/i });
  if (await passportBtn.count()) {
    await passportBtn.click();
    await page.waitForTimeout(2000);
  }

  if (page.url().includes("/partner/continue")) {
    log("post-sign-in routing", true, "landed on partner continue");
  }

  const month = page.locator('input[placeholder="MM"], input[id*="month" i]').first();
  const day = page.locator('input[placeholder="DD"], input[id*="day" i]').first();
  const year = page.locator('input[placeholder="YYYY"], input[id*="year" i]').first();

  if (await month.count()) {
    await month.fill("06");
    await day.fill("15");
    await year.fill("1990");
    await capture(page, "03-dob-filled-desktop");
    const submit = page.getByRole("button", { name: /confirm|continue|submit|21/i }).first();
    await submit.click();
    await page.waitForTimeout(8000);
    await capture(page, "04-demo-callback-desktop");
  }

  let browseReceipt: string | null = null;
  const finalUrl = page.url();
  const onDemoCallback = finalUrl.startsWith(BROWSE_RETURN);
  if (finalUrl.includes("browse_receipt=")) {
    browseReceipt = new URL(finalUrl).searchParams.get("browse_receipt");
    log(
      "demo callback redirect",
      Boolean(browseReceipt) && onDemoCallback,
      onDemoCallback
        ? redactBypassFromUrl(finalUrl).slice(0, 140)
        : `redirect missed demo callback (expected ${BROWSE_RETURN})`,
    );
  } else {
    log("demo callback redirect", false, "no browse_receipt on return URL");
  }

  if (!browseReceipt) {
    log("browse self-attest E2E", false, "no browse_receipt after DOB submit");
    return;
  }

  const verifyRes = await fetch(`${PREVIEW_URL}/api/age-assurance/browse-receipt/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...vercelBypassHeaders(BYPASS, { setCookie: false }),
    },
    body: JSON.stringify({
      browse_receipt: browseReceipt,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    }),
  });
  const verifyJson = await verifyRes.json() as { verified?: boolean; valid_for_purchase?: boolean; assurance_level?: string };
  log(
    "live browse receipt verify API",
    verifyRes.ok && verifyJson.verified === true && verifyJson.valid_for_purchase === false,
    `verified=${verifyJson.verified}; L0=${verifyJson.assurance_level}; valid_for_purchase=${verifyJson.valid_for_purchase}`,
  );

  const retailRes = await fetch(`${PREVIEW_URL}/api/age-assurance/browse-receipt/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...vercelBypassHeaders(BYPASS, { setCookie: false }),
    },
    body: JSON.stringify({
      browse_receipt: browseReceipt,
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_RETAIL_POLICY_ID,
    }),
  });
  const retailJson = await retailRes.json() as { verified?: boolean; code?: string };
  log(
    "live retail denial via verify API",
    !retailJson.verified,
    `verified=${retailJson.verified}; code=${retailJson.code ?? "n/a"}`,
  );
}

async function runInteractive() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(PROFILE_DIR, { recursive: true });

  const desktop = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    extraHTTPHeaders: vercelBypassHeaders(BYPASS),
    viewport: { width: 1440, height: 900 },
    channel: "chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = desktop.pages()[0] ?? await desktop.newPage();
  attachZkLoginRegisterMonitor(page);
  await seedBypassCookie(page);
  await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(2000);

  await waitForPastVercelProtection(page);
  if (!BYPASS && !(await assertNotVercelSso(page))) {
    log("preview access", false, "still on Vercel SSO — add VERCEL_PROTECTION_BYPASS or complete Desktop Vercel login");
    await desktop.close();
    return;
  }
  if (BYPASS) {
    log("preview access", true, "bypass headers active");
  }

  await capture(page, "01-browse-verify-entry-desktop");
  await waitForGoogleSignIn(page);
  await runPostSignInFlow(page);

  // Mobile viewport in same profile/session
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  await capture(page, "05-browse-verify-mobile");
  await page.goto(BROWSE_RETURN, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForTimeout(1500);
  await capture(page, "06-demo-callback-mobile");

  await desktop.close();
}

async function runLegacySplit(ctx: BrowserContext) {
  if (!RESUME) {
    const page = await ctx.newPage();
    await page.goto(browseVerifyUrl(), { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(2000);
    if (!(await assertNotVercelSso(page))) {
      log("browse entry", false, "Vercel SSO — bypass headers not applied");
      await page.close();
      return false;
    }
    await capture(page, "01-browse-verify-entry");
    const googleBtn = page.getByRole("button", { name: /continue with google/i });
    if (await googleBtn.count()) {
      log("browse entry", true, "use --interactive for same-session Google sign-in");
      await capture(page, "02-google-signin-required");
      log("HUMAN ACTION", false, "Re-run with --interactive (not a local-browser link)");
      await page.close();
      return false;
    }
    await page.close();
    return true;
  }

  const page = await ctx.newPage();
  await runPostSignInFlow(page);
  await page.close();
  return true;
}

async function writeReport(label: string) {
  const reportPath = join(REPORT_DIR, `browse-e2e-${label}-${Date.now()}.md`);
  await writeFile(reportPath, [
    `# Browse E2E ${label}`,
    `- Preview: ${PREVIEW_URL}`,
    `- SHA: ${process.env.DEPLOYED_SHA ?? "unknown"}`,
    `- Mode: ${INTERACTIVE ? "interactive" : RESUME ? "resume" : "legacy-pause"}`,
    "",
    ...results.map((r) => `- ${r.step}: ${r.detail}`),
  ].join("\n"));
  console.log(`Report: ${reportPath}`);
}

async function main() {
  if (!PREVIEW_URL) throw new Error("PREVIEW_URL required");
  if (!BYPASS && !INTERACTIVE) {
    throw new Error(
      "VERCEL_PROTECTION_BYPASS or VERCEL_AUTOMATION_BYPASS_SECRET required (header-only; add to this Cloud Agent environment secrets)",
    );
  }
  if (!BYPASS && INTERACTIVE) {
    console.warn("WARN: bypass secret not in runtime — use Desktop Chromium to complete Vercel login if prompted");
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORT_DIR, { recursive: true });

  if (INTERACTIVE) {
    await runInteractive();
    await writeReport("interactive");
    const failed = results.some((r) => r.ok === false);
    process.exit(failed ? 1 : 0);
  }

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    extraHTTPHeaders: vercelBypassHeaders(BYPASS),
    storageState: RESUME ? join(PROFILE_DIR, "legacy-state.json") : undefined,
  });
  const seedPage = await ctx.newPage();
  await seedBypassCookie(seedPage);
  await seedPage.close();

  const continued = await runLegacySplit(ctx);
  await ctx.close();
  await browser.close();
  await writeReport(RESUME ? "resume" : "pause");
  process.exit(continued ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
