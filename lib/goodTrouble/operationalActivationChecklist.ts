// FILE: lib/goodTrouble/operationalActivationChecklist.ts
// Concise Good Trouble production activation checklist with PASS/BLOCKED status.

export type ActivationCheckStatus = "PASS" | "BLOCKED" | "UNKNOWN";

export interface OperationalActivationCheck {
  id: string;
  label: string;
  status: ActivationCheckStatus;
  evidence: string;
}

export interface OperationalActivationReport {
  generated_at: string;
  target_supabase_project_ref: string;
  /** Prerequisites met to begin production activation review — not the same as activation complete. */
  ready_for_production_activation: boolean;
  /** Production credential issued, activation timestamp set, and environment promoted. */
  production_activation_complete: boolean;
  ready_for_sandbox_proof: boolean;
  checks: OperationalActivationCheck[];
  founder_actions: string[];
}

const ACTIVATION_PREREQUISITE_CHECK_IDS = [
  "migration_122_l0_policy",
  "launchpad_application",
  "policy_version_pin",
  "callback_allowlist",
  "hosted_handoff_contract",
  "sandbox_credential",
  "sandbox_readiness",
  "sandbox_proof_executed",
] as const;

/** Build checklist from evaluated readiness evidence (read-only inputs). */
export function buildOperationalActivationReport(input: {
  supabaseProjectRef: string;
  migration122Applied: boolean;
  activePolicyVersion: number | null;
  activePolicyL0: boolean;
  launchpadAppExists: boolean;
  launchpadAppPolicyVersion: number | null;
  launchpadEnvironment: string | null;
  productionActivated: boolean;
  productionApiKeyPresent: boolean;
  sandboxCredentialActive: boolean;
  callbackAllowlisted: boolean;
  callbackUrl: string;
  policyId: string;
  partnerHandoffFailClosed: boolean;
  sandboxReadinessReady: boolean;
  verifiedReceiptCount: number;
}): OperationalActivationReport {
  const policyVersionAligned = input.launchpadAppPolicyVersion != null
    && input.activePolicyVersion != null
    && input.launchpadAppPolicyVersion === input.activePolicyVersion;

  const checks: OperationalActivationCheck[] = [
    {
      id: "migration_122_l0_policy",
      label: "Migration 122 L0 policy active in Supabase",
      status: input.migration122Applied && input.activePolicyL0 ? "PASS" : "BLOCKED",
      evidence: input.migration122Applied
        ? `partner_policies ${input.policyId} active v${input.activePolicyVersion ?? "?"} with age_eligibility_only=true`
        : "Active policy missing L0 age_eligibility_only rules",
    },
    {
      id: "launchpad_application",
      label: "Launchpad application good-trouble exists",
      status: input.launchpadAppExists ? "PASS" : "BLOCKED",
      evidence: input.launchpadAppExists
        ? "partner_launchpad_applications row public_slug=good-trouble"
        : "No Launchpad application row",
    },
    {
      id: "policy_version_pin",
      label: "Launchpad app policy_version matches active policy",
      status: policyVersionAligned ? "PASS" : "BLOCKED",
      evidence: policyVersionAligned
        ? `Application pins v${input.launchpadAppPolicyVersion} (matches active)`
        : `Application pins v${input.launchpadAppPolicyVersion ?? "?"} but active policy is v${input.activePolicyVersion ?? "?"}`,
    },
    {
      id: "callback_allowlist",
      label: "Approved callback URL allowlisted",
      status: input.callbackAllowlisted ? "PASS" : "BLOCKED",
      evidence: input.callbackAllowlisted
        ? `${input.callbackUrl} on application + partner allowlists`
        : `Missing allowlist entry for ${input.callbackUrl}`,
    },
    {
      id: "hosted_handoff_contract",
      label: "Hosted-handoff API fail-closed without credentials",
      status: input.partnerHandoffFailClosed ? "PASS" : "UNKNOWN",
      evidence: input.partnerHandoffFailClosed
        ? "POST /api/v1/partner-handoff returns 401 unauthorized without Bearer key"
        : "Live contract probe inconclusive",
    },
    {
      id: "sandbox_credential",
      label: "Sandbox credential active for first proof",
      status: input.sandboxCredentialActive ? "PASS" : "BLOCKED",
      evidence: input.sandboxCredentialActive
        ? "abx_test_* sandbox key linked to application (prefix only in reports)"
        : "No active sandbox api_key_id",
    },
    {
      id: "sandbox_readiness",
      label: "Sandbox readiness preflight",
      status: input.sandboxReadinessReady ? "PASS" : "BLOCKED",
      evidence: input.sandboxReadinessReady
        ? "npm run good-trouble:sandbox-readiness ready_for_first_test=true"
        : "Sandbox preflight not ready",
    },
    {
      id: "sandbox_proof_executed",
      label: "Sandbox E2E proof (receipt verify + reuse + under-21)",
      status: input.verifiedReceiptCount > 0 ? "PASS" : "BLOCKED",
      evidence: input.verifiedReceiptCount > 0
        ? `${input.verifiedReceiptCount} receipt_verification_succeeded event(s) recorded`
        : "0 verified receipt events — live sandbox proof not yet recorded",
    },
    {
      id: "production_activation",
      label: "Production activation (abx_live_* + production_activated_at)",
      status: input.productionActivated && input.productionApiKeyPresent ? "PASS" : "BLOCKED",
      evidence: input.productionActivated && input.productionApiKeyPresent
        ? "Production credential issued and activation timestamp set"
        : "production_activated_at null and/or production_api_key_id missing",
    },
    {
      id: "application_environment",
      label: "Application environment set to production",
      status: input.launchpadEnvironment === "production" ? "PASS" : "BLOCKED",
      evidence: `Launchpad application environment=${input.launchpadEnvironment ?? "unknown"}`,
    },
  ];

  const founder_actions: string[] = [];
  if (!policyVersionAligned) {
    founder_actions.push(
      "Update Launchpad application policy_version to match active partner_policies version (currently v2 after migration 122).",
    );
  }
  if (!input.sandboxReadinessReady || input.verifiedReceiptCount === 0) {
    founder_actions.push(
      "Run sandbox proof: holder flow via /partner/verify?app=good-trouble, verify receipt server-side, repeat for reuse, confirm under-21 denial — using abx_test_* key.",
    );
  }
  if (!input.productionActivated) {
    founder_actions.push(
      "After sandbox proof, activate production in Launchpad (issues abx_live_*; sets production_activated_at). Do not activate before sandbox proof.",
    );
  }
  if (input.launchpadEnvironment !== "production") {
    founder_actions.push(
      "Promote Launchpad application environment from sandbox to production after reviewed activation.",
    );
  }
  founder_actions.push(
    "Deploy Good Trouble Wix backend modules from examples/good-trouble-wix/backend/ — no evidence of live Wix deployment from this repository.",
  );
  founder_actions.push(
    "Fix .env.local Supabase anon key mismatch: NEXT_PUBLIC_SUPABASE_URL points to bztwutzprwsdrtqdpymf but anon key JWT ref is ocntwbxarpjeixdnzide.",
  );

  const production_activation_complete = input.productionActivated
    && input.productionApiKeyPresent
    && input.launchpadEnvironment === "production";

  const ready_for_production_activation = ACTIVATION_PREREQUISITE_CHECK_IDS.every((id) => {
    const check = checks.find((item) => item.id === id);
    return check?.status === "PASS";
  });

  return {
    generated_at: new Date().toISOString(),
    target_supabase_project_ref: input.supabaseProjectRef,
    ready_for_production_activation,
    production_activation_complete,
    ready_for_sandbox_proof: input.sandboxReadinessReady && input.sandboxCredentialActive,
    checks,
    founder_actions,
  };
}
