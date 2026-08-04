#!/usr/bin/env npx tsx
// FILE: scripts/beta-gate-preflight.ts
// Pre-IAT deployment and gate readiness checks (no browser automation).

import { execSync } from "child_process";

const BASE = process.env.AUDIT_BASE_URL ?? process.env.BETA_GATE_BASE_URL ?? "";
const REQUIRED_ENV = [
  "ABRAXAS_SIGNING_KEY",
  "ABRAXAS_BROWSER_SESSION_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

interface GateRow {
  gate: string;
  status: "pass" | "fail" | "pending" | "blocked";
  evidence: string;
}

const results: GateRow[] = [];

function record(gate: string, status: GateRow["status"], evidence: string) {
  results.push({ gate, status, evidence });
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : status === "blocked" ? "⊘" : "…";
  console.log(`${icon} ${gate}: ${evidence}`);
}

async function fetchStatus(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

async function main() {
  console.log("=== Abraxas beta gate preflight ===\n");

  // Local regression subset
  try {
    execSync(
      "npm test -- lib/protocol/compatibility.test.ts lib/decisionReceipts/validityResolver.test.ts lib/partner/partnerFlowAudit.test.ts lib/partner/partnerFlowRoutes.test.ts lib/goodTrouble/goodTroubleRetailWiring.integration.test.ts",
      { stdio: "pipe", encoding: "utf8" },
    );
    record("Regression subset (protocol + validity + partner audit + GT wiring)", "pass", "vitest passed");
  } catch (e) {
    record("Regression subset", "fail", e instanceof Error ? e.message : String(e));
  }

  try {
    execSync("npx tsx scripts/verify-trust-decision-fixture.ts", { stdio: "pipe", encoding: "utf8" });
    record("Trust Decision fixture verification", "pass", "scripts/verify-trust-decision-fixture.ts");
  } catch {
    record("Trust Decision fixture verification", "fail", "fixture script failed");
  }

  const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
  if (missingEnv.length === 0) {
    record("Required secrets (local env)", "pass", REQUIRED_ENV.join(", "));
  } else {
    record("Required secrets (local env)", "pending", `Missing: ${missingEnv.join(", ")}`);
  }

  if (!BASE) {
    record("Production deployment smoke", "pending", "Set AUDIT_BASE_URL or BETA_GATE_BASE_URL");
    record("Production IAT", "pending", "Human execution required");
    record("External security review", "blocked", "No independent report artifact");
    record("v1.0.0-beta.0 tag", "pending", "Do not tag until IAT + compatibility freeze");
  } else {
    try {
      const { status, json } = await fetchStatus("/api/trust/status?sui=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
      const signing = (json as { infrastructure?: { signing_configured?: boolean } })?.infrastructure?.signing_configured;
      record("Production signing configured", signing ? "pass" : "fail", `GET /api/trust/status signing=${signing}`);
    } catch (e) {
      record("Production deployment smoke", "fail", String(e));
    }

    try {
      const { status } = await fetchStatus("/api/v1/partner-flow/evaluate");
      record("Partner-flow evaluate reachable", status === 401 || status === 405 ? "pass" : "pending", `HTTP ${status}`);
    } catch (e) {
      record("Partner-flow evaluate reachable", "fail", String(e));
    }

    record("Production IAT", "pending", "Human execution — docs/PRODUCTION_WALKTHROUGH_CHECKLIST.md");
    record("External security review", "blocked", "No independent report artifact");
    record("v1.0.0-beta.0 tag", "pending", "Awaiting IAT pass + RELEASE_DECISION.md");
  }

  console.log("\n--- Summary ---");
  const fail = results.filter(r => r.status === "fail").length;
  const pending = results.filter(r => r.status === "pending").length;
  console.log(`pass: ${results.filter(r => r.status === "pass").length}, fail: ${fail}, pending: ${pending}, blocked: ${results.filter(r => r.status === "blocked").length}`);
  console.log("\nSee docs/BETA_GATE_EVIDENCE.md for full gate matrix.");

  if (fail > 0) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
