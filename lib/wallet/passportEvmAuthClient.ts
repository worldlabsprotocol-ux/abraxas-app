"use client";
// FILE: lib/wallet/passportEvmAuthClient.ts

import { signWalletMessageWithControls } from "@/lib/auth/ephemeralWallet/walletMessageSignAttempt";
import type { WalletVerifyAttempt } from "./walletVerifyAttempt";

export type PassportEvmAuthResult =
  | { ok: true; walletAddress: string; chainId: number }
  | { ok: false; code: string; phase: "connect" | "challenge" | "sign" | "verify" };

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function readEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth || typeof eth.request !== "function") return null;
  return eth;
}

export async function runPassportEvmWalletAuth(input: {
  intendedAction: string;
  attempt?: WalletVerifyAttempt;
  onPhase?: (phase: "connect" | "sign" | "verify") => void;
}): Promise<PassportEvmAuthResult> {
  const isStale = () => input.attempt?.isStale() ?? false;
  const eth = readEthereumProvider();
  if (!eth) return { ok: false, code: "no_evm_provider", phase: "connect" };

  input.onPhase?.("connect");
  let accounts: string[];
  try {
    accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
  } catch {
    return { ok: false, code: "evm_connect_cancelled", phase: "connect" };
  }
  if (isStale()) return { ok: false, code: "stale", phase: "connect" };
  const wallet = accounts[0];
  if (!wallet) return { ok: false, code: "no_account", phase: "connect" };

  const chainHex = await eth.request({ method: "eth_chainId" }) as string;
  const chainId = Number.parseInt(chainHex, 16);
  if (isStale()) return { ok: false, code: "stale", phase: "connect" };

  const challengeRes = await fetch("/api/auth/passport-evm/challenge", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wallet_address: wallet,
      chain_id: chainId,
      intended_action: input.intendedAction,
    }),
    signal: input.attempt?.abort.signal,
  });
  const challengeBody = await challengeRes.json() as {
    ok?: boolean;
    challenge?: { challenge_id: string; message: string };
    code?: string;
  };
  if (isStale()) return { ok: false, code: "stale", phase: "challenge" };
  if (!challengeRes.ok || !challengeBody.challenge) {
    return { ok: false, code: challengeBody.code ?? "challenge_failed", phase: "challenge" };
  }

  input.onPhase?.("sign");
  const signed = await signWalletMessageWithControls({
    message: challengeBody.challenge.message,
    signMessage: async () => {
      const signature = await eth.request({
        method: "personal_sign",
        params: [challengeBody.challenge!.message, wallet],
      }) as string;
      return Uint8Array.from(Buffer.from(signature.replace(/^0x/, ""), "hex"));
    },
    signal: input.attempt?.abort.signal,
    isStale,
  });
  if (isStale()) return { ok: false, code: "stale", phase: "sign" };
  if (!signed.ok) {
    return { ok: false, code: signed.code, phase: "sign" };
  }

  const signature = `0x${Buffer.from(signed.signatureBytes).toString("hex")}`;

  input.onPhase?.("verify");
  const verifyRes = await fetch("/api/auth/passport-evm/verify", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      challenge_id: challengeBody.challenge.challenge_id,
      wallet_address: wallet,
      chain_id: chainId,
      signature,
      intended_action: input.intendedAction,
    }),
    signal: input.attempt?.abort.signal,
  });
  const verifyBody = await verifyRes.json() as { ok?: boolean; code?: string };
  if (isStale()) return { ok: false, code: "stale", phase: "verify" };
  if (!verifyRes.ok || !verifyBody.ok) {
    return { ok: false, code: verifyBody.code ?? "verify_failed", phase: "verify" };
  }

  window.dispatchEvent(new Event("abraxas:holder-session"));
  return { ok: true, walletAddress: wallet, chainId };
}
