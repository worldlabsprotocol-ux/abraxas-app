// FILE: lib/walletAuthority/revokeCascade.ts
// Revoke wallet_binding_confirmed claims when a binding is revoked.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import { transitionClaimStatus } from "@/lib/trust/credentialStatusRegistry";
import { normalizeEvmAddress } from "@/lib/walletAuthority/evmSiwe";
import type { WalletChain } from "@/lib/walletAuthority/types";

export function claimMatchesWalletBinding(
  claim: CredentialClaimRecord,
  chain: WalletChain,
  walletAddress: string,
): boolean {
  if (claim.claim_type !== "wallet_binding_confirmed") return false;
  const claimChain = (claim.claim_value.chain as string | undefined) ?? "sui";
  if (claimChain !== chain) return false;

  const claimWallet = String(claim.claim_value.wallet_address ?? "");
  if (!claimWallet) return false;

  if (chain === "evm") {
    return claimWallet.toLowerCase() === normalizeEvmAddress(walletAddress).toLowerCase();
  }
  return normalizeSuiAddress(claimWallet) === normalizeSuiAddress(walletAddress);
}

export async function revokeClaimsForWalletBinding(input: {
  subjectId: string;
  chain: WalletChain;
  walletAddress: string;
  reason: string;
  changedBy: string;
  bindingId: string;
}): Promise<string[]> {
  const claims = await getActiveClaims(input.subjectId);
  const revokedClaimIds: string[] = [];

  for (const claim of claims) {
    if (!claimMatchesWalletBinding(claim, input.chain, input.walletAddress)) continue;

    const result = await transitionClaimStatus({
      claimId: claim.id,
      toStatus: "revoked",
      reasonCode: input.reason,
      changedBy: input.changedBy,
      idempotencyKey: `binding-revoke:${input.bindingId}:${claim.id}`,
      metadata: {
        binding_id: input.bindingId,
        chain: input.chain,
        wallet_address: input.walletAddress,
      },
    });

    if (result.ok) revokedClaimIds.push(claim.id);
  }

  return revokedClaimIds;
}
