// FILE: lib/walletControl/holderWalletView.test.ts

import { describe, expect, it } from "vitest";
import {
  buildHolderWalletViews,
  holderWalletFreshnessLabel,
  resolveHolderWalletControlStatus,
  shortenWalletAddress,
} from "@/lib/walletControl/holderWalletView";
import type { WalletBindingRecord } from "@/lib/walletAuthority/types";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

const SUBJECT = "0x" + "a".repeat(64);

function binding(id: string, address: string, status: WalletBindingRecord["binding_status"] = "active"): WalletBindingRecord {
  return {
    id,
    subject_id: SUBJECT,
    chain: "evm",
    chain_id: 1,
    wallet_address: address,
    binding_method: "siwe_evm",
    binding_status: status,
    verified_domain: "abraxas.app",
    verified_at: "2026-10-04T12:00:00.000Z",
    revoked_at: status === "revoked" ? "2026-10-04T13:00:00.000Z" : null,
    risk_status: "low",
  };
}

function claim(bindingId: string, address: string, expiresAt: string, status: CredentialClaimRecord["status"] = "active"): CredentialClaimRecord {
  return {
    id: `claim-${bindingId}`,
    subject_id: SUBJECT,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {
      wallet_binding_id: bindingId,
      wallet_address: address,
      chain: "evm",
      control_method: "siwe_evm",
    },
    issuer_id: "issuer:abraxas",
    assurance_level: "L3",
    issued_at: "2026-10-04T12:00:00.000Z",
    expires_at: expiresAt,
    status,
    revocation_reference: null,
    evidence_reference: walletControlEvidenceRef(bindingId),
    jurisdiction: null,
    policy_scope: "core",
  };
}

describe("holderWalletView", () => {
  it("shortens addresses for display", () => {
    expect(shortenWalletAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234…5678");
  });

  it("builds independent views for multiple wallets", () => {
    const views = buildHolderWalletViews({
      bindings: [
        binding("b1", "0x1111111111111111111111111111111111111111"),
        binding("b2", "0x2222222222222222222222222222222222222222"),
      ],
      claims: [
        claim("b1", "0x1111111111111111111111111111111111111111", "2026-10-05T12:00:00.000Z"),
        claim("b2", "0x2222222222222222222222222222222222222222", "2026-10-05T12:00:00.000Z"),
      ],
      now: new Date("2026-10-04T13:00:00.000Z"),
    });
    expect(views).toHaveLength(2);
    expect(views.every(v => v.controlStatus === "verified")).toBe(true);
  });

  it("marks expired evidence as refresh_needed", () => {
    const status = resolveHolderWalletControlStatus({
      bindingStatus: "active",
      claimStatus: "active",
      expiresAt: "2026-10-04T11:00:00.000Z",
      now: new Date("2026-10-04T13:00:00.000Z"),
    });
    expect(status).toBe("refresh_needed");
    expect(holderWalletFreshnessLabel(status)).toBe("Refresh control proof");
  });

  it("excludes revoked bindings by default", () => {
    const views = buildHolderWalletViews({
      bindings: [
        binding("b1", "0x1111111111111111111111111111111111111111", "revoked"),
        binding("b2", "0x2222222222222222222222222222222222222222", "active"),
      ],
      claims: [
        claim("b2", "0x2222222222222222222222222222222222222222", "2026-10-05T12:00:00.000Z"),
      ],
    });
    expect(views).toHaveLength(1);
    expect(views[0]?.id).toBe("b2");
  });

  it("supports 20-wallet lists without collapsing entries", () => {
    const bindings = Array.from({ length: 20 }, (_, i) =>
      binding(`b${i}`, `0x${String(i).padStart(40, "0")}`));
    const claims = bindings.map(b =>
      claim(b.id, b.wallet_address, "2026-10-05T12:00:00.000Z"));
    const views = buildHolderWalletViews({ bindings, claims });
    expect(views).toHaveLength(20);
  });
});
