// FILE: lib/auth/ephemeralWallet/sandboxPolicyAvailability.server.ts

import "server-only";

import { resolveEphemeralSandboxTestPolicy } from "./sandboxTestPolicies";
import {
  isProductionAgeIssuerConfigured,
  isSandboxTestIssuerRuntimeAllowed,
} from "@/lib/protocolVerification/ephemeralAuthorizedTestIssuer";
import type { SandboxPolicyAvailability } from "./sandboxPolicyAvailability.shared";

export type {
  SandboxAgeExperienceKind,
  SandboxPolicyAvailability,
  SandboxPolicyExecutionStatus,
  SandboxPolicyPresentationMethod,
  SandboxWalletControlExperienceKind,
} from "./sandboxPolicyAvailability.shared";

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
      wallet_control_experience: "wallet_control_genuine",
      user_facing_headline: "Wallet control verification",
    };
  }

  if (policy.claim_type === "age_21") {
    const testIssuer = isSandboxTestIssuerRuntimeAllowed();
    const productionIssuer = isProductionAgeIssuerConfigured();
    if (testIssuer) {
      return {
        policy_id: policy.policy_id,
        execution_status: "ready",
        availability_label: "Age 21 test available",
        availability_detail:
          "This runs the eligibility verification process with an authorized test issuer. It does not prove your real world age.",
        can_request_verification: true,
        age_experience: "age_21_test",
        user_facing_headline: "Age 21 test",
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
        age_experience: "age_21_verification_pending",
        user_facing_headline: "Age 21 verification",
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
      availability_label: "Age 21 verification unavailable",
      availability_detail:
        "Real age verification needs a supported issuer and holder presentation. Sandbox test mode is not enabled in this environment.",
      can_request_verification: false,
      age_experience: "age_21_unavailable",
      user_facing_headline: "Age 21 verification",
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
