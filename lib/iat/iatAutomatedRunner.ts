// FILE: lib/iat/iatAutomatedRunner.ts
// Read-only automated IAT companion checks — no mutations, no sign-in, no IAT pass claims.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateDeployedCompatibilityManifest } from "@/lib/integration/compatibilityManifestPreflight";
import { runIntegrationPreflight } from "@/lib/integration/preflight";
import type { PreflightDeps } from "@/lib/integration/preflightTypes";
import {
  CONFORMANCE_FIXTURE_NOW,
  CONFORMANCE_FIXTURE_PARTNER_ID,
  CONFORMANCE_FIXTURE_POLICY_ID,
  conformanceReceiptFixtureCases,
} from "@/lib/partner/partnerConformanceFixtures";
import { goodTroubleProductionVerifyUrl } from "@/lib/goodTrouble/partnerIntegration";
import { GOOD_TROUBLE_PILOT_EXAMPLE } from "@/lib/goodTrouble/pilotExample";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { SITE_URL } from "@/lib/siteUrl";
import type { IatAutomatedOptions } from "@/lib/iat/iatAutomatedConfig";

const STALE_HOST = "abraxas-app.vercel.app";

export type IatCheckStatus = "pass" | "fail" | "pending" | "human_required";

export interface IatCheck {
  id: string;
  label: string;
  status: IatCheckStatus;
  evidence: string;
}

export interface IatAutomatedResult {
  generatedAt: string;
  options: IatAutomatedOptions;
  checks: IatCheck[];
  summary: Record<IatCheckStatus, number>;
  exitCode: number;
}

export interface IatAutomatedDeps {
  fetch: typeof fetch;
  readFile: (path: string) => string;
  fileExists: (path: string) => boolean;
  env: Record<string, string | undefined>;
  now?: () => Date;
}

function iatCheck(
  id: string,
  label: string,
  status: IatCheckStatus,
  evidence: string,
): IatCheck {
  return { id, label, status, evidence };
}

function summarize(checks: IatCheck[]): Record<IatCheckStatus, number> {
  const summary: Record<IatCheckStatus, number> = {
    pass: 0,
    fail: 0,
    pending: 0,
    human_required: 0,
  };
  for (const c of checks) {
    summary[c.status] += 1;
  }
  return summary;
}

async function fetchProbe(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; text: string; json: unknown }> {
  const res = await fetchFn(`${baseUrl.replace(/\/$/, "")}${path}`, init);
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text
  }
  return { ok: res.ok, status: res.status, text, json };
}

function validateReceiptValidationContract(): IatCheck {
  const failures: string[] = [];
  const cases = conformanceReceiptFixtureCases().filter(c => !c.allowSandbox);

  for (const fixture of cases) {
    const result = validatePartnerFlowPublicReceipt(fixture.receipt, {
      partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
      policyId: CONFORMANCE_FIXTURE_POLICY_ID,
      now: CONFORMANCE_FIXTURE_NOW,
      allowSandbox: fixture.allowSandbox === true,
    });

    if (result.ok !== fixture.expectValid) {
      failures.push(`${fixture.id}: unexpected ${result.ok ? "pass" : "fail"}`);
    }
  }

  return iatCheck(
    "iat-receipt-validation-contract",
    "Public receipt validation contract (offline fail-closed fixtures)",
    failures.length === 0 ? "pass" : "fail",
    failures.length === 0
      ? `${cases.length} fixture cases: signature, partner/policy, expiry, revoked, sandbox rejected`
      : failures.join("; "),
  );
}

function validateNoStaleHostInResponses(texts: string[]): IatCheck {
  const offenders = texts.filter(t => t.includes(STALE_HOST));
  return iatCheck(
    "iat-no-stale-vercel-host",
    "Deployed responses contain no abraxas-app.vercel.app",
    offenders.length === 0 ? "pass" : "fail",
    offenders.length === 0
      ? `Checked ${texts.length} response bodies`
      : `${offenders.length} response(s) contain stale host`,
  );
}

function validateAuditTraceReadiness(
  rootDir: string,
  deps: IatAutomatedDeps,
): IatCheck {
  const scriptPath = join(rootDir, "scripts/partner-flow-trace-audit.ts");
  const migrationPath = join(rootDir, "supabase/migrations/054_partner_flow_audit_index.sql");

  if (!deps.fileExists(scriptPath)) {
    return iatCheck(
      "iat-audit-trace-readiness",
      "Partner-flow trace audit command ready",
      "fail",
      "scripts/partner-flow-trace-audit.ts missing",
    );
  }

  if (!deps.fileExists(migrationPath)) {
    return iatCheck(
      "iat-audit-trace-readiness",
      "Partner-flow trace audit command ready",
      "fail",
      "Migration 054_partner_flow_audit_index.sql missing",
    );
  }

  const hasSupabase =
    Boolean(deps.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(deps.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  return iatCheck(
    "iat-audit-trace-readiness",
    "Partner-flow trace audit command ready",
    "pass",
    hasSupabase
      ? "npm run audit:partner-flow-trace -- ft_vr_<verification_request_id> (Supabase creds present)"
      : "Command available; set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY after Scenario A for live trace audit",
  );
}

function validateScenarioAHumanGate(): IatCheck {
  return iatCheck(
    "iat-scenario-a-human-execution",
    "Scenario A full browser flow (IAT)",
    "human_required",
    "16 human steps — see scenario_a_evidence_template.human_steps_required in report",
  );
}

export async function runIatAutomated(
  options: IatAutomatedOptions,
  deps: IatAutomatedDeps,
  rootDir = process.cwd(),
): Promise<IatAutomatedResult> {
  const checks: IatCheck[] = [];
  const responseBodies: string[] = [];
  const generatedAt = (deps.now?.() ?? new Date()).toISOString();

  // Canonical origin
  let originOk = false;
  try {
    const origin = new URL(options.baseUrl).origin;
    originOk = !options.productionMode || origin === new URL(SITE_URL).origin;
    checks.push(
      iatCheck(
        "iat-canonical-origin",
        "Abraxas base URL uses canonical production origin",
        originOk && !options.baseUrl.includes(STALE_HOST) ? "pass" : "fail",
        originOk
          ? `origin=${origin}`
          : `origin=${origin} expected ${new URL(SITE_URL).origin}`,
      ),
    );
  } catch {
    checks.push(
      iatCheck(
        "iat-canonical-origin",
        "Abraxas base URL uses canonical production origin",
        "fail",
        `Invalid base URL: ${options.baseUrl}`,
      ),
    );
  }

  // Compatibility manifest
  try {
    const manifestFetch = await fetchProbe(
      deps.fetch,
      options.baseUrl,
      PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH,
    );
    responseBodies.push(manifestFetch.text);
    checks.push(
      ...validateDeployedCompatibilityManifest({
        productionMode: options.productionMode,
        baseUrl: options.baseUrl,
        httpOk: manifestFetch.ok,
        rawText: manifestFetch.text,
        liveJson: manifestFetch.json,
      }).checks.map(c =>
        iatCheck(
          c.id.replace(/^http-/, "iat-"),
          c.label,
          c.status === "blocked" ? "pending" : c.status,
          c.evidence,
        ),
      ),
    );
  } catch (e) {
    checks.push(
      iatCheck(
        "iat-compatibility-manifest-endpoint",
        "Deployed compatibility manifest reachable",
        options.productionMode ? "fail" : "pending",
        e instanceof Error ? e.message : String(e),
      ),
    );
  }

  // Good Trouble verify URL shape
  const verifyUrl = goodTroubleProductionVerifyUrl();
  const verifyUrlOk =
    verifyUrl.includes(`partner_id=${options.partnerId}`) &&
    verifyUrl.includes(`policy_id=${options.policyId}`) &&
    verifyUrl.includes(encodeURIComponent(options.returnUrl)) &&
    verifyUrl.startsWith(options.baseUrl);

  checks.push(
    iatCheck(
      "iat-good-trouble-verify-url",
      "Good Trouble pilot verify URL is canonical",
      verifyUrlOk ? "pass" : "fail",
      verifyUrlOk
        ? verifyUrl
        : `Expected GT pilot verify URL with partner/policy/return_url on ${options.baseUrl}`,
    ),
  );

  // Good Trouble checkout page
  try {
    const gt = await fetchProbe(deps.fetch, options.baseUrl, "/good-trouble");
    responseBodies.push(gt.text);
    const hasButton =
      gt.ok &&
      gt.text.includes("Continue with Abraxas") &&
      gt.text.includes("/partner/verify");
    checks.push(
      iatCheck(
        "iat-good-trouble-checkout",
        "Good Trouble checkout exposes Continue with Abraxas",
        hasButton ? "pass" : "fail",
        hasButton
          ? "GET /good-trouble contains Continue with Abraxas + partner/verify"
          : `GET /good-trouble → HTTP ${gt.status}; button or link missing`,
      ),
    );
  } catch (e) {
    checks.push(
      iatCheck(
        "iat-good-trouble-checkout",
        "Good Trouble checkout exposes Continue with Abraxas",
        "fail",
        e instanceof Error ? e.message : String(e),
      ),
    );
  }

  // Public route reachability
  const publicRoutes: Array<{ id: string; label: string; path: string }> = [
    { id: "iat-route-landing", label: "Landing page reachable", path: "/" },
    { id: "iat-route-passport", label: "Passport page reachable", path: "/passport" },
    {
      id: "iat-route-partner-verify",
      label: "Partner verify hub reachable",
      path: `/partner/verify?partner_id=${options.partnerId}&policy_id=${options.policyId}&return_url=${encodeURIComponent(options.returnUrl)}`,
    },
    { id: "iat-route-good-trouble-enter", label: "Good Trouble enter callback reachable", path: "/good-trouble/enter" },
    { id: "iat-route-docs-partner-flow", label: "Partner Flow docs reachable", path: "/docs/partner-flow" },
  ];

  for (const route of publicRoutes) {
    try {
      const probe = await fetchProbe(deps.fetch, options.baseUrl, route.path);
      responseBodies.push(probe.text);
      checks.push(
        iatCheck(
          route.id,
          route.label,
          probe.ok ? "pass" : "fail",
          `GET ${route.path.split("?")[0]} → HTTP ${probe.status}`,
        ),
      );
    } catch (e) {
      checks.push(
        iatCheck(route.id, route.label, "fail", e instanceof Error ? e.message : String(e)),
      );
    }
  }

  // Trust signing status
  try {
    const trust = await fetchProbe(
      deps.fetch,
      options.baseUrl,
      "/api/trust/status?sui=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    );
    responseBodies.push(trust.text);
    const signing = (trust.json as { infrastructure?: { signing_configured?: boolean } })
      ?.infrastructure?.signing_configured;
    checks.push(
      iatCheck(
        "iat-trust-signing",
        "Production trust signing configured",
        signing === true ? "pass" : options.productionMode ? "fail" : "pending",
        `GET /api/trust/status signing_configured=${String(signing)}`,
      ),
    );
  } catch (e) {
    checks.push(
      iatCheck(
        "iat-trust-signing",
        "Production trust signing configured",
        "fail",
        e instanceof Error ? e.message : String(e),
      ),
    );
  }

  // Partner-flow auth gates (read-only — no session)
  for (const [id, label, path] of [
    ["iat-partner-flow-evaluate-auth", "Partner-flow evaluate requires session", "/api/v1/partner-flow/evaluate"],
    ["iat-partner-flow-complete-auth", "Partner-flow complete requires session", "/api/v1/partner-flow/complete"],
    ["iat-partner-flow-refresh-auth", "Partner-flow refresh requires session", "/api/v1/partner-flow/refresh"],
  ] as const) {
    try {
      const probe = await fetchProbe(deps.fetch, options.baseUrl, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: options.partnerId,
          policy_id: options.policyId,
          return_url: options.returnUrl,
        }),
      });
      responseBodies.push(probe.text);
      checks.push(
        iatCheck(
          id,
          label,
          probe.status === 401 ? "pass" : "fail",
          `POST ${path} → HTTP ${probe.status} (expected 401 without session)`,
        ),
      );
    } catch (e) {
      checks.push(iatCheck(id, label, "fail", e instanceof Error ? e.message : String(e)));
    }
  }

  // Stale host sweep
  checks.push(validateNoStaleHostInResponses(responseBodies));

  // Offline receipt contract
  checks.push(validateReceiptValidationContract());

  // Integration preflight (static + live)
  const preflightDeps: PreflightDeps = {
    fetch: deps.fetch,
    env: deps.env,
    readFile: deps.readFile,
    fileExists: deps.fileExists,
  };
  const preflight = await runIntegrationPreflight(
    {
      baseUrl: options.baseUrl,
      partnerId: options.partnerId,
      policyId: options.policyId,
      returnUrl: options.returnUrl,
      productionMode: options.productionMode,
    },
    preflightDeps,
    rootDir,
  );

  const preflightFailures = preflight.checks.filter(c => c.status === "fail");
  checks.push(
    iatCheck(
      "iat-integration-preflight",
      "Integration preflight (read-only)",
      preflightFailures.length === 0 ? "pass" : "fail",
      preflightFailures.length === 0
        ? `pass=${preflight.summary.pass}, pending=${preflight.summary.pending}, fail=0`
        : preflightFailures.map(c => `${c.id}: ${c.evidence}`).join("; "),
    ),
  );

  // Pilot example labeling (informational pass)
  checks.push(
    iatCheck(
      "iat-good-trouble-pilot-labeled",
      "Good Trouble retained as labeled pilot example only",
      "pass",
      `Pilot example partner_id=${GOOD_TROUBLE_PILOT_EXAMPLE.partnerId}; generic protocols use PARTNER_FLOW_RP_* env`,
    ),
  );

  // Audit trace readiness
  checks.push(validateAuditTraceReadiness(rootDir, deps));

  // Human-required Scenario A gate — always present
  checks.push(validateScenarioAHumanGate());

  const summary = summarize(checks);
  const exitCode = summary.fail > 0 ? 1 : 0;

  return {
    generatedAt,
    options,
    checks,
    summary,
    exitCode,
  };
}

export function formatIatAutomatedConsoleReport(result: IatAutomatedResult): string {
  const lines: string[] = [
    "=== Abraxas automated IAT companion ===",
    "",
    `generated_at: ${result.generatedAt}`,
    `base_url: ${result.options.baseUrl}`,
    `partner_id: ${result.options.partnerId}`,
    `policy_id: ${result.options.policyId}`,
    "",
    "DISCLAIMER: Read-only automated checks only. Does NOT claim full IAT completion.",
    "",
  ];

  for (const c of result.checks) {
    const icon =
      c.status === "pass"
        ? "PASS"
        : c.status === "fail"
          ? "FAIL"
          : c.status === "human_required"
            ? "HUMAN_REQUIRED"
            : "PENDING";
    lines.push(`${icon.padEnd(14)} ${c.label}`);
    lines.push(`               ${c.evidence}`);
  }

  lines.push("");
  lines.push(
    `--- Summary ---`,
    `pass: ${result.summary.pass}, fail: ${result.summary.fail}, pending: ${result.summary.pending}, human_required: ${result.summary.human_required}`,
  );
  lines.push("");
  lines.push("IAT pass claimed: NO — Scenario A requires human browser execution.");

  return lines.join("\n");
}

export function defaultIatAutomatedDeps(
  env: Record<string, string | undefined> = process.env,
): IatAutomatedDeps {
  return {
    fetch,
    env,
    readFile: path => readFileSync(path, "utf8"),
    fileExists: path => existsSync(path),
  };
}
