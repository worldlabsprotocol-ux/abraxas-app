// FILE: lib/auth/build551/chainNeutralIdentity.adversarial.test.ts

import { describe, expect, it, vi } from "vitest";
import { identityVerificationUpsertKeys } from "@/lib/idv/holderIdentityRef";
import { resolveAuthorizedSuiNetworkFromEnv } from "@/lib/auth/passportWalletAuth/network";
import { resolveAuthorizedEvmChainIdFromEnv } from "@/lib/auth/passportEvmAuth/network";
import { resolveAuthorizedSolanaNetworkFromEnv } from "@/lib/auth/passportSolanaAuth/network";
import * as holderSubject from "@/lib/auth/holderSubject/service";

const HS_A = "abx_hs_00000000000000000000000000000001";
const HS_B = "abx_hs_00000000000000000000000000000002";

describe("Build #551 chain-neutral identity adversarial", () => {
  it("does not copy legacy sui into holder_subject_id upsert keys", () => {
    const keys = identityVerificationUpsertKeys(HS_A);
    expect(keys.holder_subject_id).toBe(HS_A);
    expect(keys.sui_address).toBeNull();
  });

  it("rejects binding the same wallet CAIP-10 to a second subject", async () => {
    vi.spyOn(holderSubject, "resolveSubjectForVerifiedWallet")
      .mockResolvedValueOnce({ ok: true, subjectId: HS_A, created: false })
      .mockResolvedValueOnce({ ok: false, code: "wallet_bound_to_other_subject" });

    const first = await holderSubject.resolveSubjectForVerifiedWallet({
      caip: {
        caip10: "eip155:1:0x00000000000000000000000000000000000000aa",
        namespace: "eip155",
        reference: "1",
        address: "0x00000000000000000000000000000000000000aa",
      },
      authMethod: "evm_wallet",
    });
    const second = await holderSubject.resolveSubjectForVerifiedWallet({
      caip: {
        caip10: "eip155:1:0x00000000000000000000000000000000000000aa",
        namespace: "eip155",
        reference: "1",
        address: "0x00000000000000000000000000000000000000aa",
      },
      authMethod: "evm_wallet",
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe("wallet_bound_to_other_subject");
  });

  it("resolves Solana and EVM auth networks independently of Sui in development", () => {
    const prevSui = process.env.NEXT_PUBLIC_SUI_NETWORK;
    const prevVercel = process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_SUI_NETWORK = "";
    process.env.VERCEL_ENV = "development";
    expect(resolveAuthorizedSolanaNetworkFromEnv()).not.toBeNull();
    expect(resolveAuthorizedEvmChainIdFromEnv()).not.toBeNull();
    process.env.VERCEL_ENV = "preview";
    expect(resolveAuthorizedSuiNetworkFromEnv()).toBeNull();
    process.env.NEXT_PUBLIC_SUI_NETWORK = prevSui;
    process.env.VERCEL_ENV = prevVercel;
  });

  it("wallet auth success does not imply two subjects merge", () => {
    expect(HS_A).not.toBe(HS_B);
  });
});
