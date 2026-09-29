// FILE: lib/partner/launchpad/multiPolicyNextAction.ts
// Deterministic next actions for multi-policy partner workspace.

import type { ApplicationPoliciesSummary } from "@/lib/partner/launchpad/applicationPolicyBindings";

export function resolveMultiPolicyNextAction(
  summary: ApplicationPoliciesSummary,
): string | null {
  if (summary.configured_count === 0) {
    return "configure_first_policy";
  }

  const primary = summary.bindings.find((b) => b.binding_role === "primary") ?? summary.bindings[0];
  if (!primary) return "configure_first_policy";

  const hasVerifiedReceipt = summary.bindings.some(
    (b) => (b.verified_receipts ?? 0) > 0,
  );
  if (!hasVerifiedReceipt) {
    return "test_sandbox_receipt";
  }

  if (
    primary.policy_production_eligible
    && !primary.application_production_authorized
    && primary.application_environment === "sandbox"
  ) {
    return "request_production_review";
  }

  if (
    summary.available_to_add.length > 0
    && summary.configured_count >= 1
    && hasVerifiedReceipt
    && primary.application_production_authorized
  ) {
    return "add_another_eligibility_policy";
  }

  if (summary.available_to_add.length > 0 && hasVerifiedReceipt && summary.configured_count === 1) {
    const secondaryCandidate = summary.available_to_add[0];
    if (secondaryCandidate?.policy_production_eligible) {
      return "add_another_eligibility_policy";
    }
    return "test_additional_policy_in_sandbox";
  }

  return null;
}

export function humanizeMultiPolicyNextAction(action: string | null): string | null {
  if (!action) return null;
  const labels: Record<string, string> = {
    configure_first_policy: "Configure first policy",
    test_sandbox_receipt: "Test sandbox receipt",
    request_production_review: "Request production review",
    add_another_eligibility_policy: "Add another eligibility policy",
    test_additional_policy_in_sandbox: "Test additional policy in sandbox",
    add_server_verification: "Add server verification",
    complete_production_activation: "Complete production activation",
  };
  return labels[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
