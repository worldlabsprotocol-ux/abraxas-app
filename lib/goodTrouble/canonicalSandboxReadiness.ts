// FILE: lib/goodTrouble/canonicalSandboxReadiness.ts
// Read-only canonical Good Trouble sandbox execution readiness.

import {
  buildLaunchpadJourneyInput,
  integrationEndToEndEvidenced,
  launchpadApplicationToJourneyApplication,
  type MerchantJourneyIntegrationEvidence,
} from "@/lib/partner/launchpad/journeyInput";
import {
  resolveLaunchpadJourneyState,
  type LaunchpadJourneyStateId,
} from "@/lib/partner/launchpad/journeyState";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_FIRST_TEST,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_POLICY_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
  GOOD_TROUBLE_LEGACY_SANDBOX,
} from "@/lib/goodTrouble/canonicalSandboxConfig";

export type SandboxReadinessStatus = "PASS" | "FAIL" | "UNKNOWN";

export interface SandboxReadinessCheck {
  id: string;
  status: SandboxReadinessStatus;
  detail: string;
  critical: boolean;
}

export interface SandboxCredentialSummary {
  id: string;
  key_prefix: string;
  revoked_at: string | null;
  partner_id: string;
  launchpad_application_id: string | null;
}

export interface CanonicalSandboxTruth {
  partner_id: string;
  application_id: string | null;
  public_slug: string;
  environment: string | null;
  policy_template_id: string | null;
  policy_id: string | null;
  binding_id: string | null;
  callback_url: string;
  callback_allowlisted: boolean;
  sandbox_credential: {
    exists: boolean;
    active: boolean;
    key_prefix: string | null;
    id: string | null;
  };
  verified_receipt_count: number;
  launchpad_stage: LaunchpadJourneyStateId | "unknown";
  next_action: string;
}

export interface CanonicalSandboxReadinessReport {
  generated_at: string;
  ready_for_first_test: boolean;
  blockers: string[];
  checks: SandboxReadinessCheck[];
  truth: CanonicalSandboxTruth;
  legacy_track: typeof GOOD_TROUBLE_LEGACY_SANDBOX;
  first_test: typeof GOOD_TROUBLE_CANONICAL_FIRST_TEST;
}

export interface CanonicalSandboxReadinessDeps {
  loadApplication: (slug: string) => Promise<LaunchpadApplicationRow | null>;
  loadSandboxCredential: (keyId: string) => Promise<SandboxCredentialSummary | null>;
  countVerifiedReceipts: (input: {
    partnerId: string;
    applicationId: string;
  }) => Promise<number | null>;
  primaryBindingId?: (applicationId: string) => string;
}

function check(
  input: Omit<SandboxReadinessCheck, "critical"> & { critical?: boolean },
): SandboxReadinessCheck {
  return { critical: true, ...input };
}

export function resolveSandboxNextAction(input: {
  stage: LaunchpadJourneyStateId | "unknown";
  callbackAllowlisted: boolean;
  sandboxCredentialActive: boolean;
  applicationExists: boolean;
}): string {
  if (!input.applicationExists) {
    return "Provision canonical Launchpad application good-trouble before testing.";
  }
  if (!input.callbackAllowlisted) {
    return "Register https://www.goodtroublecanna.com/age-verification-result on the application allowlist.";
  }
  if (!input.sandboxCredentialActive) {
    return "Issue or reactivate sandbox credential for the canonical application.";
  }
  if (input.stage === "connection_required" || input.stage === "ready_for_first_test") {
    return "Run first holder verification via /partner/verify?app=good-trouble with the Wix callback.";
  }
  if (input.stage === "test_passed") {
    return "First sandbox verification succeeded — review Launchpad Connect/Test evidence.";
  }
  return "Continue Launchpad merchant journey from current authoritative stage.";
}

export async function evaluateCanonicalSandboxReadiness(
  deps: CanonicalSandboxReadinessDeps,
): Promise<CanonicalSandboxReadinessReport> {
  const checks: SandboxReadinessCheck[] = [];
  const blockers: string[] = [];

  const app = await deps.loadApplication(GOOD_TROUBLE_CANONICAL_APP_SLUG);
  if (!app) {
    checks.push(check({
      id: "canonical_application",
      status: "FAIL",
      detail: `No Launchpad application public_slug=${GOOD_TROUBLE_CANONICAL_APP_SLUG}.`,
    }));
    blockers.push("canonical_application");
  } else {
    checks.push(check({
      id: "canonical_application",
      status: app.public_slug === GOOD_TROUBLE_CANONICAL_APP_SLUG ? "PASS" : "FAIL",
      detail: app.public_slug === GOOD_TROUBLE_CANONICAL_APP_SLUG
        ? `Application ${app.id} is active (${app.status}, ${app.environment}).`
        : `Expected slug ${GOOD_TROUBLE_CANONICAL_APP_SLUG}, found ${app.public_slug}.`,
    }));
    if (app.partner_id !== GOOD_TROUBLE_CANONICAL_PARTNER_ID) {
      checks.push(check({
        id: "canonical_partner_id",
        status: "FAIL",
        detail: `Application partner_id=${app.partner_id} does not match canonical ${GOOD_TROUBLE_CANONICAL_PARTNER_ID}.`,
      }));
      blockers.push("canonical_partner_mismatch");
    } else {
      checks.push(check({
        id: "canonical_partner_id",
        status: "PASS",
        detail: "Application partner_id matches canonical good-trouble.",
        critical: false,
      }));
    }
    if (app.policy_id !== GOOD_TROUBLE_CANONICAL_POLICY_ID) {
      checks.push(check({
        id: "canonical_policy_binding",
        status: "FAIL",
        detail: `Expected policy ${GOOD_TROUBLE_CANONICAL_POLICY_ID}, found ${app.policy_id}.`,
      }));
      blockers.push("canonical_policy_mismatch");
    } else {
      checks.push(check({
        id: "canonical_policy_binding",
        status: "PASS",
        detail: `Policy ${app.policy_template_id} → ${app.policy_id} v${app.policy_version}.`,
        critical: false,
      }));
    }
  }

  const callbackAllowlisted = app
    ? isLaunchpadReturnUrlAllowlisted(app.allowed_return_urls, GOOD_TROUBLE_EXPECTED_CALLBACK_URL)
    : false;
  checks.push(check({
    id: "wix_callback_allowlisted",
    status: app ? (callbackAllowlisted ? "PASS" : "FAIL") : "UNKNOWN",
    detail: app
      ? (callbackAllowlisted
        ? "Wix callback is authorized on the canonical application."
        : "Wix callback missing from application allowed_return_urls.")
      : "Cannot inspect callback without application.",
  }));
  if (app && !callbackAllowlisted) blockers.push("wix_callback_not_allowlisted");

  let credential: SandboxCredentialSummary | null = null;
  if (app?.api_key_id) {
    credential = await deps.loadSandboxCredential(app.api_key_id);
  }
  const sandboxCredentialActive = Boolean(credential && !credential.revoked_at);
  checks.push(check({
    id: "sandbox_credential",
    status: app?.api_key_id
      ? (credential
        ? (sandboxCredentialActive ? "PASS" : "FAIL")
        : "UNKNOWN")
      : "FAIL",
    detail: app?.api_key_id
      ? (credential
        ? (sandboxCredentialActive
          ? `Active sandbox credential prefix ${credential.key_prefix}…`
          : "Sandbox credential is revoked or inactive.")
        : "Could not load sandbox credential metadata.")
      : "Application has no sandbox api_key_id.",
  }));
  if (app && !sandboxCredentialActive) blockers.push("sandbox_credential_inactive");

  let verifiedReceiptCount = 0;
  if (app) {
    const counted = await deps.countVerifiedReceipts({
      partnerId: app.partner_id,
      applicationId: app.id,
    });
    verifiedReceiptCount = counted ?? 0;
    checks.push(check({
      id: "verified_receipt_evidence",
      status: counted === null ? "UNKNOWN" : "PASS",
      detail: counted === null
        ? "Could not load integration events — verified receipt count unknown."
        : `${verifiedReceiptCount} receipt_verification_succeeded event(s) for this application.`,
      critical: false,
    }));
  }

  let launchpadStage: LaunchpadJourneyStateId | "unknown" = "unknown";
  let nextAction = "Inspect authoritative Launchpad state.";
  if (app) {
    const integration: MerchantJourneyIntegrationEvidence = {
      verified_receipt_count: verifiedReceiptCount,
      receipt_verification_succeeded_count: verifiedReceiptCount,
      hosted_handoff_completed_count: 0,
    };
    const journeyInput = buildLaunchpadJourneyInput({
      application: launchpadApplicationToJourneyApplication({
        ...app,
        integration_status: app.status === "pending" ? "pending" : "ready",
      }),
      activeSandboxKey: sandboxCredentialActive,
      integration,
    });
    launchpadStage = resolveLaunchpadJourneyState(journeyInput).state;
    nextAction = resolveSandboxNextAction({
      stage: launchpadStage,
      callbackAllowlisted,
      sandboxCredentialActive,
      applicationExists: true,
    });
    checks.push(check({
      id: "launchpad_stage",
      status: "PASS",
      detail: `Launchpad stage: ${launchpadStage.replace(/_/g, " ")}.`,
      critical: false,
    }));
  }

  checks.push(check({
    id: "legacy_distinction",
    status: "PASS",
    detail: `Canonical track=${GOOD_TROUBLE_CANONICAL_PARTNER_ID}; legacy=${GOOD_TROUBLE_LEGACY_SANDBOX.partner_id} (compatibility only).`,
    critical: false,
  }));

  const readyForFirstTest = blockers.length === 0;

  return {
    generated_at: new Date().toISOString(),
    ready_for_first_test: readyForFirstTest,
    blockers,
    checks,
    truth: {
      partner_id: GOOD_TROUBLE_CANONICAL_PARTNER_ID,
      application_id: app?.id ?? null,
      public_slug: GOOD_TROUBLE_CANONICAL_APP_SLUG,
      environment: app?.environment ?? null,
      policy_template_id: app?.policy_template_id ?? null,
      policy_id: app?.policy_id ?? null,
      binding_id: app ? (deps.primaryBindingId?.(app.id) ?? `primary:${app.id}`) : null,
      callback_url: GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
      callback_allowlisted: callbackAllowlisted,
      sandbox_credential: {
        exists: Boolean(credential),
        active: sandboxCredentialActive,
        key_prefix: credential?.key_prefix ?? null,
        id: credential?.id ?? null,
      },
      verified_receipt_count: verifiedReceiptCount,
      launchpad_stage: launchpadStage,
      next_action: nextAction,
    },
    legacy_track: GOOD_TROUBLE_LEGACY_SANDBOX,
    first_test: GOOD_TROUBLE_CANONICAL_FIRST_TEST,
  };
}

export function formatSandboxReadinessReport(report: CanonicalSandboxReadinessReport): string {
  const lines = [
    "",
    "Good Trouble — Canonical Sandbox Readiness (read-only)",
    "=".repeat(52),
    `Partner: ${report.truth.partner_id} · App: ${report.truth.public_slug}`,
    `Policy: ${report.first_test.policy_template} → ${report.first_test.result_family}`,
    `Ready for first test: ${report.ready_for_first_test ? "YES" : "NO"}`,
  ];
  if (report.blockers.length) {
    lines.push(`Blockers: ${report.blockers.join(", ")}`);
  }
  lines.push("", "Checks:");
  for (const item of report.checks) {
    lines.push(`  [${item.status}] ${item.id}: ${item.detail}`);
  }
  lines.push(
    "",
    `Launchpad stage: ${report.truth.launchpad_stage}`,
    `Next action: ${report.truth.next_action}`,
    "",
    "First test configuration:",
    `  Verify: /partner/verify?app=${report.first_test.application_slug}`,
    `  Callback: ${report.first_test.return_url}`,
    `  Holder purpose: ${report.first_test.holder_purpose}`,
  );
  return lines.join("\n");
}

export function sandboxReadinessLeaks(report: CanonicalSandboxReadinessReport): string[] {
  const safe = {
    ...report,
    truth: {
      ...report.truth,
      sandbox_credential: {
        ...report.truth.sandbox_credential,
        key_prefix: report.truth.sandbox_credential.key_prefix ? "[redacted-prefix]" : null,
      },
    },
  };
  const serialized = JSON.stringify(safe);
  const leaks: string[] = [];
  if (/abx_test_[A-Za-z0-9]{8,}/.test(serialized)) leaks.push("sandbox_credential_secret");
  if (/abx_live_[A-Za-z0-9]{4,}/.test(serialized)) leaks.push("production_credential");
  if (/eyJ[A-Za-z0-9_-]{10,}/.test(serialized)) leaks.push("jwt_like_secret");
  return leaks;
}
