// FILE: lib/institutional/mandate/enforceProtectedInstitutionalAction.adversarial.test.ts
// Build 886 — adversarial regression on the real enforcement entrypoint.

import { describe, expect, it } from "vitest";
import { buildEvidenceCommitment } from "@abraxas/independent-verifier";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
  sealedExecution,
  trustedPolicyForMandate,
} from "./controlledIssuerFixture";
import { enforceProtectedInstitutionalAction } from "./enforceInstitutionalAction";
import { hashProposedInstitutionalTransaction } from "./transactionContext";

const NOW = new Date("2026-06-15T12:00:00.000Z");

function receiptForMandate(signed: ReturnType<typeof buildControlledSignedMandate>) {
  const manifest = [
    {
      dependency_type: "reusable_fact" as const,
      fact_id: signed.payload.mandate_id,
      source_credential_id: null,
    },
  ];
  const commitment = buildEvidenceCommitment(manifest);
  return {
    cryptographically_verified: true,
    outcome: "permit" as const,
    policy_id: signed.payload.policy_id,
    policy_version: signed.payload.policy_version,
    evidence_commitment: commitment,
    evidence_manifest: manifest,
  };
}

describe("Build 886 enforceProtectedInstitutionalAction", () => {
  const fixture = buildControlledMandateIssuerFixture();

  it("permits mandate_and_abraxas_receipt when all proofs and sealed context align", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
      independentReceipt: receiptForMandate(signed),
    });
    expect(result.enforcement_action).toBe("permit");
  });

  it("permits mandate_only without receipt when trusted policy allows", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_only"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
    });
    expect(result.enforcement_action).toBe("permit");
  });

  it("rejects missing receipt when trusted policy requires mandate_and_abraxas_receipt", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
    });
    expect(result.enforcement_action).toBe("indeterminate");
    expect(result.reasons).toContain("independent_receipt_required");
  });

  it("rejects receipt on mandate_only trusted policy (no bypass via extra receipt)", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_only"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
      independentReceipt: receiptForMandate(signed),
    });
    expect(result.reasons).toContain("receipt_not_permitted_for_mandate_only_policy");
  });

  it("rejects manipulated transaction with valid mandate and receipt (context digest mismatch)", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const sealed = sealedExecution(BASE_TRANSACTION);
    const tampered = {
      ...sealed,
      transaction: { ...BASE_TRANSACTION, amount_usd: 1 },
    };
    expect(hashProposedInstitutionalTransaction(tampered.transaction)).not.toBe(sealed.context_digest);
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt"),
      trustedExecution: tampered,
      now: NOW,
      independentReceipt: receiptForMandate(signed),
    });
    expect(result.enforcement_action).toBe("indeterminate");
    expect(result.reasons).toContain("protected_transaction_context_digest_mismatch");
  });

  it("rejects trusted policy mismatch (caller cannot pick weaker policy via mandate)", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: {
        mode: "mandate_only",
        policy_id: signed.payload.policy_id,
        policy_version: 999,
        tenant_id: signed.payload.tenant_id,
        environment: "demo",
      },
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
    });
    expect(result.reasons).toContain("trusted_policy_version_mismatch");
  });

  it("rejects unbound receipt when binding is mandatory", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
      independentReceipt: {
        cryptographically_verified: true,
        outcome: "permit",
        policy_id: signed.payload.policy_id,
        policy_version: signed.payload.policy_version,
      },
    });
    expect(result.reasons).toContain("mandate_receipt_binding_required");
  });

  it("rejects indeterminate Abraxas outcome even when mandate scope matches", () => {
    const signed = buildControlledSignedMandate({ fixture });
    const receipt = receiptForMandate(signed);
    const result = enforceProtectedInstitutionalAction({
      signedMandate: signed,
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      trustedEnforcementPolicy: trustedPolicyForMandate(signed.payload, "mandate_and_abraxas_receipt"),
      trustedExecution: sealedExecution(BASE_TRANSACTION),
      now: NOW,
      independentReceipt: { ...receipt, outcome: "indeterminate" },
    });
    expect(result.enforcement_action).toBe("indeterminate");
    expect(result.reasons).toContain("abraxas_indeterminate");
  });
});
