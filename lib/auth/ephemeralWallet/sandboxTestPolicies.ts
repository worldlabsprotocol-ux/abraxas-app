// FILE: lib/auth/ephemeralWallet/sandboxTestPolicies.ts
// Static sandbox-only policies for ephemeral wallet developers (not Production issuance).

export const EPHEMERAL_SANDBOX_TEST_PARTNER_ID = "ephemeral_wallet_sandbox" as const;

export type EphemeralSandboxTestPolicy = {
  policy_id: string;
  policy_version: number;
  label: string;
  description: string;
  claim_type: string;
  sandbox_only: true;
  production_usable: false;
};

export const EPHEMERAL_SANDBOX_TEST_POLICIES: EphemeralSandboxTestPolicy[] = [
  {
    policy_id: "wallet_control",
    policy_version: 1,
    label: "Wallet Control",
    description: "Confirm control of the connected wallet.",
    claim_type: "wallet_control",
    sandbox_only: true,
    production_usable: false,
  },
  {
    policy_id: "age_21_retail",
    policy_version: 1,
    label: "Age 21",
    description: "Requires valid evidence from a supported issuer. A signature alone does not prove age.",
    claim_type: "age_21",
    sandbox_only: true,
    production_usable: false,
  },
];

export function resolveEphemeralSandboxTestPolicy(policyId: string): EphemeralSandboxTestPolicy | null {
  return EPHEMERAL_SANDBOX_TEST_POLICIES.find((p) => p.policy_id === policyId) ?? null;
}
