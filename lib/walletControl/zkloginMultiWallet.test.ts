// FILE: lib/walletControl/zkloginMultiWallet.test.ts
// P1 regression: zkLogin scoped claims must not expire unrelated EVM wallet claims.

import { describe, expect, it } from "vitest";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

const SUBJECT = "0x" + "a".repeat(64);

function walletClaim(input: {
  id: string;
  bindingId: string;
  chain: string;
  address: string;
  method: string;
}): CredentialClaimRecord {
  return {
    id: input.id,
    subject_id: SUBJECT,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {
      wallet_binding_id: input.bindingId,
      wallet_address: input.address,
      chain: input.chain,
      control_method: input.method,
    },
    issuer_id: "issuer:abraxas",
    assurance_level: input.chain === "evm" ? "L3" : "L2",
    issued_at: "2026-10-04T12:00:00.000Z",
    expires_at: "2026-10-05T12:00:00.000Z",
    status: "active",
    revocation_reference: null,
    evidence_reference: walletControlEvidenceRef(input.bindingId),
    jurisdiction: null,
    policy_scope: "core",
  };
}

describe("zkLogin multi-wallet claim independence", () => {
  it("keeps EVM wallet claim active alongside scoped Sui zkLogin claim", () => {
    const evmClaim = walletClaim({
      id: "claim-evm",
      bindingId: "evm-binding",
      chain: "evm",
      address: "0x1111111111111111111111111111111111111111",
      method: "siwe_evm",
    });
    const suiClaim = walletClaim({
      id: "claim-sui",
      bindingId: "sui-binding",
      chain: "sui",
      address: SUBJECT,
      method: "zklogin",
    });

    const evaluation = evaluatePolicyRules(
      {
        sandbox_only: true,
        required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
      },
      [evmClaim, suiClaim],
    );

    expect(evaluation.decision).toBe("approved");
    expect(evaluation.matched_claim_ids?.wallet_binding_confirmed).toBeTruthy();
  });

  it("revoking one scoped claim does not remove sibling claim eligibility", () => {
    const evmClaim = walletClaim({
      id: "claim-evm",
      bindingId: "evm-binding",
      chain: "evm",
      address: "0x1111111111111111111111111111111111111111",
      method: "siwe_evm",
    });
    const revokedSui = { ...walletClaim({
      id: "claim-sui",
      bindingId: "sui-binding",
      chain: "sui",
      address: SUBJECT,
      method: "zklogin",
    }), status: "revoked" as const };

    const evaluation = evaluatePolicyRules(
      {
        sandbox_only: true,
        required_claims: [{ claim_type: "wallet_binding_confirmed", min_assurance: "L1" }],
      },
      [evmClaim, revokedSui],
    );

    expect(evaluation.decision).toBe("approved");
    expect(evaluation.matched_claim_ids?.wallet_binding_confirmed).toBe("claim-evm");
  });
});
