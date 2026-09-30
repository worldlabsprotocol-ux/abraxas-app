// FILE: lib/goodTrouble/productionReadiness.ts
// Read-only Good Trouble production preflight. Never mutates production.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  GOOD_TROUBLE_LEGACY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  bindingProductionAuthorized,
  resolveBindingEnvironment,
} from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import { isApplicationProductionUsable } from "@/lib/partner/launchpad/productionActivation";
import { productionCredentialState } from "@/lib/partner/launchpad/productionCredentials/evaluate";
import {
  hasProductionLaunchpadCallback,
  isProductionLaunchpadCallback,
} from "@/lib/partner/launchpad/productionCallbackReadiness";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { IntegrationEventRow } from "@/lib/partner/integrationObservability/record";

export type ReadinessStatus = "PASS" | "FAIL" | "UNKNOWN";

export type ReadinessCategory =
  | "application"
  | "policy_binding"
  | "application_production"
  | "credential"
  | "callback"
  | "hosted_flow"
  | "receipt"
  | "observability"
  | "legacy_distinction";

export interface ReadinessCheck {
  id: string;
  category: ReadinessCategory;
  status: ReadinessStatus;
  detail: string;
  critical: boolean;
  identifiers?: Record<string, string | number | boolean | null>;
}

export interface ProductionCredentialSummary {
  id: string;
  key_prefix: string;
  revoked_at: string | null;
  launchpad_application_id: string | null;
  partner_id: string;
}

export interface GoodTroubleReadinessDeps {
  loadApplication: (slug: string) => Promise<LaunchpadApplicationRow | null>;
  loadBindings: (app: LaunchpadApplicationRow) => Promise<ApplicationPolicyBindingRow[]>;
  loadProductionCredential: (keyId: string) => Promise<ProductionCredentialSummary | null>;
  tableExists: (table: string) => Promise<boolean | null>;
  loadProductionEvents: (
    applicationId: string,
  ) => Promise<IntegrationEventRow[] | null>;
  fileExists?: (path: string) => boolean;
}

export interface GoodTroubleReadinessReport {
  generated_at: string;
  partner_id: string;
  app_slug: string;
  policy_template: string;
  result_family: string;
  ready: boolean;
  blockers: string[];
  checks: ReadinessCheck[];
  legacy_track: typeof GOOD_TROUBLE_LEGACY;
  canonical_track: {
    partner_id: string;
    app_slug: string;
    policy_id: string;
    policy_template: string;
    result_family: string;
    handoff_endpoint: string;
  };
}

const CRITICAL_TABLES = [
  "partner_launchpad_applications",
  "partner_launchpad_application_policies",
  "partner_api_keys",
  "hosted_partner_flow_handoffs",
  "partner_integration_events",
] as const;

function check(
  input: Omit<ReadinessCheck, "critical"> & { critical?: boolean },
): ReadinessCheck {
  return { critical: true, ...input };
}

function findAgeBinding(bindings: ApplicationPolicyBindingRow[]): ApplicationPolicyBindingRow | null {
  return bindings.find(
    (b) => b.policy_template_id === GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE && b.status === "active",
  ) ?? null;
}

function callbackMatchesGoodTrouble(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname === GOOD_TROUBLE_EXPECTED_CALLBACK_URL;
  } catch {
    return false;
  }
}

export function productionReadinessLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  if (/abx_live_[a-z0-9_-]{12,}/.test(blob)) leaks.push("raw_live_key");
  if (/abx_test_[a-z0-9_-]{12,}/.test(blob)) leaks.push("raw_test_key");
  if (/key_hash|production_key_encrypted/.test(blob)) leaks.push("key_material");
  return leaks;
}

export async function evaluateGoodTroubleProductionReadiness(
  deps: GoodTroubleReadinessDeps,
  options?: { appSlug?: string; partnerId?: string },
): Promise<GoodTroubleReadinessReport> {
  const appSlug = options?.appSlug ?? GOOD_TROUBLE_CANONICAL_APP_SLUG;
  const partnerId = options?.partnerId ?? GOOD_TROUBLE_CANONICAL_PARTNER_ID;
  const fileExists = deps.fileExists ?? ((p: string) => existsSync(p));
  const checks: ReadinessCheck[] = [];

  const app = await deps.loadApplication(appSlug);

  // --- APPLICATION ---
  if (!app) {
    checks.push(check({
      id: "launchpad_application",
      category: "application",
      status: "FAIL",
      detail: `No Launchpad application with public_slug=${appSlug}.`,
    }));
  } else {
    checks.push(check({
      id: "launchpad_application",
      category: "application",
      status: "PASS",
      detail: "Canonical Launchpad application exists.",
      identifiers: { application_id: app.id, public_slug: app.public_slug },
    }));

    checks.push(check({
      id: "app_slug",
      category: "application",
      status: app.public_slug === appSlug ? "PASS" : "FAIL",
      detail: app.public_slug === appSlug
        ? "Application slug matches Good Trouble."
        : `Expected slug ${appSlug}, found ${app.public_slug}.`,
      identifiers: { public_slug: app.public_slug },
    }));

    checks.push(check({
      id: "partner_ownership",
      category: "application",
      status: app.partner_id === partnerId ? "PASS" : "FAIL",
      detail: app.partner_id === partnerId
        ? "Application belongs to canonical Good Trouble partner."
        : `Expected partner_id ${partnerId}, found ${app.partner_id}.`,
      identifiers: { partner_id: app.partner_id },
    }));

    checks.push(check({
      id: "application_status",
      category: "application",
      status: app.status === "active" ? "PASS" : "FAIL",
      detail: app.status === "active"
        ? "Application is active."
        : `Application status is ${app.status}.`,
      identifiers: { status: app.status },
    }));

    checks.push(check({
      id: "application_environment",
      category: "application",
      status: app.environment === "production" ? "PASS" : "FAIL",
      detail: app.environment === "production"
        ? "Application environment is production."
        : `Application environment is ${app.environment}.`,
      identifiers: { environment: app.environment },
    }));
  }

  const bindings = app ? await deps.loadBindings(app) : [];
  const ageBinding = findAgeBinding(bindings);

  // --- POLICY BINDING ---
  if (!app) {
    checks.push(check({
      id: "age_21_retail_binding",
      category: "policy_binding",
      status: "UNKNOWN",
      detail: "Cannot inspect bindings without application.",
    }));
  } else if (!ageBinding) {
    checks.push(check({
      id: "age_21_retail_binding",
      category: "policy_binding",
      status: "FAIL",
      detail: "No active age_21_retail binding found.",
    }));
  } else {
    checks.push(check({
      id: "age_21_retail_binding",
      category: "policy_binding",
      status: "PASS",
      detail: "age_21_retail binding exists.",
      identifiers: { binding_id: ageBinding.id },
    }));

    checks.push(check({
      id: "binding_stable_id",
      category: "policy_binding",
      status: Boolean(ageBinding.id?.trim()) ? "PASS" : "FAIL",
      detail: "Stable binding ID is present.",
      identifiers: { binding_id: ageBinding.id },
    }));

    checks.push(check({
      id: "binding_application_scope",
      category: "policy_binding",
      status: ageBinding.application_id === app.id ? "PASS" : "FAIL",
      detail: ageBinding.application_id === app.id
        ? "Binding belongs to Good Trouble application."
        : "Binding application_id mismatch.",
      identifiers: { binding_application_id: ageBinding.application_id },
    }));

    const pack = resolvePolicyPack(ageBinding.policy_template_id);
    const resultFamily = pack?.disclosed_result ?? null;
    checks.push(check({
      id: "result_family",
      category: "policy_binding",
      status: resultFamily === GOOD_TROUBLE_CANONICAL_RESULT_FAMILY ? "PASS" : "FAIL",
      detail: resultFamily === GOOD_TROUBLE_CANONICAL_RESULT_FAMILY
        ? `Result family resolves to ${GOOD_TROUBLE_CANONICAL_RESULT_FAMILY}.`
        : `Expected ${GOOD_TROUBLE_CANONICAL_RESULT_FAMILY}, resolved ${resultFamily ?? "null"}.`,
      identifiers: { result_family: resultFamily },
    }));

    const prodAuthorized = bindingProductionAuthorized({ binding: ageBinding, application: app });
    checks.push(check({
      id: "binding_production_authorized",
      category: "policy_binding",
      status: prodAuthorized ? "PASS" : "FAIL",
      detail: prodAuthorized
        ? "Binding is production authorized."
        : "Binding is not production authorized.",
    }));

    const prodStatus = ageBinding.production_status ?? "sandbox_only";
    checks.push(check({
      id: "binding_production_status",
      category: "policy_binding",
      status: prodStatus === "production_active" ? "PASS" : "FAIL",
      detail: prodStatus === "production_active"
        ? "Binding production_status is production_active."
        : `Binding production_status is ${prodStatus}.`,
      identifiers: { production_status: prodStatus },
    }));

    checks.push(check({
      id: "binding_production_authorized_at",
      category: "policy_binding",
      status: ageBinding.production_authorized_at ? "PASS" : "FAIL",
      detail: ageBinding.production_authorized_at
        ? "production_authorized_at is set."
        : "production_authorized_at is missing.",
      identifiers: { production_authorized_at: ageBinding.production_authorized_at ?? null },
    }));

    const bindingEnv = resolveBindingEnvironment({ binding: ageBinding, application: app });
    checks.push(check({
      id: "binding_environment",
      category: "policy_binding",
      status: bindingEnv === "production" ? "PASS" : "FAIL",
      detail: bindingEnv === "production"
        ? "Binding resolves to production environment."
        : `Binding resolves to ${bindingEnv}.`,
      identifiers: { environment: bindingEnv },
    }));
  }

  // --- APPLICATION PRODUCTION ---
  if (!app) {
    checks.push(check({
      id: "production_activated_at",
      category: "application_production",
      status: "UNKNOWN",
      detail: "Cannot inspect production activation without application.",
    }));
  } else {
    const activated = isApplicationProductionUsable({
      productionActivatedAt: app.production_activated_at ?? null,
      environment: app.environment,
      status: app.status,
    });
    checks.push(check({
      id: "production_activated_at",
      category: "application_production",
      status: app.production_activated_at ? "PASS" : "FAIL",
      detail: app.production_activated_at
        ? "production_activated_at is set."
        : "production_activated_at is missing.",
      identifiers: { production_activated_at: app.production_activated_at ?? null },
    }));
    checks.push(check({
      id: "production_access_active",
      category: "application_production",
      status: activated ? "PASS" : "FAIL",
      detail: activated
        ? "Production access is active for this application."
        : "Production access is not active.",
    }));
  }

  // --- CREDENTIAL ---
  if (!app?.production_api_key_id) {
    checks.push(check({
      id: "production_credential",
      category: "credential",
      status: app ? "FAIL" : "UNKNOWN",
      detail: app
        ? "No production_api_key_id on application."
        : "Cannot inspect credential without application.",
    }));
  } else {
    const cred = await deps.loadProductionCredential(app.production_api_key_id);
    if (!cred) {
      checks.push(check({
        id: "production_credential",
        category: "credential",
        status: "FAIL",
        detail: "Production credential record not found.",
        identifiers: { production_api_key_id: app.production_api_key_id },
      }));
    } else {
      const credState = productionCredentialState({
        productionApiKeyId: cred.id,
        revoked: Boolean(cred.revoked_at),
        schemaReady: true,
      });
      const isLive = cred.key_prefix.startsWith("abx_live_");
      checks.push(check({
        id: "production_credential",
        category: "credential",
        status: credState === "active" && isLive ? "PASS" : "FAIL",
        detail: credState === "active" && isLive
          ? "Active abx_live credential exists."
          : `Credential state: ${credState}, prefix: ${cred.key_prefix.slice(0, 12)}…`,
        identifiers: {
          credential_id: cred.id,
          key_prefix: cred.key_prefix.slice(0, 16),
        },
      }));
      checks.push(check({
        id: "credential_partner_scope",
        category: "credential",
        status: cred.partner_id === partnerId ? "PASS" : "FAIL",
        detail: cred.partner_id === partnerId
          ? "Credential belongs to Good Trouble partner."
          : `Credential partner_id is ${cred.partner_id}.`,
      }));
      checks.push(check({
        id: "credential_application_scope",
        category: "credential",
        status: cred.launchpad_application_id === app.id ? "PASS" : "FAIL",
        detail: cred.launchpad_application_id === app.id
          ? "Credential is linked to Good Trouble application."
          : "Credential launchpad_application_id mismatch.",
      }));
      checks.push(check({
        id: "credential_not_revoked",
        category: "credential",
        status: !cred.revoked_at ? "PASS" : "FAIL",
        detail: cred.revoked_at ? "Production credential is revoked." : "Credential is not revoked.",
      }));
    }
  }

  // --- CALLBACK ---
  if (!app) {
    checks.push(check({
      id: "production_callback",
      category: "callback",
      status: "UNKNOWN",
      detail: "Cannot inspect callback without application.",
    }));
  } else {
    const prodCallbacks = app.allowed_return_urls.filter(isProductionLaunchpadCallback);
    const hasProd = hasProductionLaunchpadCallback(app.allowed_return_urls);
    checks.push(check({
      id: "production_callback",
      category: "callback",
      status: hasProd ? "PASS" : "FAIL",
      detail: hasProd
        ? "HTTPS production callback is allowlisted."
        : "No HTTPS production callback on application.",
      identifiers: { production_callback_count: prodCallbacks.length },
    }));
    const gtCallback = app.allowed_return_urls.find(callbackMatchesGoodTrouble);
    checks.push(check({
      id: "callback_good_trouble",
      category: "callback",
      status: gtCallback ? "PASS" : "FAIL",
      detail: gtCallback
        ? "Expected Good Trouble callback URL is allowlisted."
        : `Expected ${GOOD_TROUBLE_EXPECTED_CALLBACK_URL} on allowlist.`,
    }));
  }

  // --- HOSTED FLOW ---
  const handoffTable = await deps.tableExists("hosted_partner_flow_handoffs");
  checks.push(check({
    id: "hosted_handoff_table",
    category: "hosted_flow",
    status: handoffTable === null ? "UNKNOWN" : handoffTable ? "PASS" : "FAIL",
    detail: handoffTable === null
      ? "Cannot verify hosted handoff table (database unavailable)."
      : handoffTable
        ? "hosted_partner_flow_handoffs table exists."
        : "hosted_partner_flow_handoffs table missing.",
  }));

  const handoffRoute = fileExists(resolve(process.cwd(), "app/api/v1/partner-handoff/route.ts"));
  checks.push(check({
    id: "partner_handoff_route",
    category: "hosted_flow",
    status: handoffRoute ? "PASS" : "FAIL",
    detail: handoffRoute
      ? "POST /api/v1/partner-handoff route is deployed in codebase."
      : "Partner handoff route missing.",
    critical: false,
  }));

  if (app && ageBinding) {
    const prodAuthorized = bindingProductionAuthorized({ binding: ageBinding, application: app });
    const bindingEnv = resolveBindingEnvironment({ binding: ageBinding, application: app });
    const handoffResolvable = prodAuthorized
      && bindingEnv === "production"
      && ageBinding.production_status !== "production_suspended"
      && Boolean(app.production_activated_at);
    checks.push(check({
      id: "binding_handoff_resolvable",
      category: "hosted_flow",
      status: handoffResolvable ? "PASS" : "FAIL",
      detail: handoffResolvable
        ? "Binding-aware production handoff can be created."
        : "Production handoff prerequisites for age binding are not met.",
    }));
  } else {
    checks.push(check({
      id: "binding_handoff_resolvable",
      category: "hosted_flow",
      status: "UNKNOWN",
      detail: "Cannot test handoff resolution without application and age binding.",
    }));
  }

  // --- RECEIPT ---
  const publicReceiptRoute = fileExists(
    resolve(process.cwd(), "app/api/receipts/[receiptId]/public/route.ts"),
  );
  checks.push(check({
    id: "public_receipt_endpoint",
    category: "receipt",
    status: publicReceiptRoute ? "PASS" : "FAIL",
    detail: publicReceiptRoute
      ? "GET /api/receipts/{id}/public endpoint exists."
      : "Public receipt endpoint missing.",
    critical: false,
  }));

  const kitModule = fileExists(resolve(process.cwd(), "lib/partner/integrationKit/index.ts"));
  checks.push(check({
    id: "verify_for_action",
    category: "receipt",
    status: kitModule ? "PASS" : "FAIL",
    detail: kitModule
      ? "AbraxasPartnerKit.verifyForAction path exists."
      : "Partner integration kit missing.",
    critical: false,
  }));

  const receiptIssuance = fileExists(
    resolve(process.cwd(), "lib/partner/hostedHandoff/store.ts"),
  );
  checks.push(check({
    id: "receipt_issuance_path",
    category: "receipt",
    status: receiptIssuance ? "PASS" : "FAIL",
    detail: receiptIssuance
      ? "Hosted handoff receipt issuance path exists."
      : "Receipt issuance module missing.",
    critical: false,
  }));

  // --- OBSERVABILITY ---
  const eventsTable = await deps.tableExists("partner_integration_events");
  checks.push(check({
    id: "integration_events_pipeline",
    category: "observability",
    status: eventsTable === null ? "UNKNOWN" : eventsTable ? "PASS" : "FAIL",
    detail: eventsTable === null
      ? "Cannot verify integration events table."
      : eventsTable
        ? "partner_integration_events table exists."
        : "Integration events table missing.",
  }));

  const pilotEvidenceRoute = fileExists(resolve(process.cwd(), "app/admin/pilot-evidence/page.tsx"));
  checks.push(check({
    id: "pilot_evidence_path",
    category: "observability",
    status: pilotEvidenceRoute ? "PASS" : "FAIL",
    detail: pilotEvidenceRoute
      ? "Admin pilot evidence surface exists."
      : "Pilot evidence admin page missing.",
    critical: false,
  }));

  if (app) {
    const events = await deps.loadProductionEvents(app.id);
    if (events === null) {
      checks.push(check({
        id: "production_events_loaded",
        category: "observability",
        status: "UNKNOWN",
        detail: "Could not load production integration events.",
        critical: false,
      }));
    } else {
      const liveProd = events.filter((e) => e.environment === "production");
      checks.push(check({
        id: "production_events_loaded",
        category: "observability",
        status: "PASS",
        detail: `Loaded ${liveProd.length} production integration event(s).`,
        critical: false,
        identifiers: { production_event_count: liveProd.length },
      }));
    }
  }

  // --- LEGACY DISTINCTION ---
  checks.push(check({
    id: "canonical_partner_id",
    category: "legacy_distinction",
    status: partnerId === GOOD_TROUBLE_CANONICAL_PARTNER_ID ? "PASS" : "FAIL",
    detail: `Canonical partner_id is ${GOOD_TROUBLE_CANONICAL_PARTNER_ID}, not ${GOOD_TROUBLE_LEGACY.partner_id}.`,
    critical: false,
  }));

  if (app) {
    const usesLegacyPolicy = app.policy_id === GOOD_TROUBLE_LEGACY.retail_policy_id;
    checks.push(check({
      id: "not_legacy_policy",
      category: "legacy_distinction",
      status: usesLegacyPolicy ? "FAIL" : "PASS",
      detail: usesLegacyPolicy
        ? `Application pins legacy policy ${GOOD_TROUBLE_LEGACY.retail_policy_id}.`
        : `Application pins canonical policy ${GOOD_TROUBLE_CANONICAL_POLICY_ID}.`,
      identifiers: { policy_id: app.policy_id },
    }));
  }

  const blockers = checks
    .filter((c) => c.critical && c.status === "FAIL")
    .map((c) => c.id);

  const unknownCritical = checks.filter((c) => c.critical && c.status === "UNKNOWN");
  const ready = blockers.length === 0 && unknownCritical.length === 0;

  return {
    generated_at: new Date().toISOString(),
    partner_id: partnerId,
    app_slug: appSlug,
    policy_template: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
    result_family: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    ready,
    blockers,
    checks,
    legacy_track: GOOD_TROUBLE_LEGACY,
    canonical_track: {
      partner_id: partnerId,
      app_slug: appSlug,
      policy_id: GOOD_TROUBLE_CANONICAL_POLICY_ID,
      policy_template: GOOD_TROUBLE_CANONICAL_POLICY_TEMPLATE,
      result_family: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
      handoff_endpoint: "/api/v1/partner-handoff",
    },
  };
}

export function formatReadinessReport(report: GoodTroubleReadinessReport): string {
  const lines: string[] = [
    "",
    "Good Trouble Production Readiness (read-only)",
    "=".repeat(50),
    `Partner: ${report.partner_id} · App: ${report.app_slug}`,
    `Policy: ${report.policy_template} → ${report.result_family}`,
    `Ready: ${report.ready ? "YES" : "NO"}`,
  ];
  if (report.blockers.length) {
    lines.push(`Blockers: ${report.blockers.join(", ")}`);
  }
  lines.push("", "Checks:");
  for (const item of report.checks) {
    const crit = item.critical ? "" : " (non-critical)";
    lines.push(`  [${item.status}] ${item.id}${crit}: ${item.detail}`);
  }
  lines.push("");
  return lines.join("\n");
}
