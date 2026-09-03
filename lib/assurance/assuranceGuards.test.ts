// FILE: lib/assurance/assuranceGuards.test.ts

import { describe, expect, it } from "vitest";
import {
  assertAssuranceNotSilentlyUpgraded,
  assertFreshReceiptIssue,
  assertPolicyTransactionRequirementDeclared,
  assertPolicyVersionMatches,
  assertReceiptAudienceMatches,
  authenticationCanSatisfyAssurance,
  buildMerchantSafeAssuranceDecision,
  credentialAssuranceSatisfiesPolicy,
  credentialStatusBlocksEvaluation,
  maxEligibilityFromAuthentication,
  policyRequiresExplicitAssurance,
  resolveCredentialAssurance,
} from "./assuranceGuards";
import { meetsMinimumEligibilityAssurance } from "./eligibilityAssurance";
import { assertMerchantSafeCredentialView } from "./reusableCredential";
import { sanitizePartnerPayload } from "@/lib/partner/partnerVerificationResult";
import { ELIGIBILITY_POLICY_EXAMPLES } from "./eligibilityPolicyCatalog";
import { isKnownTransactionRequirement } from "./transactionRequirement";

const missouriPolicy = ELIGIBILITY_POLICY_EXAMPLES.find(
  (p) => p.policy_id === "missouri-cannabis-precheck-v1",
)!;

describe("eligibility assurance guards", () => {
  it("cannot silently upgrade assurance levels", () => {
    expect(() => assertAssuranceNotSilentlyUpgraded("SELF_ATTESTED", "AGE_ESTIMATED")).toThrow(
      /assurance_silent_upgrade_blocked/,
    );
    expect(() => assertAssuranceNotSilentlyUpgraded("AGE_ESTIMATED", "AGE_VERIFIED")).toThrow(
      /assurance_silent_upgrade_blocked/,
    );
    expect(() => assertAssuranceNotSilentlyUpgraded("AGE_VERIFIED", "AGE_VERIFIED")).not.toThrow();
  });

  it("zkLogin alone never produces AGE_VERIFIED or AGE_ESTIMATED", () => {
    expect(maxEligibilityFromAuthentication("zklogin_google")).toBe("SELF_ATTESTED");
    expect(authenticationCanSatisfyAssurance("zklogin_google", "AGE_ESTIMATED")).toBe(false);
    expect(authenticationCanSatisfyAssurance("zklogin_google", "AGE_VERIFIED")).toBe(false);
    expect(authenticationCanSatisfyAssurance("browser_session", "AGE_VERIFIED")).toBe(false);
  });

  it("SELF_ATTESTED cannot satisfy AGE_VERIFIED policy minimum", () => {
    expect(
      credentialAssuranceSatisfiesPolicy("SELF_ATTESTED", {
        policy_id: "event-entry-21-v1",
        policy_version: 1,
        minimum_assurance: "AGE_VERIFIED",
        transaction_requirement: "TRANSACTION_ID_REQUIRED",
      }),
    ).toBe(false);
    expect(meetsMinimumEligibilityAssurance("SELF_ATTESTED", "AGE_VERIFIED")).toBe(false);
  });

  it("AGE_VERIFIED plus TRANSACTION_ID_REQUIRED is valid", () => {
    const policy = {
      policy_id: missouriPolicy.policy_id,
      policy_version: 1,
      minimum_assurance: missouriPolicy.minimum_assurance,
      transaction_requirement: missouriPolicy.transaction_requirement,
    };

    expect(credentialAssuranceSatisfiesPolicy("AGE_VERIFIED", policy)).toBe(true);
    expect(resolveCredentialAssurance("AGE_VERIFIED", "TRANSACTION_ID_REQUIRED")).toBe("AGE_VERIFIED");

    const decision = buildMerchantSafeAssuranceDecision({
      decision: "approved",
      credentialAssurance: "AGE_VERIFIED",
      policy,
    });
    expect(decision.assurance_level).toBe("AGE_VERIFIED");
    expect(decision.transaction_requirement).toBe("TRANSACTION_ID_REQUIRED");
  });

  it("TRANSACTION_ID_REQUIRED cannot upgrade assurance", () => {
    expect(resolveCredentialAssurance("SELF_ATTESTED", "TRANSACTION_ID_REQUIRED")).toBe("SELF_ATTESTED");
    expect(resolveCredentialAssurance("AGE_ESTIMATED", "TRANSACTION_ID_REQUIRED")).toBe("AGE_ESTIMATED");
    expect(resolveCredentialAssurance("AGE_VERIFIED", "TRANSACTION_ID_REQUIRED")).toBe("AGE_VERIFIED");
  });

  it("requires explicit minimum assurance and transaction requirement on partner policies", () => {
    expect(policyRequiresExplicitAssurance(null)).toBe(false);
    expect(policyRequiresExplicitAssurance({
      policy_id: "event-entry-21-v1",
      policy_version: 1,
      minimum_assurance: "AGE_VERIFIED",
      transaction_requirement: "TRANSACTION_ID_REQUIRED",
    })).toBe(true);

    expect(() => assertPolicyTransactionRequirementDeclared({
      policy_id: "event-entry-21-v1",
      policy_version: 1,
      minimum_assurance: "AGE_VERIFIED",
      transaction_requirement: "UNKNOWN" as never,
    })).toThrow(/transaction_requirement_required/);

    expect(isKnownTransactionRequirement(undefined)).toBe(false);
  });

  it("fails closed on expired and revoked credentials", () => {
    expect(credentialStatusBlocksEvaluation("revoked")).toBe(true);
    expect(credentialStatusBlocksEvaluation("active", new Date("2026-01-01T00:00:00Z"), "2025-01-01T00:00:00Z")).toBe(true);
    expect(credentialStatusBlocksEvaluation("active", new Date("2026-01-01T00:00:00Z"), "2027-01-01T00:00:00Z")).toBe(false);
  });

  it("regulated precheck policies preserve transaction-time ID requirements independently", () => {
    expect(missouriPolicy.transaction_requirement).toBe("TRANSACTION_ID_REQUIRED");
    expect(missouriPolicy.minimum_assurance).toBe("AGE_VERIFIED");
    expect(meetsMinimumEligibilityAssurance("AGE_VERIFIED", missouriPolicy.minimum_assurance)).toBe(true);
  });

  it("merchant-facing output excludes DOB and document fields while retaining transaction requirements", () => {
    expect(() => assertMerchantSafeCredentialView({ decision: "approved", over_21: true })).not.toThrow();
    expect(() => assertMerchantSafeCredentialView({ date_of_birth: "1990-01-01" })).toThrow(
      /merchant_view_contains_forbidden_field/,
    );

    const partner = sanitizePartnerPayload({
      decision: "approved",
      over_21: true,
      transaction_requirement: "TRANSACTION_ID_REQUIRED",
      date_of_birth: "hidden",
      passport_image: "hidden",
      document_number: "hidden",
    } as Record<string, unknown>);
    expect(partner).not.toHaveProperty("date_of_birth");
    expect(partner).not.toHaveProperty("passport_image");
    expect(partner).not.toHaveProperty("document_number");

    const merchantDecision = buildMerchantSafeAssuranceDecision({
      decision: "approved",
      credentialAssurance: "AGE_VERIFIED",
      policy: {
        policy_id: missouriPolicy.policy_id,
        policy_version: 1,
        minimum_assurance: "AGE_VERIFIED",
        transaction_requirement: "TRANSACTION_ID_REQUIRED",
      },
    });
    expect(merchantDecision.transaction_requirement).toBe("TRANSACTION_ID_REQUIRED");
    expect(JSON.stringify(merchantDecision)).not.toMatch(/date_of_birth|passport_image|document_number/i);
  });

  it("fails closed on issuer audience and policy version mismatches", () => {
    expect(() =>
      assertReceiptAudienceMatches({ partner_id: "partner-a" }, "partner-b"),
    ).toThrow(/audience_mismatch/);

    expect(() =>
      assertPolicyVersionMatches(
        { policy_id: "event-entry-21-v1", policy_version: 2 },
        { policy_id: "event-entry-21-v1", policy_version: 1 },
      ),
    ).toThrow(/policy_version_mismatch/);
  });

  it("blocks one-time receipt replay", () => {
    expect(() => assertFreshReceiptIssue("idempotent_replay")).toThrow(/receipt_replay_blocked/);
    expect(() => assertFreshReceiptIssue("issued")).not.toThrow();
  });
});
