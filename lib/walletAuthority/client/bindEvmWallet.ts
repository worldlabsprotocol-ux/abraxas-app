"use client";
// FILE: lib/walletAuthority/client/bindEvmWallet.ts
// Single EVM wallet-bind flow for Connect, demo, and future Passport entry points.

import {
  connectEvmWallet,
  signEvmPersonalMessage,
  type EvmWalletConnection,
} from "@/lib/walletAuthority/client/ethereumProvider";

export interface BindEvmWalletResult {
  address: string;
  chainId: number;
  binding_id: string;
  binding_status: string;
}

export interface BindEvmWalletOptions {
  /** Expected wallet from authorization request — must match connected account. */
  expectedWalletAddress?: string | null;
  credentials?: RequestCredentials;
}

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Full MetaMask SIWE bind: connect → challenge → sign → confirm.
 * Uses wallet-authority APIs (session cookie required).
 */
export async function bindEvmWalletToPassport(
  options: BindEvmWalletOptions = {},
): Promise<BindEvmWalletResult> {
  const connection = await connectEvmWallet();
  await validateExpectedWallet(connection, options.expectedWalletAddress);

  const chRes = await fetch("/api/wallet-authority/evm/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: options.credentials ?? "include",
    body: JSON.stringify({
      wallet_address: connection.address,
      chain_id: connection.chainId,
    }),
  });
  const challenge = await chRes.json() as {
    challenge_id?: string;
    message?: string;
    error?: string;
  };
  if (!chRes.ok || !challenge.challenge_id || !challenge.message) {
    throw new Error(challenge.error ?? "Challenge failed");
  }

  const signature = await signEvmPersonalMessage(
    connection.provider,
    challenge.message,
    connection.address,
  );

  const bindRes = await fetch("/api/wallet-authority/evm/bind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: options.credentials ?? "include",
    body: JSON.stringify({
      challenge_id: challenge.challenge_id,
      signature,
    }),
  });
  const bindData = await bindRes.json() as {
    ok?: boolean;
    binding_id?: string;
    binding_status?: string;
    error?: string;
  };
  if (!bindRes.ok || !bindData.ok) {
    throw new Error(bindData.error ?? "Bind failed");
  }

  return {
    address: connection.address,
    chainId: connection.chainId,
    binding_id: bindData.binding_id ?? "",
    binding_status: bindData.binding_status ?? "active",
  };
}

async function validateExpectedWallet(
  connection: EvmWalletConnection,
  expectedWalletAddress?: string | null,
): Promise<void> {
  if (!expectedWalletAddress) return;
  if (!addressesEqual(connection.address, expectedWalletAddress)) {
    throw new Error(
      "Connected wallet does not match the address requested by the partner. Switch accounts in MetaMask and try again.",
    );
  }
}

export { connectEvmWallet };
