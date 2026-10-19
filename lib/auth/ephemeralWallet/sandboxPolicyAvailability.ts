// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.ts

import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";

export type SandboxPolicyExecutionStatus = "ready" | "evidence_unavailable";

export type SandboxPolicyAvailability = {
  policy_id: string;
  execution_status: SandboxPolicyExecutionStatus;
  availability_label: string;
  availability_detail: string;
  can_request_verification: boolean;
};

export function resolveSandboxPolicyAvailability(policyId: string): SandboxPolicyAvailability | null {
  const policy = resolveEphemeralSandboxTestPolicy(policyId);
  if (!policy) return null;

  if (policy.claim_type === "wallet_control") {
    return {
      policy_id: policy.policy_id,
      execution_status: "ready",
      availability_label: "Ready to test",
      availability_detail: "Wallet control can be verified in this sandbox with your connected wallet.",
      can_request_verification: true,
    };
  }

  if (policy.claim_type === "age_21") {
    return {
      policy_id: policy.policy_id,
      execution_status: "evidence_unavailable",
      availability_label: "Requires eligible issuer evidence",
      availability_detail:
        "Age verification needs a verifiable credential from a supported issuer. This sandbox path does not collect or present issuer age evidence yet.",
      can_request_verification: false,
    };
  }

  return {
    policy_id: policy.policy_id,
    execution_status: "evidence_unavailable",
    availability_label: "Not available in sandbox",
    availability_detail: "This policy is not executable in the ephemeral developer sandbox.",
    can_request_verification: false,
  };
}

export function listSandboxPolicyAvailability(): SandboxPolicyAvailability[] {
  return ["wallet_control", "age_21_retail"]
    .map((id) => resolveSandboxPolicyAvailability(id))
    .filter((row): row is SandboxPolicyAvailability => row !== null);
}
