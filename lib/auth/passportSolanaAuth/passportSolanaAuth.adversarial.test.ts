// FILE: lib/auth/passportSolanaAuth/passportSolanaAuth.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { issuePassportSolanaAuthChallenge, verifyPassportSolanaAuth } from "./service";
import * as store from "./store";
import * as holderSubject from "@/lib/auth/holderSubject/service";
import * as walletAuthority from "@/lib/walletAuthority/service";
import { encodePassportSolanaMessage } from "./message";
import { HOLDER_AUTH_ACTIONS } from "@/lib/auth/holderSubject/contract";

const ORIGIN = "https://demo.abraxasworld.xyz";
const OTHER_ORIGIN = "https://evil.example";

describe("passport Solana auth adversarial", () => {
  const kp = Keypair.generate();

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = "devnet";
    process.env.NEXT_PUBLIC_APP_URL = ORIGIN;
    process.env.ABRAXAS_PASSPORT_WALLET_TRUSTED_ORIGINS = ORIGIN;
  });

  async function signChallengeMessage(message: string): Promise<string> {
    const bytes = encodePassportSolanaMessage(message);
    const sig = nacl.sign.detached(bytes, kp.secretKey);
    return bs58.encode(sig);
  }

  it("rejects replayed challenges", async () => {
    vi.spyOn(store, "insertSolanaChallenge").mockResolvedValue(undefined);
    vi.spyOn(holderSubject, "resolveSubjectForVerifiedWallet").mockResolvedValue({
      ok: true,
      subjectId: "abx_hs_testsubject00000000000001",
      created: false,
    });
    const persist = vi.spyOn(walletAuthority, "persistSolanaWalletControlBinding").mockResolvedValue({} as never);

    const issued = await issuePassportSolanaAuthChallenge({
      origin: ORIGIN,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      sessionContext: "ctx-1",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    vi.spyOn(store, "consumeSolanaChallenge").mockResolvedValue(null);

    const verified = await verifyPassportSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: await signChallengeMessage(issued.challenge.message),
      sessionContext: "ctx-1",
      requestOrigin: ORIGIN,
      expectedIntendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
    });
    expect(verified.ok).toBe(false);
    if (verified.ok) return;
    expect(verified.code).toBe("replay");
    expect(persist).not.toHaveBeenCalled();
  });

  it("rejects wrong request origin", async () => {
    vi.spyOn(store, "insertSolanaChallenge").mockResolvedValue(undefined);
    const issued = await issuePassportSolanaAuthChallenge({
      origin: ORIGIN,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      sessionContext: "ctx-2",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    vi.spyOn(store, "consumeSolanaChallenge").mockResolvedValue({
      id: issued.challenge.challenge_id,
      wallet_address: kp.publicKey.toBase58(),
      solana_network: "devnet",
      origin: ORIGIN,
      intended_action: HOLDER_AUTH_ACTIONS.partnerVerify,
      session_context_hash: store.hashSessionContext("ctx-2"),
      nonce: "n",
      message: issued.challenge.message,
      expires_at: issued.challenge.expires_at,
      consumed_at: null,
    });

    const verified = await verifyPassportSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: await signChallengeMessage(issued.challenge.message),
      sessionContext: "ctx-2",
      requestOrigin: OTHER_ORIGIN,
      expectedIntendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
    });
    expect(verified.ok).toBe(false);
    if (verified.ok) return;
    expect(verified.code).toBe("wrong_domain");
  });

  it("does not persist wallet_control binding on passport_sign_in", async () => {
    vi.spyOn(store, "insertSolanaChallenge").mockResolvedValue(undefined);
    vi.spyOn(holderSubject, "resolveSubjectForVerifiedWallet").mockResolvedValue({
      ok: true,
      subjectId: "abx_hs_testsubject00000000000002",
      created: true,
    });
    const persist = vi.spyOn(walletAuthority, "persistSolanaWalletControlBinding").mockResolvedValue({} as never);

    const issued = await issuePassportSolanaAuthChallenge({
      origin: ORIGIN,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      intendedAction: HOLDER_AUTH_ACTIONS.passportSignIn,
      sessionContext: "ctx-3",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    vi.spyOn(store, "consumeSolanaChallenge").mockResolvedValue({
      id: issued.challenge.challenge_id,
      wallet_address: kp.publicKey.toBase58(),
      solana_network: "devnet",
      origin: ORIGIN,
      intended_action: HOLDER_AUTH_ACTIONS.passportSignIn,
      session_context_hash: store.hashSessionContext("ctx-3"),
      nonce: "n3",
      message: issued.challenge.message,
      expires_at: issued.challenge.expires_at,
      consumed_at: null,
    });

    const verified = await verifyPassportSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: await signChallengeMessage(issued.challenge.message),
      sessionContext: "ctx-3",
      requestOrigin: ORIGIN,
      expectedIntendedAction: HOLDER_AUTH_ACTIONS.passportSignIn,
    });
    expect(verified.ok).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("persists wallet_control binding only for partner_verify", async () => {
    vi.spyOn(store, "insertSolanaChallenge").mockResolvedValue(undefined);
    vi.spyOn(holderSubject, "resolveSubjectForVerifiedWallet").mockResolvedValue({
      ok: true,
      subjectId: "abx_hs_testsubject00000000000003",
      created: false,
    });
    const persist = vi.spyOn(walletAuthority, "persistSolanaWalletControlBinding").mockResolvedValue({} as never);

    const issued = await issuePassportSolanaAuthChallenge({
      origin: ORIGIN,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      intendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
      sessionContext: "ctx-4",
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    vi.spyOn(store, "consumeSolanaChallenge").mockResolvedValue({
      id: issued.challenge.challenge_id,
      wallet_address: kp.publicKey.toBase58(),
      solana_network: "devnet",
      origin: ORIGIN,
      intended_action: HOLDER_AUTH_ACTIONS.partnerVerify,
      session_context_hash: store.hashSessionContext("ctx-4"),
      nonce: "n4",
      message: issued.challenge.message,
      expires_at: issued.challenge.expires_at,
      consumed_at: null,
    });

    const verified = await verifyPassportSolanaAuth({
      challengeId: issued.challenge.challenge_id,
      walletAddress: kp.publicKey.toBase58(),
      solanaNetwork: "devnet",
      signature: await signChallengeMessage(issued.challenge.message),
      sessionContext: "ctx-4",
      requestOrigin: ORIGIN,
      expectedIntendedAction: HOLDER_AUTH_ACTIONS.partnerVerify,
    });
    expect(verified.ok).toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });
});
