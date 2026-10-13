// FILE: lib/auth/passportWalletAuth/identity.ts

import { randomBytes } from "crypto";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { PASSPORT_WALLET_PROVIDER } from "./contract";
import { isHostedHolderProvider } from "@/lib/auth/hostedHolderSession";
import { hasPassportWalletLoginGrant } from "./legacyLink";
import { caip10Sui } from "@/lib/auth/holderSubject/caip";
import { linkLegacyKeyToSubject, resolveLegacySubjectId, resolveSubjectForVerifiedWallet } from "@/lib/auth/holderSubject/service";
import { resolveAuthorizedSuiNetworkFromEnv } from "./network";

export function passportWalletOAuthSub(walletAddress: string): string {
  return `passport_wallet:${normalizeSuiAddress(walletAddress)}`;
}

function generateUserSalt(): string {
  return BigInt(`0x${randomBytes(16).toString("hex")}`).toString();
}

export type ResolvePassportWalletIdentityResult =
  | { ok: true; holderSubjectId: string; suiAddress?: string; walletCaip10: string; created: boolean }
  | { ok: false; code: "legacy_link_required" | "identity_conflict" | "persist_failed" | "network_config_invalid" };

/**
 * Wallet login identity — never auto-merge OAuth/hosted accounts or inherit IDV claims.
 */
export async function resolvePassportWalletIdentity(
  walletAddress: string,
): Promise<ResolvePassportWalletIdentityResult> {
  const suiAddress = normalizeSuiAddress(walletAddress);
  const network = resolveAuthorizedSuiNetworkFromEnv();
  if (!network) {
    return { ok: false, code: "network_config_invalid" };
  }
  const caip = caip10Sui(network, suiAddress);

  const linkedSubject = await resolveLegacySubjectId("sui_zklogin_address", suiAddress);
  if (linkedSubject) {
    return { ok: true, holderSubjectId: linkedSubject, suiAddress, walletCaip10: caip.caip10, created: false };
  }

  const sb = requireSupabaseAdmin();
  const { data: existing } = await sb
    .from("sui_zklogin_identities")
    .select("provider, oauth_sub, sui_address")
    .eq("sui_address", suiAddress)
    .maybeSingle();

  if (existing) {
    const provider = String(existing.provider ?? "");
    if (provider === "google" || provider === "apple" || isHostedHolderProvider(provider)) {
      if (await hasPassportWalletLoginGrant(suiAddress)) {
        const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "sui_wallet" });
        if (!subject.ok) return { ok: false, code: "persist_failed" };
        await linkLegacyKeyToSubject({
          subjectId: subject.subjectId,
          legacyKind: "sui_zklogin_address",
          legacyKey: suiAddress,
        });
        return {
          ok: true,
          holderSubjectId: subject.subjectId,
          suiAddress,
          walletCaip10: caip.caip10,
          created: subject.created,
        };
      }
      return { ok: false, code: "legacy_link_required" };
    }
    if (provider === PASSPORT_WALLET_PROVIDER) {
      const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "sui_wallet" });
      if (!subject.ok) return { ok: false, code: subject.code === "wallet_bound_to_other_subject" ? "identity_conflict" : "persist_failed" };
      await linkLegacyKeyToSubject({
        subjectId: subject.subjectId,
        legacyKind: "sui_zklogin_address",
        legacyKey: suiAddress,
      });
      return {
        ok: true,
        holderSubjectId: subject.subjectId,
        suiAddress,
        walletCaip10: caip.caip10,
        created: subject.created,
      };
    }
    if (await hasPassportWalletLoginGrant(suiAddress)) {
      const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "sui_wallet" });
      if (!subject.ok) return { ok: false, code: "persist_failed" };
      return {
        ok: true,
        holderSubjectId: subject.subjectId,
        suiAddress,
        walletCaip10: caip.caip10,
        created: subject.created,
      };
    }
    return { ok: false, code: "legacy_link_required" };
  }

  const subject = await resolveSubjectForVerifiedWallet({ caip, authMethod: "sui_wallet" });
  if (!subject.ok) {
    return { ok: false, code: subject.code === "wallet_bound_to_other_subject" ? "identity_conflict" : "persist_failed" };
  }

  return {
    ok: true,
    holderSubjectId: subject.subjectId,
    walletCaip10: caip.caip10,
    created: subject.created,
  };
}

export async function assertWalletNotBoundToOtherSubject(input: {
  walletAddress: string;
  subjectId: string;
}): Promise<{ ok: true } | { ok: false; code: "wallet_bound_to_other_subject" }> {
  const sb = requireSupabaseAdmin();
  const wallet = normalizeSuiAddress(input.walletAddress);
  const subject = normalizeSuiAddress(input.subjectId);
  const { data } = await sb
    .from("wallet_bindings")
    .select("subject_id")
    .eq("chain", "sui")
    .eq("wallet_address", wallet)
    .eq("binding_status", "active")
    .is("revoked_at", null)
    .maybeSingle();

  if (data && normalizeSuiAddress(String(data.subject_id)) !== subject) {
    return { ok: false, code: "wallet_bound_to_other_subject" };
  }
  return { ok: true };
}
