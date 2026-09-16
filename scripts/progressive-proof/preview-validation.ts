#!/usr/bin/env npx tsx
/**
 * PR #293 progressive proof preview validation.
 *
 * Usage:
 *   PREVIEW_URL=https://... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/preview-validation.ts
 */
import { chromium, devices, type BrowserContext, type Page } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import {
  isVercelSsoRedirect,
  resolveVercelProtectionBypass,
  vercelBypassHeaders,
  redactBypassFromUrl,
  vercelBypassSeedTarget,
} from "@/lib/preview/vercelBypass";
import { evaluatePassportSignInSurface } from "@/lib/preview/passportSignInAssertions";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { PRODUCTION_PARTNER_POLICIES } from "@/lib/policy/productionPolicyContract";
import {
  GOOD_TROUBLE_BROWSE_POLICY_ID,
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
} from "@/lib/goodTrouble/constants";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();
const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots/pr293-validation";
const REPORT_DIR = process.env.REPORT_DIR ?? "reports/progressive-proof-foundation";

const PARTNER_ID = GOOD_TROUBLE_PARTNER_ID;
const BROWSE_POLICY = GOOD_TROUBLE_BROWSE_POLICY_ID;
const RETAIL_POLICY = GOOD_TROUBLE_RETAIL_POLICY_ID;
const RETURN_URL = "https://www.goodtroublecanna.com/age-verification-result";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

const results: CheckResult[] = [];
let firstFailure: CheckResult | null = null;

function record(name: string, ok: boolean, detail: string) {
  const entry = { name, ok, detail };
  results.push(entry);
  if (!ok && !firstFailure) firstFailure = entry;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

function isSameOriginRedirect(location: string | null): boolean {
  if (!location || isVercelSsoRedirect(location)) return false;
  try {
    const target = new URL(location, PREVIEW_URL);
    const origin = new URL(PREVIEW_URL);
    return target.origin === origin.origin;
  } catch {
    return false;
  }
}

async function fetchPreview(path: string, opts: RequestInit = {}) {
  const url = `${PREVIEW_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...vercelBypassHeaders(BYPASS), ...(opts.headers ?? {}) },
    redirect: "manual",
  });
  return { url, res, status: res.status, location: res.headers.get("location") };
}

async function fetchPreviewFollow(path: string, opts: RequestInit = {}) {
  const url = `${PREVIEW_URL}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { ...vercelBypassHeaders(BYPASS), ...(opts.headers ?? {}) },
    redirect: "follow",
  });
  return { url: res.url, res, status: res.status };
}

async function traceRedirectChain(path: string, maxHops = 5) {
  const chain: Array<{ status: number; location: string | null; url: string }> = [];
  let nextUrl = `${PREVIEW_URL}${path}`;

  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetch(nextUrl, {
      headers: vercelBypassHeaders(BYPASS),
      redirect: "manual",
    });
    const location = res.headers.get("location");
    chain.push({
      status: res.status,
      location: location ? redactBypassFromUrl(location) : null,
      url: redactBypassFromUrl(nextUrl),
    });
    if (res.status < 300 || res.status >= 400 || !location) break;
    nextUrl = location.startsWith("http") ? location : new URL(location, PREVIEW_URL).toString();
    if (isVercelSsoRedirect(location)) break;
  }

  return chain;
}

function browseClaimFixture(): CredentialClaimRecord {
  const now = new Date().toISOString();
  return {
    id: "self-attest:fixture",
    subject_id: "0xfixture",
    credential_jti: null,
    claim_type: "self_attested_age_band",
    claim_value: {
      outcome: "over_21",
      provenance: "user_self_attestation",
      purpose: "browse",
      partner_id: GOOD_TROUBLE_PARTNER_ID,
      policy_id: GOOD_TROUBLE_BROWSE_POLICY_ID,
    },
    issuer_id: "issuer:abraxas-self-attest",
    assurance_level: "L0",
    issued_at: now,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    status: "active",
    revocation_reference: null,
    evidence_reference: "br_fixture",
    jurisdiction: null,
    policy_scope: GOOD_TROUBLE_BROWSE_POLICY_ID,
  };
}

async function runPolicyFailClosedChecks() {
  const browse = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === BROWSE_POLICY)!;
  const retail = PRODUCTION_PARTNER_POLICIES.find((p) => p.id === RETAIL_POLICY)!;
  const claim = browseClaimFixture();

  const browseOk = evaluatePolicyRules(browse.rules, [claim]);
  record(
    "policy: browse L0 claim satisfies browse policy",
    browseOk.decision === "approved",
    `decision=${browseOk.decision}`,
  );

  const retailDenied = evaluatePolicyRules(retail.rules, [claim]);
  record(
    "policy: browse receipt cannot satisfy retail",
    retailDenied.decision !== "approved",
    `decision=${retailDenied.decision}; missing=${retailDenied.missing_claims.join(",")}`,
  );

  const stocklanaLike = {
    sandbox_only: true,
    required_claims: [
      { claim_type: "wallet_binding_confirmed", max_age_hours: 720, min_assurance: "L2" },
      { claim_type: "liveness_passed", max_age_hours: 8760, min_assurance: "L2" },
    ],
  };
  const stocklanaDenied = evaluatePolicyRules(stocklanaLike, [claim]);
  record(
    "policy: browse claim cannot satisfy Stocklana-like policy",
    stocklanaDenied.decision !== "approved",
    `decision=${stocklanaDenied.decision}`,
  );

  const expired = evaluatePolicyRules(browse.rules, [{
    ...claim,
    status: "expired",
    expires_at: new Date(Date.now() - 86400000).toISOString(),
  }]);
  record("policy: expired browse claim fails closed", expired.decision !== "approved", `decision=${expired.decision}`);

  const revoked = evaluatePolicyRules(browse.rules, [{ ...claim, status: "revoked" }]);
  record("policy: revoked browse claim fails closed", revoked.decision !== "approved", `decision=${revoked.decision}`);

  const wrongPolicy = evaluatePolicyRules(browse.rules, [{
    ...claim,
    claim_value: { ...claim.claim_value, policy_id: "wrong-policy" },
  }], { partnerId: GOOD_TROUBLE_PARTNER_ID, policyId: GOOD_TROUBLE_BROWSE_POLICY_ID });
  record("policy: wrong-policy browse claim fails closed", wrongPolicy.decision !== "approved", `decision=${wrongPolicy.decision}`);
}

async function runPreviewApiChecks() {
  if (!BYPASS) {
    record("api: preview API checks", false, "skipped — bypass secret not configured");
    return;
  }

  const invalid = await fetchPreview("/api/age-assurance/browse-receipt/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      browse_receipt: "invalid.jwt.token",
      partner_id: PARTNER_ID,
      policy_id: BROWSE_POLICY,
    }),
  });
  record(
    "api: invalid browse receipt rejected",
    invalid.status === 400,
    invalid.status === 401
      ? "status=401 (Vercel SSO — bypass header not accepted)"
      : `status=${invalid.status}`,
  );

  const protocolFollow = await fetchPreviewFollow("/api/protocol/status", { method: "GET" });
  const protocolChain = await traceRedirectChain("/api/protocol/status");
  const ssoHop = protocolChain.find((h) => isVercelSsoRedirect(h.location));
  const sameOriginHop = protocolChain.find((h) => isSameOriginRedirect(h.location));
  const protocolOk = protocolFollow.status === 200;
  record(
    "api: protocol status reachable",
    protocolOk,
    ssoHop
      ? `Vercel SSO at ${ssoHop.location}`
      : sameOriginHop
        ? `legitimate redirect ${protocolChain.map((h) => `${h.status}→${h.location ?? "end"}`).join(" | ")}; final=${protocolFollow.status}`
        : `final status=${protocolFollow.status}`,
  );

}

async function seedBypassContext(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  if (!BYPASS) return;
  const ctx = await browser.newContext({ extraHTTPHeaders: vercelBypassHeaders(BYPASS) });
  const page = await ctx.newPage();
  await page.goto(vercelBypassSeedTarget(PREVIEW_URL), { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.close();
  await ctx.close();
}

async function createContext(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  viewport?: { width: number; height: number },
  device?: string,
): Promise<BrowserContext> {
  const base = {
    extraHTTPHeaders: vercelBypassHeaders(BYPASS),
  };
  if (device) {
    return browser.newContext({ ...devices[device], ...base });
  }
  return browser.newContext({ viewport, ...base });
}

async function assertNotVercelSso(page: Page): Promise<boolean> {
  const url = page.url();
  const body = await page.content();
  return !url.includes("vercel.com/login") && !body.includes("Log in to Vercel");
}

async function capture(page: Page, slug: string, label: string) {
  const file = join(OUT_DIR, `${slug}-${label}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function runBrowserChecks() {
  const browser = await chromium.launch();
  await seedBypassContext(browser);

  const desktop = await createContext(browser, { width: 1440, height: 900 });
  const mobile = await createContext(browser, undefined, "iPhone 13");

  if (!BYPASS) {
    record("browser: preview UI checks", false, "skipped — bypass secret not configured");
    await browser.close();
    return;
  }

  // /api/health is not a deployed route; trace shows Vercel SSO (302) or same-origin redirect (307).
  const healthChain = await traceRedirectChain("/api/health");
  const healthSso = healthChain.find((h) => isVercelSsoRedirect(h.location));
  const healthSameOrigin = healthChain.find((h) => isSameOriginRedirect(h.location));
  record(
    "redirect: /api/health probe",
    !healthSso,
    healthSso
      ? `Vercel SSO → ${healthSso.location}`
      : healthSameOrigin
        ? `legitimate app redirect (307/308) → ${healthSameOrigin.location}`
        : healthChain.map((h) => `${h.status}→${h.location ?? "end"}`).join(" | "),
  );

  async function loadBrowseVerify(ctx: BrowserContext, slug: string) {
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
    await page.waitForTimeout(2500);
    const ok = await assertNotVercelSso(page);
    const body = await page.content();
    const hasBrowseCopy = /enter your birthday|21\+ status|browse/i.test(body);
    const hasRetailIdv = /Signing in is not age verification/i.test(body) === false
      && /Add verified information|government id|upload/i.test(body);
    record(
      `${slug} GT browse entry`,
      ok && hasBrowseCopy && !hasRetailIdv,
      ok ? (hasBrowseCopy ? "browse DOB-first copy" : "missing browse copy") : "Vercel SSO",
    );
    if (ok) await capture(page, slug, slug.includes("mobile") ? "mobile" : "desktop");
    await page.close();
  }

  await loadBrowseVerify(desktop, "gt-browse-verify-desktop");
  await loadBrowseVerify(mobile, "gt-browse-verify-mobile");

  for (const [ctx, label] of [[desktop, "desktop"], [mobile, "mobile"]] as const) {
    const page = await ctx.newPage();
    await page.goto(`${PREVIEW_URL}/passport`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForTimeout(2500);
    const ok = await assertNotVercelSso(page);
    const html = await page.content();
    const signInCheck = evaluatePassportSignInSurface(html);
    const fileInputs = await page.locator('input[type="file"]').count();
    const idCaptureVisible = await page.getByText(/upload your id|choose a file|add verified information/i).count();
    const pass = ok && signInCheck.ok && fileInputs === 0 && idCaptureVisible === 0;
    record(
      `passport sign-in (${label})`,
      pass,
      ok
        ? (pass ? signInCheck.detail : `fileInputs=${fileInputs}; idCapture=${idCaptureVisible}; ${signInCheck.detail}`)
        : "Vercel SSO",
    );
    await capture(page, "passport-signin", label);
    await page.close();
  }

  const retailPage = await desktop.newPage();
  const retailQ = new URLSearchParams({
    partner_id: PARTNER_ID,
    policy_id: RETAIL_POLICY,
    purpose: "purchase",
    return_url: RETURN_URL,
  });
  await retailPage.goto(`${PREVIEW_URL}/partner/verify?${retailQ}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await retailPage.waitForTimeout(2500);
  const retailOk = await assertNotVercelSso(retailPage);
  const retailBody = await retailPage.content();
  const hasRetailBoundary = /Signing in is not age verification/i.test(retailBody);
  const mentionsStrongerProof = /policy result|verified information|passport/i.test(retailBody);
  record(
    "GT retail requires stronger evidence copy",
    retailOk && hasRetailBoundary && mentionsStrongerProof,
    retailOk
      ? (hasRetailBoundary ? "sign-in ≠ age verification; passport evidence required later" : "missing retail boundary copy")
      : "Vercel SSO",
  );
  await capture(retailPage, "gt-retail-verify", "desktop");
  await retailPage.close();

  await browser.close();
}

async function main() {
  if (!PREVIEW_URL) {
    console.error("PREVIEW_URL is required");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORT_DIR, { recursive: true });

  const deployedSha = process.env.DEPLOYED_SHA ?? "unknown";

  await runPolicyFailClosedChecks();
  await runPreviewApiChecks();
  await runBrowserChecks();

  const timestamp = new Date().toISOString();
  const reportPath = join(REPORT_DIR, `preview-validation-${timestamp.replace(/[:.]/g, "-")}.md`);
  const md = [
    "# PR #293 Preview Validation",
    "",
    `- **Preview:** ${PREVIEW_URL}`,
    `- **Deployed SHA:** \`${deployedSha}\``,
    `- **Bypass configured:** ${BYPASS ? "yes" : "no"}`,
    `- **Timestamp:** ${timestamp}`,
    "",
    "## Results",
    "",
    ...results.map((r) => `- ${r.ok ? "PASS" : "FAIL"} **${r.name}**: ${r.detail}`),
    "",
    firstFailure
      ? `## First failure\n\n- **${firstFailure.name}**: ${firstFailure.detail}`
      : "## First failure\n\nNone",
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
