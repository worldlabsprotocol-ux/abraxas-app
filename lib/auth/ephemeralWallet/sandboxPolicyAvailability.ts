// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.ts

import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";
import {
  isEphemeralSandboxAuthorizedTestIssuerEnabled,
  isProductionAgeIssuerConfigured,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";

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
    const testIssuer = isEphemeralSandboxAuthorizedTestIssuerEnabled();
    const productionIssuer = isProductionAgeIssuerConfigured();
    if (testIssuer) {
      return {
        policy_id: policy.policy_id,
        execution_status: "ready",
        availability_label: "Test issuer credential available",
        availability_detail:
          "Age eligibility requires issuer signed evidence. The authorized test issuer demonstrates the verification path. Results stay sandbox labeled and are not Production trusted.",
        can_request_verification: true,
        presentation_methods: [
          {
            id: "authorized_test_issuer_credential",
            label: "Authorized test issuer credential (sandbox only)",
            sandbox_labeled: true,
            production_trusted: false,
          },
        ],
      };
    }
    if (productionIssuer) {
      return {
        policy_id: policy.policy_id,
        execution_status: "evidence_unavailable",
        availability_label: "Production issuer configured",
        availability_detail:
          "A production age issuer trust root is configured. Holder presentation from Passport is required before this workspace can execute age verification.",
        can_request_verification: false,
        presentation_methods: [
          {
            id: "production_issuer_credential",
            label: "Production issuer backed credential",
            sandbox_labeled: false,
            production_trusted: true,
          },
        ],
      };
    }
    return {
      policy_id: policy.policy_id,
      execution_status: "evidence_unavailable",
      availability_label: "Requires eligible issuer evidence",
      availability_detail:
        "Age verification needs a verifiable credential from a supported issuer. Enable the authorized test issuer for sandbox integration or configure a production issuer trust root.",
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
