// FILE: lib/walletAuthority/service.ts
// Wallet authority — bind, verify, list, revoke; preserves Sui/zkLogin paths.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { upsertClaims } from "@/lib/credentials/claimsService";
import { walletBindingClaim, CLAIM_ISSUERS } from "@/lib/credentials/claimSchema";
import {
  createEvmChallengePayload,
  normalizeEvmAddress,
  verifyEvmBindingSignature,
} from "@/lib/walletAuthority/evmSiwe";
import type { WalletBindingRecord, WalletBindingStatus, WalletChain } from "@/lib/walletAuthority/types";

function mapBinding(row: Record<string, unknown>): WalletBindingRecord {
  return {
    id: row.id as string,
    subject_id: row.subject_id as string,
    chain: (row.chain as WalletChain) ?? "sui",
    chain_id: (row.chain_id as number | null) ?? null,
    wallet_address: row.wallet_address as string,
    binding_method: row.binding_method as string,
    binding_status: ((row.binding_status as WalletBindingStatus | null) ??
      (row.revoked_at ? "revoked" : "active")) as WalletBindingStatus,
    verified_domain: (row.verified_domain as string | null) ?? null,
    verified_at: row.verified_at as string,
    revoked_at: (row.revoked_at as string | null) ?? null,
    risk_status: row.risk_status as string,
  };
}

export function resolveConnectDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://abraxas-app.vercel.app";
  try {
    return new URL(appUrl).host;
  } catch {
    return "abraxas-app.vercel.app";
  }
}

/** Atomic single-use challenge consume — returns row or null if already consumed. */
export async function consumeWalletBindingChallenge(
  sb: SupabaseClient,
  challengeId: string,
): Promise<Record<string, unknown> | null> {
  const now = new Date().toISOString();
  const { data } = await sb
    .from("wallet_binding_challenges")
    .update({ consumed_at: now })
    .eq("id", challengeId)
    .is("consumed_at", null)
    .select("*")
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

async function assertWalletNotActiveOnOtherSubject(
  sb: SupabaseClient,
  chain: WalletChain,
  walletAddress: string,
  subjectId: string,
): Promise<void> {
  const wallet = chain === "evm"
    ? normalizeEvmAddress(walletAddress)
    : normalizeSuiAddress(walletAddress);
  const subject = normalizeSuiAddress(subjectId);

  const { data: existing } = await sb
    .from("wallet_bindings")
    .select("id, subject_id")
    .eq("chain", chain)
    .eq("wallet_address", wallet)
    .eq("binding_status", "active")
    .is("revoked_at", null)
    .maybeSingle();

  if (existing && (existing.subject_id as string) !== subject) {
    throw new Error("Wallet already bound to another Passport subject");
  }
}

export async function listSubjectWallets(subjectId: string): Promise<WalletBindingRecord[]> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(subjectId);
  const { data } = await sb
    .from("wallet_bindings")
    .select("*")
    .eq("subject_id", subject)
    .order("verified_at", { ascending: false });
  return (data ?? []).map(r => mapBinding(r as Record<string, unknown>));
}

export async function getActiveWalletBinding(
  subjectId: string,
  walletAddress: string,
  chain: WalletChain,
): Promise<WalletBindingRecord | null> {
  const address = chain === "evm"
    ? normalizeEvmAddress(walletAddress)
    : normalizeSuiAddress(walletAddress);
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_bindings")
    .select("*")
    .eq("subject_id", normalizeSuiAddress(subjectId))
    .eq("wallet_address", address)
    .eq("chain", chain)
    .maybeSingle();
  if (!data) return null;
  const binding = mapBinding(data as Record<string, unknown>);
  if (binding.binding_status === "revoked" || binding.binding_status === "compromised") return null;
  if (binding.revoked_at) return null;
  return binding.binding_status === "active" ? binding : null;
}

export async function createEvmBindingChallenge(input: {
  subjectId: string;
  walletAddress: string;
  chainId: number;
}): Promise<{ challenge_id: string; message: string; expires_at: string }> {
  const sb = requireSupabaseAdmin();
  const domain = resolveConnectDomain();
  const payload = createEvmChallengePayload({
    domain,
    address: input.walletAddress,
    chainId: input.chainId,
  });

  await sb.from("wallet_binding_challenges").insert({
    id: payload.challengeId,
    wallet_address: normalizeEvmAddress(input.walletAddress),
    chain: "evm",
    chain_id: input.chainId,
    message: payload.message,
    domain: payload.domain,
    subject_id: normalizeSuiAddress(input.subjectId),
    expires_at: payload.expiresAt,
  });

  return {
    challenge_id: payload.challengeId,
    message: payload.message,
    expires_at: payload.expiresAt,
  };
}

export async function confirmEvmBinding(input: {
  subjectId: string;
  challengeId: string;
  signature: string;
}): Promise<WalletBindingRecord> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectId);

  const { data: challenge } = await sb
    .from("wallet_binding_challenges")
    .select("*")
    .eq("id", input.challengeId)
    .maybeSingle();

  if (!challenge) throw new Error("Challenge not found");
  if (challenge.consumed_at) throw new Error("Challenge already used");
  if (new Date(challenge.expires_at as string) < new Date()) throw new Error("Challenge expired");
  if (challenge.subject_id && challenge.subject_id !== subject) throw new Error("Challenge subject mismatch");

  const valid = await verifyEvmBindingSignature({
    message: challenge.message as string,
    signature: input.signature as `0x${string}`,
    expectedAddress: challenge.wallet_address as string,
    expectedDomain: challenge.domain as string,
    expectedChainId: challenge.chain_id as number,
    expectedNonce: challenge.id as string,
  });
  if (!valid) throw new Error("Invalid signature");

  const wallet = normalizeEvmAddress(challenge.wallet_address as string);
  await assertWalletNotActiveOnOtherSubject(sb, "evm", wallet, subject);

  const consumed = await consumeWalletBindingChallenge(sb, input.challengeId);
  if (!consumed) throw new Error("Challenge already used");

  const now = new Date().toISOString();
  const { data: binding, error } = await sb.from("wallet_bindings").upsert({
    subject_id: subject,
    chain: "evm",
    chain_id: challenge.chain_id as number,
    wallet_address: wallet,
    binding_method: "siwe",
    binding_status: "active",
    verified_domain: challenge.domain as string,
    proof_signature: input.signature.slice(0, 66),
    verified_at: now,
    revoked_at: null,
    risk_status: "low",
  }, { onConflict: "subject_id,wallet_address" }).select("*").single();

  if (error || !binding) {
    if (error?.message?.includes("idx_wallet_bindings_active_wallet_unique")) {
      throw new Error("Wallet already bound to another Passport subject");
    }
    throw new Error(error?.message ?? "Failed to save binding");
  }

  const claim = walletBindingClaim({
    subjectId: subject,
    walletAddress: wallet,
    bindingMethod: "siwe_evm",
  });
  await upsertClaims([{
    ...claim,
    claim_value: {
      ...claim.claim_value,
      chain: "evm",
      chain_id: challenge.chain_id,
      binding_method: "siwe",
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L3",
  }]);

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: "wallet.bound",
    object_type: "wallet_binding",
    object_id: binding.id as string,
    metadata: { chain: "evm", wallet_address: wallet },
  });

  return mapBinding(binding as Record<string, unknown>);
}

export async function revokeWalletBinding(input: {
  subjectId: string;
  bindingId: string;
  reason: string;
  status?: "revoked" | "compromised";
}): Promise<boolean> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectId);
  const status = input.status ?? "revoked";
  const now = new Date().toISOString();

  const { data } = await sb
    .from("wallet_bindings")
    .update({
      binding_status: status,
      revoked_at: now,
      risk_status: status === "compromised" ? "high" : "unknown",
    })
    .eq("id", input.bindingId)
    .eq("subject_id", subject)
    .select("id")
    .maybeSingle();

  if (!data) return false;

  await appendAuditEvent({
    actor_type: "subject",
    actor_id: subject,
    action: `wallet.${status}`,
    object_type: "wallet_binding",
    object_id: input.bindingId,
    metadata: { reason: input.reason },
  });

  return true;
}

export function isWalletAuthorizedForRequest(
  binding: WalletBindingRecord | null,
  walletAddress: string,
  chain: WalletChain,
): boolean {
  if (!binding) return false;
  if (binding.binding_status !== "active") return false;
  const addr = chain === "evm"
    ? normalizeEvmAddress(walletAddress)
    : normalizeSuiAddress(walletAddress);
  return binding.wallet_address.toLowerCase() === addr.toLowerCase() && binding.chain === chain;
}
