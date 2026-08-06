// FILE: lib/walletBinding/suiChallenge.ts
// Durable Sui wallet binding challenges (Supabase-backed for serverless).

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  consumeWalletBindingChallenge,
  resolveConnectDomain,
} from "@/lib/walletAuthority/service";
import {
  isSchemaCacheChainError,
  probeWalletBindingSchema,
  type WalletBindingSchemaCheck,
} from "@/lib/walletBinding/schemaPreflight";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

export interface SuiBindingChallenge {
  challenge_id: string;
  message: string;
  wallet_address: string;
  expires_at: string;
}

export async function getWalletBindingSchemaCheck(): Promise<WalletBindingSchemaCheck> {
  const sb = requireSupabaseAdmin();
  return probeWalletBindingSchema(sb);
}

export async function createSuiWalletBindingChallenge(
  walletAddress: string,
): Promise<SuiBindingChallenge> {
  const sb = requireSupabaseAdmin();
  const schema = await probeWalletBindingSchema(sb);
  if (!schema.compatible) {
    throw new Error(schema.userMessage);
  }
  const wallet = normalizeSuiAddress(walletAddress);
  const challengeId = randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + CHALLENGE_TTL_MS);
  const domain = resolveConnectDomain();
  const message = [
    "Abraxas Wallet Binding",
    `wallet:${wallet}`,
    `challenge:${challengeId}`,
    `expires:${expires.toISOString()}`,
  ].join("\n");

  const { error } = await sb.from("wallet_binding_challenges").insert({
    id: challengeId,
    wallet_address: wallet,
    chain: "sui",
    message,
    domain,
    subject_id: wallet,
    expires_at: expires.toISOString(),
  });

  if (error) {
    if (isSchemaCacheChainError(error.message)) {
      throw new Error(
        "Wallet binding is temporarily unavailable. Your verified identity still works without it.",
      );
    }
    throw new Error(error.message);
  }

  return {
    challenge_id: challengeId,
    message,
    wallet_address: wallet,
    expires_at: expires.toISOString(),
  };
}

export async function loadSuiBindingChallenge(
  challengeId: string,
): Promise<{ wallet: string; message: string } | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_binding_challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("chain", "sui")
    .maybeSingle();

  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at as string) < new Date()) return null;

  return {
    wallet: data.wallet_address as string,
    message: data.message as string,
  };
}

export async function consumeSuiBindingChallenge(
  challengeId: string,
  walletAddress: string,
): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const wallet = normalizeSuiAddress(walletAddress);
  const row = await consumeWalletBindingChallenge(sb, challengeId);
  if (!row) return false;
  if (normalizeSuiAddress(row.wallet_address as string) !== wallet) return false;
  if ((row.chain as string) !== "sui") return false;
  return true;
}
