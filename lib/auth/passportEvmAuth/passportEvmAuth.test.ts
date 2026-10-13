// FILE: lib/auth/passportEvmAuth/passportEvmAuth.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { issuePassportEvmAuthChallenge, verifyPassportEvmAuth } from "./service";
import * as store from "./store";
import * as holderSubject from "@/lib/auth/holderSubject/service";

describe("passport EVM auth", () => {
  const account = privateKeyToAccount("0x0123456789012345678901234567890123456789012345678901234567890123");
  const ORIGIN = "https://demo.abraxasworld.xyz";

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_EVM_CHAIN_ID = "1";
    process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
    process.env.ABRAXAS_PASSPORT_WALLET_TRUSTED_ORIGINS = ORIGIN;
  });

  it("issues and verifies EOA SIWE challenges", async () => {
    vi.spyOn(store, "insertEvmChallenge").mockResolvedValue(undefined);
    vi.spyOn(holderSubject, "resolveSubjectForVerifiedWallet").mockResolvedValue({
      ok: true,
      subjectId: "abx_hs_0123456789012345678901234567890ab",
      created: true,
    });

    const issued = await issuePassportEvmAuthChallenge({
      origin: ORIGIN,
      walletAddress: account.address,
      chainId: 1,
      intendedAction: "passport_sign_in",
      sessionContext: "ctx-evm",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const signature = await account.signMessage({ message: issued.challenge.message });
    const nonceLine = issued.challenge.message.split("\n").find((line) => line.startsWith("Nonce: "));
    const nonce = nonceLine?.slice("Nonce: ".length) ?? "";
    vi.spyOn(store, "consumeEvmChallenge").mockResolvedValue({
      id: issued.challenge.challenge_id,
      wallet_address: account.address,
      chain_id: 1,
      origin: ORIGIN,
      intended_action: "passport_sign_in",
      session_context_hash: store.hashSessionContext("ctx-evm"),
      nonce,
      message: issued.challenge.message,
      expires_at: issued.challenge.expires_at,
      consumed_at: null,
    });

    const verified = await verifyPassportEvmAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: account.address,
      chainId: 1,
      signature,
      sessionContext: "ctx-evm",
      requestOrigin: ORIGIN,
      expectedIntendedAction: "passport_sign_in",
    });
    expect(verified.ok).toBe(true);
  });
});
