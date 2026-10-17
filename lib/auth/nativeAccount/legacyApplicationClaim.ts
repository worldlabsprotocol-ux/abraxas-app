// FILE: lib/auth/nativeAccount/legacyApplicationClaim.ts

import { authenticatePartnerRawKey } from "@/lib/partner/partnerAuth";
import {
  assertPartnerMembership,
  recordMembershipGrant,
  upsertPartnerMembership,
  NativeAccountStoreUnavailableError,
} from "@/lib/auth/nativeAccount/store";

export type LegacyApplicationClaimResult =
  | { ok: true; partnerId: string; role: "owner" | "admin" | "operator"; alreadyMember: boolean }
  | { ok: false; code: string };

/** Explicit, auditable link — requires proof of existing API key authority. No email/wallet/name matching. */
export async function claimLegacyApplicationWithApiKey(input: {
  accountId: string;
  apiKey: string;
}): Promise<LegacyApplicationClaimResult> {
  const auth = await authenticatePartnerRawKey(input.apiKey.trim());
  if (!auth?.ok) {
    return { ok: false, code: "api_key_invalid" };
  }

  const partnerId = auth.ctx.partnerId;
  const existing = await assertPartnerMembership(input.accountId, partnerId);
  if (existing.ok) {
    return {
      ok: true,
      partnerId,
      role: existing.role,
      alreadyMember: true,
    };
  }

  try {
    await upsertPartnerMembership({
      accountId: input.accountId,
      partnerId,
      role: "owner",
    });
    await recordMembershipGrant({
      accountId: input.accountId,
      partnerId,
      grantMethod: "api_key_proof",
      apiKeyId: auth.ctx.apiKeyId,
      metadata: { key_prefix: auth.ctx.keyPrefix },
    });
  } catch (error) {
    if (error instanceof NativeAccountStoreUnavailableError) {
      return { ok: false, code: "native_account_store_unavailable" };
    }
    throw error;
  }

  return { ok: true, partnerId, role: "owner", alreadyMember: false };
}
