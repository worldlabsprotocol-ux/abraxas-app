// FILE: lib/integration/preflight.ts
// Read-only integration-readiness preflight checks (no mutations).

import { join } from "node:path";
import {
  FROZEN_PUBLIC_RECEIPT_VIEW_KEYS,
  PARTNER_CALLBACK_PARAMS,
} from "@/lib/protocol/compatibility";
import {
  PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH,
  PARTNER_FLOW_RECEIPT_SECURITY_FIELDS,
} from "@/lib/partner/partnerFlowOpenApiContract";
import { SITE_URL } from "@/lib/siteUrl";
import { configuredEnvUsesStaleHost } from "@/lib/integration/preflightConfig";
import type {
  PreflightCheck,
  PreflightDeps,
  PreflightOptions,
  PreflightResult,
  PreflightStatus,
} from "@/lib/integration/preflightTypes";

const STALE_HOST = "abraxas-app.vercel.app";

const SCHEMA_MIGRATION_CHECKS = [
  {
    id: "migration-039-partner-onboarding",
    file: "supabase/migrations/039_partner_onboarding.sql",
    needles: ["is_external", "onboarding_checklist", "public_listing_ok"],
  },
  {
    id: "migration-033-decision-receipts",
    file: "supabase/migrations/033_decision_receipts.sql",
    needles: ["decision_receipts", "decision_result", "signature"],
  },
  {
    id: "migration-036-return-urls",
    file: "supabase/migrations/036_connect_wallet_authority.sql",
    needles: ["allowed_return_urls"],
  },
  {
    id: "migration-049-good-trouble-pilot",
    file: "supabase/migrations/049_good_trouble_cannabis_pilot.sql",
    needles: ["partner_policies", "credential_schemas", "good-trouble-cannabis"],
  },
] as const;

function check(
  id: string,
  label: string,
  status: PreflightStatus,
  evidence: string,
): PreflightCheck {
  return { id, label, status, evidence };
}

async function fetchJson(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const res = await fetchFn(`${baseUrl}${path}`, init);
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep text
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function runIntegrationPreflight(
  options: PreflightOptions,
  deps: PreflightDeps,
  rootDir = process.cwd(),
): Promise<PreflightResult> {
  const checks: PreflightCheck[] = [];

  // ── Static: repo migration / schema contract ─────────────────────────────
  for (const migration of SCHEMA_MIGRATION_CHECKS) {
    const path = join(rootDir, migration.file);
    if (!deps.fileExists(path)) {
      checks.push(
        check(
          migration.id,
          `Schema migration present (${migration.file})`,
          "fail",
          `Missing file: ${migration.file}`,
        ),
      );
      continue;
    }
    const sql = deps.readFile(path);
    const missing = migration.needles.filter((n) => !sql.includes(n));
    if (missing.length > 0) {
      checks.push(
        check(
          migration.id,
          `Schema migration present (${migration.file})`,
          "fail",
          `Missing expected tokens: ${missing.join(", ")}`,
        ),
      );
    } else {
      checks.push(
        check(
          migration.id,
          `Schema migration present (${migration.file})`,
          "pass",
          `Contains ${migration.needles.join(", ")}`,
        ),
      );
    }
  }

  // ── Static: Partner Flow receipt + callback contract ─────────────────────
  const openapiPath = join(rootDir, PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH);
  if (!deps.fileExists(openapiPath)) {
    checks.push(
      check(
        "partner-flow-openapi-spec",
        "Partner Flow OpenAPI spec on disk",
        "fail",
        `Missing ${PARTNER_FLOW_OPENAPI_SPEC_RELATIVE_PATH}`,
      ),
    );
  } else {
    const openapi = deps.readFile(openapiPath);
    const missingReceiptFields = [...PARTNER_FLOW_RECEIPT_SECURITY_FIELDS].filter(
      (f) => !openapi.includes(f),
    );
    const missingCallbackParams = [...PARTNER_CALLBACK_PARAMS].filter((p) => !openapi.includes(p));
    if (missingReceiptFields.length > 0 || missingCallbackParams.length > 0) {
      checks.push(
        check(
          "partner-flow-receipt-contract",
          "Partner Flow public receipt security fields documented",
          "fail",
          [
            missingReceiptFields.length
              ? `missing receipt fields: ${missingReceiptFields.join(", ")}`
              : null,
            missingCallbackParams.length
              ? `missing callback params: ${missingCallbackParams.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join("; "),
        ),
      );
    } else {
      checks.push(
        check(
          "partner-flow-receipt-contract",
          "Partner Flow public receipt security fields documented",
          "pass",
          `OpenAPI includes receipt security fields (${PARTNER_FLOW_RECEIPT_SECURITY_FIELDS.join(", ")}) and frozen callback params`,
        ),
      );
    }

    const frozenMissing = [...FROZEN_PUBLIC_RECEIPT_VIEW_KEYS].filter((k) => !openapi.includes(k));
    checks.push(
      check(
        "partner-flow-frozen-receipt-view",
        "Frozen public receipt view keys represented",
        frozenMissing.length === 0 ? "pass" : "fail",
        frozenMissing.length === 0
          ? `${FROZEN_PUBLIC_RECEIPT_VIEW_KEYS.length} keys present in OpenAPI`
          : `Missing keys: ${frozenMissing.join(", ")}`,
      ),
    );

    if (openapi.includes(STALE_HOST)) {
      checks.push(
        check(
          "partner-flow-openapi-no-stale-host",
          "OpenAPI spec has no stale Vercel host",
          "fail",
          `Found ${STALE_HOST} in OpenAPI spec`,
        ),
      );
    } else {
      checks.push(
        check(
          "partner-flow-openapi-no-stale-host",
          "OpenAPI spec has no stale Vercel host",
          "pass",
          `Canonical server ${SITE_URL}`,
        ),
      );
    }
  }

  // ── Env: stale host in configured production URLs ──────────────────────────
  const staleEnv = configuredEnvUsesStaleHost(deps.env);
  if (staleEnv.length > 0) {
    checks.push(
      check(
        "env-no-stale-vercel-host",
        "Configured public URLs avoid abraxas-app.vercel.app",
        options.productionMode ? "fail" : "pending",
        `Stale host in: ${staleEnv.join("; ")}`,
      ),
    );
  } else {
    checks.push(
      check(
        "env-no-stale-vercel-host",
        "Configured public URLs avoid abraxas-app.vercel.app",
        "pass",
        "NEXT_PUBLIC_APP_URL, ABRAXAS_ISSUER_URL, VERCEL_URL clear",
      ),
    );
  }

  // ── HTTP probes (require base URL) ───────────────────────────────────────
  if (!options.baseUrl) {
    checks.push(
      check(
        "http-canonical-public-origin",
        "Deployed public-key issuer matches expected origin",
        "pending",
        `Set ${"INTEGRATION_PREFLIGHT_BASE_URL"} (e.g. ${SITE_URL})`,
      ),
    );
    checks.push(
      check(
        "http-trust-signing-enabled",
        "Production trust signing status enabled",
        "pending",
        `Set ${"INTEGRATION_PREFLIGHT_BASE_URL"} to probe /api/trust/status`,
      ),
    );
    checks.push(
      check(
        "http-openapi-canonical-server",
        "Deployed OpenAPI advertises canonical server",
        "pending",
        "No base URL — skipping live OpenAPI fetch",
      ),
    );
  } else {
    try {
      const { ok, json } = await fetchJson(deps.fetch, options.baseUrl, "/api/credentials/public-key");
      const issuer = (json as { issuer?: string })?.issuer;
      const expectedOrigin = options.productionMode
        ? new URL(SITE_URL).origin
        : new URL(options.baseUrl).origin;

      if (!ok || !issuer) {
        checks.push(
          check(
            "http-canonical-public-origin",
            "Deployed public-key issuer matches expected origin",
            options.productionMode ? "fail" : "pending",
            `GET /api/credentials/public-key failed or missing issuer (ok=${ok})`,
          ),
        );
      } else if (issuer.includes(STALE_HOST)) {
        checks.push(
          check(
            "http-canonical-public-origin",
            "Deployed public-key issuer matches expected origin",
            "fail",
            `Issuer still uses stale host: ${issuer}`,
          ),
        );
      } else if (new URL(issuer).origin !== expectedOrigin) {
        checks.push(
          check(
            "http-canonical-public-origin",
            "Deployed public-key issuer matches expected origin",
            options.productionMode ? "fail" : "pending",
            `Issuer ${issuer} !== expected ${expectedOrigin}`,
          ),
        );
      } else {
        checks.push(
          check(
            "http-canonical-public-origin",
            "Deployed public-key issuer matches expected origin",
            "pass",
            `issuer=${issuer}`,
          ),
        );
      }
    } catch (e) {
      checks.push(
        check(
          "http-canonical-public-origin",
          "Deployed public-key issuer matches expected origin",
          options.productionMode ? "fail" : "pending",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    try {
      const probeSui =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
      const { ok, json } = await fetchJson(
        deps.fetch,
        options.baseUrl,
        `/api/trust/status?sui=${probeSui}`,
      );
      const signing = (json as { infrastructure?: { signing_configured?: boolean } })
        ?.infrastructure?.signing_configured;
      if (!ok) {
        checks.push(
          check(
            "http-trust-signing-enabled",
            "Production trust signing status enabled",
            options.productionMode ? "fail" : "pending",
            "GET /api/trust/status not OK",
          ),
        );
      } else if (signing !== true) {
        checks.push(
          check(
            "http-trust-signing-enabled",
            "Production trust signing status enabled",
            options.productionMode ? "fail" : "pending",
            `signing_configured=${String(signing)}`,
          ),
        );
      } else {
        checks.push(
          check(
            "http-trust-signing-enabled",
            "Production trust signing status enabled",
            "pass",
            "signing_configured=true",
          ),
        );
      }
    } catch (e) {
      checks.push(
        check(
          "http-trust-signing-enabled",
          "Production trust signing status enabled",
          options.productionMode ? "fail" : "pending",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    try {
      const { ok, text } = await fetchJson(
        deps.fetch,
        options.baseUrl,
        "/openapi/partner-flow.openapi.yaml",
      );
      if (!ok) {
        checks.push(
          check(
            "http-openapi-canonical-server",
            "Deployed OpenAPI advertises canonical server",
            options.productionMode ? "fail" : "pending",
            "GET /openapi/partner-flow.openapi.yaml failed",
          ),
        );
      } else if (text.includes(STALE_HOST)) {
        checks.push(
          check(
            "http-openapi-canonical-server",
            "Deployed OpenAPI advertises canonical server",
            "fail",
            `Deployed OpenAPI contains ${STALE_HOST}`,
          ),
        );
      } else if (!text.includes(`url: ${SITE_URL}`)) {
        checks.push(
          check(
            "http-openapi-canonical-server",
            "Deployed OpenAPI advertises canonical server",
            options.productionMode ? "fail" : "pending",
            `Missing canonical server url: ${SITE_URL}`,
          ),
        );
      } else {
        checks.push(
          check(
            "http-openapi-canonical-server",
            "Deployed OpenAPI advertises canonical server",
            "pass",
            `servers.url=${SITE_URL}`,
          ),
        );
      }
    } catch (e) {
      checks.push(
        check(
          "http-openapi-canonical-server",
          "Deployed OpenAPI advertises canonical server",
          options.productionMode ? "fail" : "pending",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }
  }

  // ── Supabase partner configuration (optional service role) ───────────────
  if (!deps.loadPartner || !deps.loadPolicy) {
    checks.push(
      check(
        "supabase-partner-row",
        `Partner row exists (${options.partnerId})`,
        "pending",
        "Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for live partner probe",
      ),
    );
    checks.push(
      check(
        "supabase-partner-policy-active",
        `Active policy exists (${options.policyId})`,
        "pending",
        "Supabase service role not configured",
      ),
    );
    checks.push(
      check(
        "supabase-allowed-return-urls",
        "Partner allowed_return_urls configured",
        "pending",
        "Supabase service role not configured",
      ),
    );
    checks.push(
      check(
        "supabase-callback-allowlist-match",
        `Callback URL allowlisted (${options.returnUrl})`,
        "pending",
        "Supabase service role not configured",
      ),
    );
    checks.push(
      check(
        "supabase-onboarding-fields",
        "Partner onboarding fields readable",
        "pending",
        "Supabase service role not configured",
      ),
    );
  } else {
    const partner = await deps.loadPartner(options.partnerId);
    if (!partner) {
      checks.push(
        check(
          "supabase-partner-row",
          `Partner row exists (${options.partnerId})`,
          options.productionMode ? "fail" : "pending",
          "No row in public.partners",
        ),
      );
    } else {
      checks.push(
        check(
          "supabase-partner-row",
          `Partner row exists (${options.partnerId})`,
          "pass",
          `status=${partner.status ?? "unknown"}`,
        ),
      );

      const hasOnboardingFields =
        "is_external" in partner &&
        "onboarding_checklist" in partner &&
        partner.is_external !== undefined;
      checks.push(
        check(
          "supabase-onboarding-fields",
          "Partner onboarding fields readable",
          hasOnboardingFields ? "pass" : "fail",
          hasOnboardingFields
            ? `is_external=${String(partner.is_external)}`
            : "Missing is_external/onboarding_checklist columns — run migration 039",
        ),
      );

      const urls = partner.allowed_return_urls ?? [];
      if (urls.length === 0) {
        checks.push(
          check(
            "supabase-allowed-return-urls",
            "Partner allowed_return_urls configured",
            options.productionMode ? "fail" : "pending",
            "allowed_return_urls is empty",
          ),
        );
      } else if (urls.some((u) => u.includes(STALE_HOST))) {
        checks.push(
          check(
            "supabase-allowed-return-urls",
            "Partner allowed_return_urls configured",
            "fail",
            `allowed_return_urls contains stale host: ${urls.filter((u) => u.includes(STALE_HOST)).join(", ")}`,
          ),
        );
      } else {
        checks.push(
          check(
            "supabase-allowed-return-urls",
            "Partner allowed_return_urls configured",
            "pass",
            `${urls.length} URL(s); includes canonical paths`,
          ),
        );
      }
    }

    const policy = await deps.loadPolicy(options.policyId);
    if (!policy) {
      checks.push(
        check(
          "supabase-partner-policy-active",
          `Active policy exists (${options.policyId})`,
          options.productionMode ? "fail" : "pending",
          "No row in public.partner_policies",
        ),
      );
    } else if (policy.status !== "active") {
      checks.push(
        check(
          "supabase-partner-policy-active",
          `Active policy exists (${options.policyId})`,
          "fail",
          `status=${policy.status}`,
        ),
      );
    } else if (policy.partner_id !== options.partnerId) {
      checks.push(
        check(
          "supabase-partner-policy-active",
          `Active policy exists (${options.policyId})`,
          "fail",
          `policy.partner_id=${policy.partner_id} !== ${options.partnerId}`,
        ),
      );
    } else {
      checks.push(
        check(
          "supabase-partner-policy-active",
          `Active policy exists (${options.policyId})`,
          "pass",
          `active for partner ${policy.partner_id}`,
        ),
      );
    }

    if (deps.isReturnUrlAllowed) {
      try {
        const allowed = await deps.isReturnUrlAllowed(options.partnerId, options.returnUrl);
        checks.push(
          check(
            "supabase-callback-allowlist-match",
            `Callback URL allowlisted (${options.returnUrl})`,
            allowed ? "pass" : options.productionMode ? "fail" : "pending",
            allowed ? "isReturnUrlAllowed=true" : "return_url not in partners.allowed_return_urls",
          ),
        );
      } catch (e) {
        checks.push(
          check(
            "supabase-callback-allowlist-match",
            `Callback URL allowlisted (${options.returnUrl})`,
            options.productionMode ? "fail" : "pending",
            e instanceof Error ? e.message : String(e),
          ),
        );
      }
    }
  }

  const summary: Record<PreflightStatus, number> = {
    pass: 0,
    fail: 0,
    pending: 0,
    blocked: 0,
  };
  for (const c of checks) summary[c.status]++;

  const exitCode = summary.fail > 0 ? 1 : 0;

  return {
    checks,
    summary,
    productionMode: options.productionMode,
    baseUrl: options.baseUrl,
    partnerId: options.partnerId,
    policyId: options.policyId,
    returnUrl: options.returnUrl,
    exitCode,
  };
}

export function formatPreflightReport(result: PreflightResult): string {
  const lines: string[] = [
    "=== Abraxas integration preflight ===",
    "",
    `production_mode: ${result.productionMode}`,
    `base_url: ${result.baseUrl || "(not set — static checks only)"}`,
    `partner_id: ${result.partnerId}`,
    `policy_id: ${result.policyId}`,
    `return_url: ${result.returnUrl}`,
    "",
  ];

  for (const c of result.checks) {
    const icon =
      c.status === "pass"
        ? "PASS"
        : c.status === "fail"
          ? "FAIL"
          : c.status === "blocked"
            ? "BLOCKED"
            : "PENDING";
    lines.push(`${icon.padEnd(7)} ${c.label}`);
    lines.push(`        ${c.evidence}`);
  }

  lines.push("");
  lines.push("--- Summary ---");
  lines.push(
    `pass: ${result.summary.pass}, fail: ${result.summary.fail}, pending: ${result.summary.pending}, blocked: ${result.summary.blocked}`,
  );
  lines.push("");
  lines.push("See docs/INTEGRATION_PREFLIGHT.md for operator inputs.");

  return lines.join("\n");
}
