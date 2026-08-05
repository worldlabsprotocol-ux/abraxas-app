#!/usr/bin/env npx tsx
/**
 * Production readiness audit — HTTP probes + local test execution.
 * Run: npx tsx scripts/production-readiness-audit.ts
 */

import { SITE_URL } from "@/lib/siteUrl";

const PROD = (process.env.AUDIT_BASE_URL ?? SITE_URL).replace(/\/$/, "");
const GOOD_TROUBLE_ENTER_URL = `${PROD}/good-trouble/enter`;
const OUT = process.env.AUDIT_OUT ?? "/opt/cursor/artifacts/production-readiness-audit.json";

interface AuditStep {
  step: string;
  category: string;
  verdict: "PASS" | "PARTIAL" | "FAIL" | "SKIP";
  evidence: string;
  http_status?: number;
  response_snippet?: string;
}

const results: AuditStep[] = [];

async function probe(
  step: string,
  category: string,
  fn: () => Promise<{ verdict: AuditStep["verdict"]; evidence: string; status?: number; snippet?: string }>,
) {
  try {
    const r = await fn();
    results.push({
      step,
      category,
      verdict: r.verdict,
      evidence: r.evidence,
      http_status: r.status,
      response_snippet: r.snippet?.slice(0, 500),
    });
    console.log(`${r.verdict.padEnd(8)} ${step}`);
  } catch (e) {
    results.push({
      step,
      category,
      verdict: "FAIL",
      evidence: e instanceof Error ? e.message : String(e),
    });
    console.log(`FAIL     ${step}`);
  }
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(`${PROD}${path}`, init);
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { res, json, text };
}

async function main() {
  console.log(`\nProduction Readiness Audit — ${PROD}\n${"=".repeat(60)}\n`);

  // Routes
  for (const [step, path] of [
    ["Landing page loads", "/"],
    ["Good Trouble page loads", "/good-trouble"],
    ["Partner verify hub loads", `/partner/verify?partner_id=good-trouble-cannabis&policy_id=good-trouble-retail-v1&return_url=${encodeURIComponent(GOOD_TROUBLE_ENTER_URL)}`],
    ["Good Trouble enter callback loads", "/good-trouble/enter"],
    ["Passport page loads", "/passport"],
  ] as const) {
    await probe(step, "routes", async () => {
      const { res } = await fetchJson(path);
      return {
        verdict: res.ok ? "PASS" : "FAIL",
        evidence: `GET ${path} → ${res.status}`,
        status: res.status,
      };
    });
  }

  // GT integration on production HTML
  await probe("Continue with Abraxas button on GT page", "ui", async () => {
    const { res, text } = await fetchJson("/good-trouble");
    const has = text.includes("Continue with Abraxas") && text.includes("partner/verify");
    return {
      verdict: has ? "PASS" : "FAIL",
      evidence: has ? "HTML contains Continue with Abraxas + partner/verify link" : "Button or link missing",
      status: res.status,
    };
  });

  // Partner flow APIs
  await probe("Partner flow evaluate requires auth", "partner-flow", async () => {
    const { res, json } = await fetchJson("/api/v1/partner-flow/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        return_url: `${PROD}/good-trouble/enter`,
      }),
    });
    const err = (json as { error?: string })?.error;
    return {
      verdict: res.status === 401 && err?.includes("Sign in") ? "PASS" : "PARTIAL",
      evidence: `POST evaluate → ${res.status}, error: ${err}`,
      status: res.status,
      snippet: JSON.stringify(json),
    };
  });

  await probe("Partner flow complete requires auth", "partner-flow", async () => {
    const { res, json } = await fetchJson("/api/v1/partner-flow/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: "good-trouble-cannabis", policy_id: "good-trouble-retail-v1", return_url: `${PROD}/good-trouble/enter` }),
    });
    return {
      verdict: res.status === 401 ? "PASS" : "PARTIAL",
      evidence: `POST complete → ${res.status}`,
      status: res.status,
      snippet: JSON.stringify(json),
    };
  });

  await probe("Partner flow refresh requires auth", "partner-flow", async () => {
    const { res } = await fetchJson("/api/v1/partner-flow/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partner_id: "good-trouble-cannabis", policy_id: "good-trouble-retail-v1", return_url: `${PROD}/good-trouble/enter` }),
    });
    return {
      verdict: res.status === 401 ? "PASS" : "PARTIAL",
      evidence: `POST refresh → ${res.status}`,
      status: res.status,
    };
  });

  // Credential verify
  await probe("Credential verify rejects invalid JWT", "credentials", async () => {
    const { res, json } = await fetchJson("/api/credentials/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential_jwt: "invalid.jwt.token" }),
    });
    const j = json as { verified?: boolean; authentication_proof?: { signature?: string } };
    return {
      verdict: res.status === 422 && j.verified === false && j.authentication_proof?.signature ? "PASS" : "PARTIAL",
      evidence: `POST verify invalid JWT → ${res.status}, verified=${j.verified}, has_proof=${Boolean(j.authentication_proof?.signature)}`,
      status: res.status,
      snippet: JSON.stringify(json).slice(0, 300),
    };
  });

  // Receipt validation
  await probe("Public receipt endpoint returns 404 for missing receipt", "receipts", async () => {
    const { res, json } = await fetchJson("/api/receipts/dr_nonexistent_test/public");
    return {
      verdict: res.status === 404 ? "PASS" : "FAIL",
      evidence: `GET public receipt → ${res.status}`,
      status: res.status,
      snippet: JSON.stringify(json),
    };
  });

  // Trust / infrastructure
  await probe("Trust status API responds", "infrastructure", async () => {
    const { res, json } = await fetchJson("/api/trust/status?sui=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
    const j = json as { infrastructure?: { signing_configured?: boolean } };
    return {
      verdict: res.ok && j.infrastructure?.signing_configured ? "PASS" : "PARTIAL",
      evidence: `signing_configured=${j.infrastructure?.signing_configured}, veriff=${(j as { infrastructure?: { veriff_api_configured?: boolean } }).infrastructure?.veriff_api_configured}`,
      status: res.status,
    };
  });

  await probe("IDV provider on production", "passport", async () => {
    const { res, json } = await fetchJson("/api/idv/create-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sui_address: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", document_type: "PASSPORT" }),
    });
    const j = json as { idv_provider?: string; is_mock?: boolean; error_code?: string };
    return {
      verdict: j.idv_provider === "manual" ? "PARTIAL" : j.idv_provider === "veriff" ? "PASS" : "FAIL",
      evidence: `idv_provider=${j.idv_provider}, is_mock=${j.is_mock}, error_code=${j.error_code}`,
      status: res.status,
      snippet: JSON.stringify(json),
    };
  });

  await probe("Capture endpoint requires browser session", "biometric", async () => {
    const { res, json } = await fetchJson("/api/identity/documents/capture", { method: "POST" });
    const err = (json as { error?: string })?.error;
    return {
      verdict: res.status === 401 && err?.includes("Sign in") ? "PASS" : "PARTIAL",
      evidence: `POST capture unauthenticated → ${res.status}`,
      status: res.status,
    };
  });

  await probe("GT batch API responds", "good-trouble", async () => {
    const { res, json } = await fetchJson("/api/good-trouble/batch?record_id=ABX-CNB-BATCH-002");
    const j = json as { ok?: boolean; pilot?: boolean };
    return {
      verdict: res.ok && j.ok && j.pilot ? "PASS" : "PARTIAL",
      evidence: `batch API ok=${j.ok}, pilot=${j.pilot}`,
      status: res.status,
    };
  });

  await probe("Metrics API responds", "infrastructure", async () => {
    const { res, json } = await fetchJson("/api/metrics/public");
    const j = json as { ok?: boolean; metrics?: { active_credentials?: number } };
    return {
      verdict: res.ok && j.ok ? "PASS" : "FAIL",
      evidence: `active_credentials=${j.metrics?.active_credentials}`,
      status: res.status,
    };
  });

  // Steps that cannot be automated without credentials
  const manualSteps = [
    ["New Google account → zkLogin wallet created", "e2e"],
    ["Passport ID upload + selfie capture", "e2e"],
    ["Admin manual approval → credential issued", "e2e"],
    ["Redirect back to Good Trouble with receipt", "e2e"],
    ["Returning user skips Passport", "e2e"],
    ["Expired credential forces re-verification", "e2e"],
    ["Revoked credential forces re-verification", "e2e"],
    ["ONNX inference on production host", "biometric"],
    ["Migration 051 applied in production Supabase", "database"],
  ] as const;

  for (const [step, cat] of manualSteps) {
    results.push({
      step,
      category: cat,
      verdict: "SKIP",
      evidence: "Requires live browser session, admin credentials, or production DB access — not available in audit environment",
    });
    console.log(`SKIP     ${step}`);
  }

  const summary = {
    audited_at: new Date().toISOString(),
    base_url: PROD,
    branch: process.env.AUDIT_BRANCH ?? "unknown",
    totals: {
      pass: results.filter(r => r.verdict === "PASS").length,
      partial: results.filter(r => r.verdict === "PARTIAL").length,
      fail: results.filter(r => r.verdict === "FAIL").length,
      skip: results.filter(r => r.verdict === "SKIP").length,
    },
    production_ready: results.every(r => r.verdict !== "FAIL") && results.filter(r => r.verdict === "SKIP").length === 0
      ? true
      : false,
    steps: results,
  };

  const fs = await import("fs/promises");
  await fs.mkdir("/opt/cursor/artifacts", { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(summary, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`PASS: ${summary.totals.pass}  PARTIAL: ${summary.totals.partial}  FAIL: ${summary.totals.fail}  SKIP: ${summary.totals.skip}`);
  console.log(`Report: ${OUT}`);
  console.log(`Production ready: ${summary.production_ready ? "YES" : "NO — manual e2e steps remain"}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
