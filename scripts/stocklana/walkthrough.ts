#!/usr/bin/env npx tsx
// FILE: scripts/stocklana/walkthrough.ts
// Stocklana preview walkthrough — API + browser checks with optional Vercel bypass.

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { buildVercelBypassHeaders, readVercelProtectionBypass } from "@/lib/stocklana/vercelBypass";

const PREVIEW_DEFAULT =
  "https://abraxas-app-git-cursor-st-21cf4b-worldlabsprotocol-uxs-projects.vercel.app";

type StepStatus = "pass" | "fail" | "blocked" | "human_required" | "skip";

interface StepResult {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

function step(id: string, label: string, status: StepStatus, detail?: string): StepResult {
  return { id, label, status, detail };
}

function isVercelSsoRedirect(status: number, headers: Headers): boolean {
  const location = headers.get("location") ?? "";
  return (status === 302 || status === 307) && location.includes("vercel.com/sso-api");
}

async function fetchJson(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
): Promise<{ status: number; body: unknown; blocked: boolean }> {
  const res = await fetch(`${baseUrl}${path}`, { headers, redirect: "manual" });
  if (isVercelSsoRedirect(res.status, res.headers)) {
    return { status: res.status, body: null, blocked: true };
  }
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, blocked: false };
}

export async function runStocklanaWalkthrough(): Promise<{
  steps: StepResult[];
  reportPath: string;
  overall: "PASS" | "FAIL" | "BLOCKED";
}> {
  const baseUrl = (process.env.STOCKLANA_PREVIEW_URL ?? PREVIEW_DEFAULT).replace(/\/$/, "");
  const bypass = readVercelProtectionBypass();
  const headers = buildVercelBypassHeaders(bypass);
  const testId = `stocklana-walkthrough-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const steps: StepResult[] = [];

  if (!bypass) {
    steps.push(
      step(
        "precondition-bypass",
        "VERCEL_PROTECTION_BYPASS available in agent runtime",
        "blocked",
        "Set VERCEL_PROTECTION_BYPASS for preview browser/API access",
      ),
    );
  } else {
    steps.push(step("precondition-bypass", "VERCEL_PROTECTION_BYPASS available in agent runtime", "pass"));
  }

  const identity = await fetchJson(baseUrl, "/api/launchpad/staging/environment", headers);
  if (identity.blocked) {
    steps.push(step("preview-reachable", "Preview reachable without Vercel SSO", "blocked"));
  } else if (identity.status === 404) {
    steps.push(
      step(
        "demo-supabase-binding",
        "Preview uses DEMO Supabase (launchpad identity route optional on Stocklana branch)",
        "skip",
        "identity route not on this branch",
      ),
    );
    steps.push(step("preview-reachable", "Preview reachable without Vercel SSO", "pass", `stocklana branch`));
  } else {
    const body = identity.body as { supabase_project_ref?: string; deployment_environment?: string };
    steps.push(
      step(
        "demo-supabase-binding",
        "Preview bound to DEMO Supabase ocntwbxarpjeixdnzide",
        body.supabase_project_ref === "ocntwbxarpjeixdnzide" ? "pass" : "fail",
        `ref=${body.supabase_project_ref ?? "missing"}`,
      ),
    );
    steps.push(step("preview-reachable", "Preview reachable without Vercel SSO", "pass"));
  }

  const assets = await fetchJson(baseUrl, "/api/stocklana/assets", headers);
  if (assets.blocked) {
    steps.push(step("assets-api", "GET /api/stocklana/assets", "blocked"));
  } else {
    const list = (assets.body as { assets?: unknown[] })?.assets;
    steps.push(
      step(
        "assets-api",
        "GET /api/stocklana/assets returns curated catalog",
        assets.status === 200 && Array.isArray(list) && list.length >= 2 ? "pass" : "fail",
        `status=${assets.status} count=${Array.isArray(list) ? list.length : 0}`,
      ),
    );
  }

  const mintVerify = await fetchJson(baseUrl, "/api/stocklana/assets?asset=openai-prestocks&verify=1", headers);
  if (!mintVerify.blocked) {
    const onChain = (mintVerify.body as { on_chain?: { ok?: boolean; detail?: string } })?.on_chain;
    steps.push(
      step(
        "mint-verify",
        "On-chain Token-2022 mint check (does not prove issuer identity)",
        mintVerify.status === 200 && onChain?.ok ? "pass" : "fail",
        onChain?.detail ?? `status=${mintVerify.status}`,
      ),
    );
  }

  const callbackMissing = await fetchJson(baseUrl, "/stocklana/callback", headers);
  if (!callbackMissing.blocked) {
    steps.push(
      step(
        "callback-missing-receipt",
        "Callback without receipt_id shows error state (browser)",
        callbackMissing.status === 200 ? "human_required" : "fail",
        "Requires browser render — run Playwright step",
      ),
    );
  }

  const eligibilityRes = await fetch(`${baseUrl}/api/stocklana/eligibility`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({}),
    redirect: "manual",
  });
  if (isVercelSsoRedirect(eligibilityRes.status, eligibilityRes.headers)) {
    steps.push(step("eligibility-missing-body", "POST /api/stocklana/eligibility without receipt_id returns 400", "blocked"));
  } else {
    steps.push(
      step(
        "eligibility-missing-body",
        "POST /api/stocklana/eligibility without receipt_id returns 400",
        eligibilityRes.status === 400 ? "pass" : "fail",
        `status=${eligibilityRes.status}`,
      ),
    );
  }

  if (bypass) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      extraHTTPHeaders: headers,
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(`${baseUrl}/stocklana`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const stocklanaTitle = await page.getByText("Stocklana", { exact: false }).first().isVisible().catch(() => false);
    steps.push(
      step(
        "ui-stocklana-loads",
        "/stocklana renders Stocklana demo shell",
        stocklanaTitle ? "pass" : "fail",
        page.url(),
      ),
    );

    const mintLabel = await page.getByText("Token-2022 mint verified", { exact: false }).isVisible({ timeout: 45_000 }).catch(() => false)
      || await page.getByText("on-chain:", { exact: false }).isVisible().catch(() => false);
    steps.push(
      step(
        "ui-mint-status",
        "Mint verification status visible in UI",
        mintLabel ? "pass" : "fail",
      ),
    );

    const verifyBtn = page.getByRole("link", { name: /Verify eligibility with Abraxas/i });
    const verifyHref = await verifyBtn.getAttribute("href").catch(() => null);
    steps.push(
      step(
        "hosted-verify-link",
        "Hosted Abraxas verify link targets /partner/verify with stocklana-demo",
        verifyHref?.includes("/partner/verify") && verifyHref.includes("stocklana-demo") ? "pass" : "fail",
        verifyHref ? "href present" : "href missing",
      ),
    );

    await page.goto(`${baseUrl}/stocklana/callback`, { waitUntil: "domcontentloaded" });
    await page.getByText(/missing_receipt_id|Error|Waiting/i).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => undefined);
    const callbackError = await page.getByText(/missing_receipt_id|Error/i).first().isVisible().catch(() => false);
    steps.push(
      step(
        "ui-callback-missing-receipt",
        "Callback without receipt shows error state",
        callbackError ? "pass" : "fail",
      ),
    );

    const shotDir = resolve(process.cwd(), "docs/stocklana/screenshots", testId);
    mkdirSync(shotDir, { recursive: true });
    await page.screenshot({ path: resolve(shotDir, "stocklana-callback-missing-receipt.png"), fullPage: true });

    steps.push(
      step(
        "console-clean",
        "No browser console errors on /stocklana",
        consoleErrors.length === 0 ? "pass" : "fail",
        consoleErrors.slice(0, 3).join("; ") || "none",
      ),
    );

    steps.push(
      step(
        "human-passport-verify",
        "Complete Abraxas Passport hosted verification (zkLogin + IDV)",
        "human_required",
        "Cannot automate holder identity — operator completes verify → receipt → callback",
      ),
    );
    steps.push(
      step(
        "human-callback-receipt",
        "Callback with signed receipt shows permitted/denied UI",
        "human_required",
        "Requires real verification receipt_id in callback query",
      ),
    );

    await context.close();
    await browser.close();
  }

  const hasBlocked = steps.some((s) => s.status === "blocked");
  const hasFail = steps.some((s) => s.status === "fail");
  const overall: "PASS" | "FAIL" | "BLOCKED" = hasBlocked ? "BLOCKED" : hasFail ? "FAIL" : "PASS";

  const reportDir = resolve(process.cwd(), "reports/stocklana-walkthrough");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = resolve(reportDir, `${testId}.md`);
  const lines = [
    `# Stocklana walkthrough report`,
    ``,
    `**Overall:** ${overall}`,
    `**Preview:** ${baseUrl}`,
    `**Bypass configured:** ${bypass ? "yes (value redacted)" : "no"}`,
    ``,
    `## Steps`,
    ...steps.map((s) => `- [${s.status}] ${s.id}: ${s.label}${s.detail ? ` — ${s.detail}` : ""}`),
  ];
  writeFileSync(reportPath, lines.join("\n"));

  return { steps, reportPath, overall };
}

async function main() {
  const { overall, reportPath } = await runStocklanaWalkthrough();
  console.log(`Stocklana walkthrough: ${overall}`);
  console.log(`Report: ${reportPath}`);
  process.exit(overall === "PASS" ? 0 : 1);
}

void main();
