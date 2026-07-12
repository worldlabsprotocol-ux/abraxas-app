// FILE: lib/walletAuthority/revokeCascade.test.ts
import { describe, it, expect } from "vitest";
import { claimMatchesWalletBinding } from "@/lib/walletAuthority/revokeCascade";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";

const SUI = "0x0000000000000000000000000000000000000000000000000000000000000002";
const EVM = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

function bindingClaim(input: Partial<CredentialClaimRecord>): CredentialClaimRecord {
  return {
    id: input.id ?? "claim-1",
    subject_id: SUI,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: input.claim_value ?? {},
    issuer_id: "abraxas",
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: null,
    status: "active",
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: "core",
  };
}

describe("claimMatchesWalletBinding", () => {
  it("matches sui wallet binding claim", () => {
    const claim = bindingClaim({
      claim_value: { wallet_address: SUI, chain: "sui", binding_method: "signed_challenge" },
    });
    expect(claimMatchesWalletBinding(claim, "sui", SUI)).toBe(true);
  });

  it("matches evm wallet binding claim case-insensitively", () => {
    const claim = bindingClaim({
      claim_value: { wallet_address: EVM.toLowerCase(), chain: "evm", binding_method: "siwe" },
    });
    expect(claimMatchesWalletBinding(claim, "evm", EVM)).toBe(true);
  });

  it("does not match different chain", () => {
    const claim = bindingClaim({
      claim_value: { wallet_address: EVM, chain: "evm" },
    });
    expect(claimMatchesWalletBinding(claim, "sui", SUI)).toBe(false);
  });

  it("does not match different wallet on same chain", () => {
    const claim = bindingClaim({
      claim_value: { wallet_address: EVM, chain: "evm" },
    });
    expect(claimMatchesWalletBinding(claim, "evm", "0x0000000000000000000000000000000000000001")).toBe(false);
  });
});
