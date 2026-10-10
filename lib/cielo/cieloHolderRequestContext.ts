// FILE: lib/cielo/cieloHolderRequestContext.ts

import type { NextRequest } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { requireHolderClaimsSession } from "@/lib/auth/holderClaimsSession";
import { isSolanaNativeProductEnabled } from "@/lib/auth/solanaNative/featureFlag";
import { CIELO_VERIFIED_GUEST_POLICY_ID } from "@/lib/cielo/cieloIds";
import { CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID } from "@/lib/cielo/cieloSolanaPolicyIds";

export type CieloHolderRequestContext =
  | {
      mode: "solana_native";
      policyId: typeof CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID;
      claimsSubjectKey: string;
      holderAccountId: string;
      solanaAddress: string;
    }
  | {
      mode: "legacy_sui";
      policyId: typeof CIELO_VERIFIED_GUEST_POLICY_ID;
      claimsSubjectKey: string;
      suiAddress: string;
    };

export async function requireCieloHolderContext(req: NextRequest): Promise<
  | { ok: true; ctx: CieloHolderRequestContext }
  | { ok: false; error: string; status: 401 }
> {
  if (isSolanaNativeProductEnabled()) {
    const auth = await requireHolderClaimsSession(req);
    if (!auth.ok) {
      return { ok: false, error: auth.error, status: auth.status };
    }
    if (
      auth.session.loginMethod !== "solana_wallet"
      || !auth.session.holderAccountId
      || !auth.session.solanaAddress
    ) {
      return {
        ok: false,
        error: "Complete wallet sign-in to continue",
        status: 401,
      };
    }
    return {
      ok: true,
      ctx: {
        mode: "solana_native",
        policyId: CIELO_VERIFIED_GUEST_SOLANA_POLICY_ID,
        claimsSubjectKey: auth.session.claimsSubjectKey,
        holderAccountId: auth.session.holderAccountId,
        solanaAddress: auth.session.solanaAddress,
      },
    };
  }

  const auth = await requireBrowserSession(req);
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }
  return {
    ok: true,
    ctx: {
      mode: "legacy_sui",
      policyId: CIELO_VERIFIED_GUEST_POLICY_ID,
      claimsSubjectKey: normalizeSuiAddress(auth.session.suiAddress),
      suiAddress: normalizeSuiAddress(auth.session.suiAddress),
    },
  };
}
