// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.shared.ts
// Browser-safe policy availability types and pure presentation helpers (no server env or crypto).

export type SandboxAgeExperienceKind =
  | "age_21_test"
  | "age_21_verification_pending"
  | "age_21_unavailable";

export type SandboxWalletControlExperienceKind = "wallet_control_genuine";

export type SandboxPolicyExecutionStatus = "ready" | "evidence_unavailable";

export type SandboxPolicyPresentationMethod =
  | {
      id: "authorized_test_issuer_credential";
      label: string;
      sandbox_labeled: true;
      production_trusted: false;
    }
  | {
      id: "production_issuer_credential";
      label: string;
      sandbox_labeled: false;
      production_trusted: true;
    };

export type SandboxPolicyAvailability = {
  policy_id: string;
  execution_status: SandboxPolicyExecutionStatus;
  availability_label: string;
  availability_detail: string;
  can_request_verification: boolean;
  presentation_methods?: SandboxPolicyPresentationMethod[];
  wallet_control_experience?: SandboxWalletControlExperienceKind;
  age_experience?: SandboxAgeExperienceKind;
  user_facing_headline?: string;
};

/** Resolve availability from server-provided `/sandbox/policies` payload only. */
export function pickSandboxPolicyAvailability(
  availability: SandboxPolicyAvailability[],
  policyId: string,
): SandboxPolicyAvailability | undefined {
  return availability.find((row) => row.policy_id === policyId);
}

export function firstSandboxPolicyIdWithVerification(
  policies: Array<{ policy_id: string }>,
  availability: SandboxPolicyAvailability[],
): string | undefined {
  const match = policies.find(
    (p) => pickSandboxPolicyAvailability(availability, p.policy_id)?.can_request_verification,
  );
  return match?.policy_id ?? policies[0]?.policy_id;
}
