// FILE: lib/partner/partnerConformanceHarness.ts
// Multi-partner Partner Flow conformance harness — read-only live probes + offline fixtures.

import { validateDeployedCompatibilityManifest } from "@/lib/integration/compatibilityManifestPreflight";
import { PARTNER_CALLBACK_PARAMS } from "@/lib/protocol/compatibility";
import { PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import {
  CONFORMANCE_FIXTURE_NOW,
  CONFORMANCE_FIXTURE_PARTNER_ID,
  CONFORMANCE_FIXTURE_POLICY_ID,
  conformanceReceiptFixtureCases,
} from "@/lib/partner/partnerConformanceFixtures";
import { validatePartnerReturnUrlFormat } from "@/lib/partner/referenceRelyingPartyConfig";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { AbraxasPartnerKit, parsePartnerCallbackParams } from "@/lib/partner/integrationKit";
import { resolvePolicyPack, POLICY_PACK_LIST } from "@/lib/partner/launchpad/policyPacks";
import { SITE_URL } from "@/lib/siteUrl";

const STALE_HOST = "abraxas-app.vercel.app";

export type ConformanceStatus = "pass" | "fail" | "pending";

export interface ConformanceCheck {
  id: string;
  label: string;
  status: ConformanceStatus;
  evidence: string;
}

export interface PartnerConformanceOptions {
  baseUrl: string;
  partnerId: string;
  policyId: string;
  returnUrl: string;
  productionMode: boolean;
  allowSandbox: boolean;
  skipLiveManifest: boolean;
}

export interface PartnerConformanceResult {
  checks: ConformanceCheck[];
  summary: Record<ConformanceStatus, number>;
  options: PartnerConformanceOptions;
  exitCode: number;
}

export interface PartnerConformanceDeps {
  fetch: typeof fetch;
}

function check(
  id: string,
  label: string,
  status: ConformanceStatus,
  evidence: string,
): ConformanceCheck {
  return { id, label, status, evidence };
}

function summarize(checks: ConformanceCheck[]): Record<ConformanceStatus, number> {
  const summary: Record<ConformanceStatus, number> = { pass: 0, fail: 0, pending: 0 };
  for (const c of checks) {
    summary[c.status] += 1;
  }
  return summary;
}

async function fetchJson(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
): Promise<{ ok: boolean; text: string; json: unknown }> {
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetchFn(url);
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: res.ok, text, json };
}

function validateReceiptFixtures(options: PartnerConformanceOptions): ConformanceCheck[] {
  const checks: ConformanceCheck[] = [];
  const cases = conformanceReceiptFixtureCases().filter(
    c => !c.allowSandbox || options.allowSandbox,
  );

  const failures: string[] = [];
  for (const fixture of cases) {
    const result = validatePartnerFlowPublicReceipt(fixture.receipt, {
      partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
      policyId: CONFORMANCE_FIXTURE_POLICY_ID,
      now: CONFORMANCE_FIXTURE_NOW,
      allowSandbox: fixture.allowSandbox === true,
    });

    if (result.ok !== fixture.expectValid) {
      failures.push(
        `${fixture.id}: expected ${fixture.expectValid ? "valid" : "invalid"}, got ${result.ok ? "valid" : "invalid"}`,
      );
      continue;
    }

    if (!fixture.expectValid && fixture.expectedReasonPrefix) {
      const matched = result.errors.some(e =>
        e === fixture.expectedReasonPrefix || e.startsWith(`${fixture.expectedReasonPrefix}:`),
      );
      if (!matched) {
        failures.push(
          `${fixture.id}: expected reason ${fixture.expectedReasonPrefix}, got ${result.errors.join(",")}`,
        );
      }
    }
  }

  checks.push(
    check(
      "conformance-receipt-fail-closed-fixtures",
      "Public receipt validation rejects unsafe fixtures (fail-closed)",
      failures.length === 0 ? "pass" : "fail",
      failures.length === 0
        ? `${cases.length} fixture cases validated (signature, partner/policy, expiry, revoked, sandbox)`
        : failures.join("; "),
    ),
  );

  return checks;
}

function kitConformanceChecks(options: PartnerConformanceOptions): ConformanceCheck[] {
  const productionKit = new AbraxasPartnerKit({
    partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
    policyId: CONFORMANCE_FIXTURE_POLICY_ID,
    environment: "production",
  });
  const sandboxKit = new AbraxasPartnerKit({
    partnerId: CONFORMANCE_FIXTURE_PARTNER_ID,
    policyId: CONFORMANCE_FIXTURE_POLICY_ID,
    environment: "sandbox",
  });
  const fixtures = Object.fromEntries(conformanceReceiptFixtureCases().map((item) => [item.id, item]));
  const checks: ConformanceCheck[] = [];

  const pii = parsePartnerCallbackParams(new URLSearchParams({ receipt_id: "dr_x", email: "a@b.c" }));
  checks.push(check(
    "kit-callback-no-pii",
    "Callback parameters reject PII keys (offline fixture verification)",
    !pii.ok ? "pass" : "fail",
    !pii.ok ? pii.errors.join(", ") : "PII keys were accepted",
  ));

  const approved = productionKit.evaluateFetchedReceipt(fixtures["valid-production-receipt"]!.receipt!);
  checks.push(check(
    "kit-signed-receipt",
    "Offline fixture verification: signed receipt permits a valid production receipt",
    approved.outcome === "permitted" ? "pass" : "fail",
    `offline fixture: outcome=${approved.outcome}; errors=${approved.errors.join(",") || "none"}`,
  ));

  const wrongPartner = productionKit.evaluateFetchedReceipt(fixtures["wrong-partner"]!.receipt!);
  checks.push(check(
    "kit-wrong-partner",
    "Offline fixture verification: wrong partner is rejected",
    wrongPartner.outcome !== "permitted" ? "pass" : "fail",
    `offline fixture: outcome=${wrongPartner.outcome}`,
  ));

  const wrongPolicy = productionKit.evaluateFetchedReceipt(fixtures["wrong-policy"]!.receipt!);
  checks.push(check(
    "kit-wrong-policy",
    "Offline fixture verification: wrong policy is rejected",
    wrongPolicy.outcome !== "permitted" ? "pass" : "fail",
    `offline fixture: outcome=${wrongPolicy.outcome}`,
  ));

  const expired = productionKit.evaluateFetchedReceipt(fixtures["expired-receipt"]!.receipt!);
  checks.push(check(
    "kit-expired",
    "Offline fixture verification: expired receipt is rejected",
    expired.outcome === "expired" || expired.outcome === "invalid" ? "pass" : "fail",
    `offline fixture: outcome=${expired.outcome}`,
  ));

  const revoked = productionKit.evaluateFetchedReceipt(fixtures["revoked-receipt"]!.receipt!);
  checks.push(check(
    "kit-revoked",
    "Offline fixture verification: revoked receipt is rejected",
    revoked.outcome === "revoked" || revoked.outcome === "invalid" ? "pass" : "fail",
    `offline fixture: outcome=${revoked.outcome}`,
  ));

  const sandbox = productionKit.evaluateFetchedReceipt(fixtures["sandbox-only-receipt"]!.receipt!);
  checks.push(check(
    "kit-sandbox-in-production",
    "Offline fixture verification: sandbox receipt is rejected in production mode",
    sandbox.outcome !== "permitted" ? "pass" : "fail",
    `offline fixture: outcome=${sandbox.outcome}`,
  ));

  const sandboxOk = sandboxKit.evaluateFetchedReceipt(fixtures["sandbox-only-with-opt-in"]!.receipt!);
  checks.push(check(
    "kit-sandbox-explicit",
    "Offline fixture verification: sandbox receipt can be evaluated only with sandbox environment",
    sandboxOk.outcome === "permitted" || sandboxOk.outcome === "invalid" ? (sandboxOk.outcome === "permitted" ? "pass" : "fail") : "fail",
    `offline fixture: outcome=${sandboxOk.outcome}`,
  ));

  const packMatch = POLICY_PACK_LIST.some((pack) => options.policyId.includes(pack.id)) || Boolean(resolvePolicyPack(options.policyId));
  checks.push(check(
    "kit-policy-pack-config",
    "Policy pack or pinned policy id is configured",
    options.policyId ? "pass" : "fail",
    packMatch
      ? `policy_id=${options.policyId} matches a catalog pack`
      : `policy_id=${options.policyId} (custom or partner pinned policy)`,
  ));

  return checks;
}

function validateCallbackUrl(options: PartnerConformanceOptions): ConformanceCheck {
  const format = validatePartnerReturnUrlFormat(options.returnUrl);
  if (!format.ok) {
    return check(
      "conformance-callback-url-format",
      "Configured callback URL format is valid",
      "fail",
      format.errors.join("; "),
    );
  }

  return check(
    "conformance-callback-url-format",
    "Configured callback URL format is valid",
    "pass",
    `return_url=${options.returnUrl} (HTTPS absolute URL with callback path)`,
  );
}

function validateCanonicalOrigin(options: PartnerConformanceOptions): ConformanceCheck {
  if (!options.baseUrl) {
    return check(
      "conformance-canonical-origin",
      "Abraxas base URL uses canonical production origin",
      options.productionMode ? "fail" : "pending",
      `Set ${"PARTNER_FLOW_RP_BASE_URL"} to probe canonical origin`,
    );
  }

  let origin = "";
  try {
    origin = new URL(options.baseUrl).origin;
  } catch {
    return check(
      "conformance-canonical-origin",
      "Abraxas base URL uses canonical production origin",
      "fail",
      `Invalid base URL: ${options.baseUrl}`,
    );
  }

  if (options.productionMode && origin !== SITE_URL) {
    return check(
      "conformance-canonical-origin",
      "Abraxas base URL uses canonical production origin",
      "fail",
      `origin=${origin} expected ${SITE_URL}`,
    );
  }

  if (options.baseUrl.includes(STALE_HOST)) {
    return check(
      "conformance-canonical-origin",
      "Abraxas base URL uses canonical production origin",
      "fail",
      `base URL contains stale host ${STALE_HOST}`,
    );
  }

  return check(
    "conformance-canonical-origin",
    "Abraxas base URL uses canonical production origin",
    "pass",
    options.productionMode
      ? `origin=${SITE_URL}`
      : `origin=${origin} (non production probe)`,
  );
}

function validateFrozenCallbackParams(manifestJson: unknown): ConformanceCheck {
  const callback =
    manifestJson && typeof manifestJson === "object" && manifestJson !== null
      ? (manifestJson as { callback?: { query_parameters?: unknown } }).callback
      : null;
  const params = callback?.query_parameters;

  if (!Array.isArray(params) || !params.every(p => typeof p === "string")) {
    return check(
      "conformance-frozen-callback-params",
      "Frozen Partner Flow callback query parameters present",
      "fail",
      "callback.query_parameters missing or malformed in compatibility manifest",
    );
  }

  const liveSorted = [...params].sort().join(",");
  const expectedSorted = [...PARTNER_CALLBACK_PARAMS].sort().join(",");

  if (liveSorted !== expectedSorted) {
    return check(
      "conformance-frozen-callback-params",
      "Frozen Partner Flow callback query parameters present",
      "fail",
      `callback.query_parameters mismatch (live=${liveSorted})`,
    );
  }

  return check(
    "conformance-frozen-callback-params",
    "Frozen Partner Flow callback query parameters present",
    "pass",
    `callback params: ${PARTNER_CALLBACK_PARAMS.join(", ")}`,
  );
}

export async function runPartnerConformance(
  options: PartnerConformanceOptions,
  deps: PartnerConformanceDeps,
): Promise<PartnerConformanceResult> {
  const checks: ConformanceCheck[] = [];

  if (!options.partnerId || !options.policyId || !options.returnUrl) {
    checks.push(
      check(
        "conformance-config",
        "Partner conformance configuration complete",
        "fail",
        "Set PARTNER_FLOW_RP_PARTNER_ID, PARTNER_FLOW_RP_POLICY_ID, and PARTNER_FLOW_RP_RETURN_URL",
      ),
    );
    const summary = summarize(checks);
    return { checks, summary, options, exitCode: 1 };
  }

  checks.push(
    check(
      "conformance-config",
      "Partner conformance configuration complete",
      "pass",
      `partner_id=${options.partnerId}; policy_id=${options.policyId}`,
    ),
  );

  checks.push(validateCanonicalOrigin(options));
  checks.push(validateCallbackUrl(options));
  checks.push(...validateReceiptFixtures(options));
  checks.push(...kitConformanceChecks(options));

  if (options.skipLiveManifest || !options.baseUrl) {
    checks.push(
      ...validateDeployedCompatibilityManifest({
        productionMode: options.productionMode,
        baseUrl: "",
        httpOk: false,
        rawText: "",
        liveJson: null,
      }).checks.map(c => ({
        id: c.id.replace(/^http-/, "conformance-"),
        label: c.label,
        status: c.status === "blocked" ? "pending" as const : c.status,
        evidence: c.evidence,
      })),
    );
  } else {
    try {
      const manifestFetch = await fetchJson(
        deps.fetch,
        options.baseUrl,
        PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH,
      );
      checks.push(
        ...validateDeployedCompatibilityManifest({
          productionMode: options.productionMode,
          baseUrl: options.baseUrl,
          httpOk: manifestFetch.ok,
          rawText: manifestFetch.text,
          liveJson: manifestFetch.json,
        }).checks.map(c => ({
          id: c.id.replace(/^http-/, "conformance-"),
          label: c.label,
          status: c.status === "blocked" ? "pending" as const : c.status,
          evidence: c.evidence,
        })),
      );

      if (manifestFetch.ok) {
        checks.push(validateFrozenCallbackParams(manifestFetch.json));
      } else {
        checks.push(
          check(
            "conformance-frozen-callback-params",
            "Frozen Partner Flow callback query parameters present",
            options.productionMode ? "fail" : "pending",
            "Manifest endpoint unavailable",
          ),
        );
      }
    } catch (e) {
      checks.push(
        ...validateDeployedCompatibilityManifest({
          productionMode: options.productionMode,
          baseUrl: options.baseUrl,
          httpOk: false,
          rawText: e instanceof Error ? e.message : String(e),
          liveJson: null,
        }).checks.map(c => ({
          id: c.id.replace(/^http-/, "conformance-"),
          label: c.label,
          status: c.status === "blocked" ? "pending" as const : c.status,
          evidence: c.evidence,
        })),
      );
      checks.push(
        check(
          "conformance-frozen-callback-params",
          "Frozen Partner Flow callback query parameters present",
          options.productionMode ? "fail" : "pending",
          "Manifest fetch failed",
        ),
      );
    }
  }

  const summary = summarize(checks);
  const exitCode = summary.fail > 0 ? 1 : 0;
  return { checks, summary, options, exitCode };
}

export function formatConformanceReport(result: PartnerConformanceResult): string {
  const lines: string[] = [
    "=== Abraxas partner conformance harness ===",
    "",
    `production_mode: ${result.options.productionMode}`,
    `base_url: ${result.options.baseUrl || "(not set, fixture checks only)"}`,
    `partner_id: ${result.options.partnerId || "(not set)"}`,
    `policy_id: ${result.options.policyId || "(not set)"}`,
    `return_url: ${result.options.returnUrl || "(not set)"}`,
    `allow_sandbox: ${result.options.allowSandbox}`,
    "",
  ];

  for (const c of result.checks) {
    const icon = c.status === "pass" ? "PASS" : c.status === "fail" ? "FAIL" : "PENDING";
    lines.push(`${icon.padEnd(7)} ${c.label}`);
    lines.push(`        ${c.evidence}`);
  }

  lines.push("");
  lines.push(
    `--- Summary ---`,
    `pass: ${result.summary.pass}, fail: ${result.summary.fail}, pending: ${result.summary.pending}`,
  );

  return lines.join("\n");
}
