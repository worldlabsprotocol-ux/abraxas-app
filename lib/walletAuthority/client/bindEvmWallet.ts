"use client";
// FILE: lib/walletAuthority/client/bindEvmWallet.ts
// Single EVM wallet-bind flow for Connect, demo, and future Passport entry points.

import {
  connectEvmWallet,
  signEvmPersonalMessage,
  type EvmConnectionMethod,
  type EvmWalletConnection,
} from "@/lib/walletAuthority/client/ethereumProvider";
import { mapWalletApiError } from "@/lib/walletAuthority/client/sessionHints";

export interface BindEvmWalletResult {
  address: string;
  chainId: number;
  binding_id: string;
  binding_status: string;
  connection_method: EvmConnectionMethod;
}

export interface BindEvmWalletOptions {
  expectedWalletAddress?: string | null;
  credentials?: RequestCredentials;
  connectionMethod?: EvmConnectionMethod;
  chainId?: number;
}

function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({})) as { error?: string };
  return mapWalletApiError(data.error ?? fallback, res.status);
}

/**
 * Full EVM SIWE bind: connect → challenge → sign → confirm.
 * Uses wallet-authority APIs (session cookie required in this browser).
 */
export async function bindEvmWalletToPassport(
  options: BindEvmWalletOptions = {},
): Promise<BindEvmWalletResult> {
  const connection = await connectEvmWallet({
    method: options.connectionMethod,
    chainId: options.chainId,
  });
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
    throw new Error(await parseApiError(chRes, challenge.error ?? "Challenge failed"));
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
    throw new Error(await parseApiError(bindRes, bindData.error ?? "Bind failed"));
  }

  return {
    address: connection.address,
    chainId: connection.chainId,
    binding_id: bindData.binding_id ?? "",
    binding_status: bindData.binding_status ?? "active",
    connection_method: connection.method,
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
