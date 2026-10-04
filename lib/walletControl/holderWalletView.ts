// FILE: lib/walletControl/holderWalletView.ts
// Holder-facing wallet list model — trust control surface, not portfolio.

import type { WalletBindingRecord } from "@/lib/walletAuthority/types";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { WALLET_CONTROL_CLAIM_TYPE, walletControlEvidenceRef } from "@/lib/walletControl/contract";

export type HolderWalletControlStatus = "verified" | "refresh_needed" | "revoked";

export interface HolderWalletView {
  id: string;
  chain: string;
  chainLabel: string;
  network: string | null;
  address: string;
  addressShort: string;
  controlMethod: string;
  controlStatus: HolderWalletControlStatus;
  controlStatusLabel: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  freshnessLabel: string;
  bindingStatus: string;
}

const CHAIN_LABELS: Record<string, string> = {
  evm: "Ethereum",
  sui: "Sui",
  solana: "Solana",
};

const REFRESH_SOON_MS = 2 * 60 * 60 * 1000;

export function shortenWalletAddress(address: string): string {
  const trimmed = address.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}

export function resolveHolderWalletControlStatus(input: {
  bindingStatus: string;
  claimStatus?: string | null;
  expiresAt?: string | null;
  now?: Date;
}): HolderWalletControlStatus {
  if (input.bindingStatus === "revoked" || input.bindingStatus === "compromised") {
    return "revoked";
  }
  if (input.claimStatus === "revoked" || input.claimStatus === "expired") {
    return "revoked";
  }
  const now = input.now ?? new Date();
  if (input.expiresAt && new Date(input.expiresAt).getTime() <= now.getTime()) {
    return "refresh_needed";
  }
  if (input.expiresAt) {
    const remaining = new Date(input.expiresAt).getTime() - now.getTime();
    if (remaining <= REFRESH_SOON_MS) return "refresh_needed";
  }
  return "verified";
}

export function holderWalletFreshnessLabel(status: HolderWalletControlStatus): string {
  if (status === "verified") return "Verified recently";
  if (status === "refresh_needed") return "Refresh control proof";
  return "Unlinked";
}

export function holderWalletControlStatusLabel(status: HolderWalletControlStatus): string {
  if (status === "verified") return "Control verified";
  if (status === "refresh_needed") return "Refresh needed";
  return "Unlinked";
}

export function mapBindingToHolderWalletView(input: {
  binding: WalletBindingRecord;
  claim?: CredentialClaimRecord | null;
  now?: Date;
}): HolderWalletView {
  const claimValue = (input.claim?.claim_value ?? {}) as Record<string, unknown>;
  const controlStatus = resolveHolderWalletControlStatus({
    bindingStatus: input.binding.binding_status,
    claimStatus: input.claim?.status ?? null,
    expiresAt: input.claim?.expires_at ?? null,
    now: input.now,
  });

  return {
    id: input.binding.id,
    chain: input.binding.chain,
    chainLabel: CHAIN_LABELS[input.binding.chain] ?? input.binding.chain,
    network: typeof claimValue.network === "string"
      ? claimValue.network
      : input.binding.chain_id != null
        ? `eip155:${input.binding.chain_id}`
        : null,
    address: input.binding.wallet_address,
    addressShort: shortenWalletAddress(input.binding.wallet_address),
    controlMethod: input.binding.binding_method,
    controlStatus,
    controlStatusLabel: holderWalletControlStatusLabel(controlStatus),
    verifiedAt: input.binding.verified_at,
    expiresAt: input.claim?.expires_at ?? null,
    freshnessLabel: holderWalletFreshnessLabel(controlStatus),
    bindingStatus: input.binding.binding_status,
  };
}

export function indexWalletControlClaimsByBinding(
  claims: CredentialClaimRecord[],
): Map<string, CredentialClaimRecord> {
  const map = new Map<string, CredentialClaimRecord>();
  for (const claim of claims) {
    if (claim.claim_type !== WALLET_CONTROL_CLAIM_TYPE) continue;
    const bindingId = (claim.claim_value as Record<string, unknown>)?.wallet_binding_id as string | undefined;
    const ref = claim.evidence_reference
      ? claim.evidence_reference.replace(/^wb:/, "")
      : bindingId;
    if (!ref) continue;
    const existing = map.get(ref);
    if (!existing || new Date(claim.issued_at) > new Date(existing.issued_at)) {
      map.set(ref, claim);
    }
  }
  return map;
}

export function buildHolderWalletViews(input: {
  bindings: WalletBindingRecord[];
  claims: CredentialClaimRecord[];
  includeRevoked?: boolean;
  now?: Date;
}): HolderWalletView[] {
  const claimByBinding = indexWalletControlClaimsByBinding(input.claims);
  return input.bindings
    .filter(binding => input.includeRevoked || binding.binding_status === "active")
    .map(binding => mapBindingToHolderWalletView({
      binding,
      claim: claimByBinding.get(binding.id) ?? null,
      now: input.now,
    }))
    .sort((a, b) => Date.parse(b.verifiedAt ?? "") - Date.parse(a.verifiedAt ?? ""));
}
