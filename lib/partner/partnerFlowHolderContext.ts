// FILE: lib/partner/partnerFlowHolderContext.ts
// Canonical holder resolution for hosted partner flow APIs (#508).

import type { NextRequest } from "next/server";
import {
  holderClaimsSubjectKey,
  requireHolderRequestContext,
  type HolderRequestContext,
} from "@/lib/holder/holderRequestContext";

export type PartnerFlowHolderMode = "solana_native" | "legacy_sui";

export type PartnerFlowHolderSession = {
  subjectId: string;
  holderAccountId: string | null;
  solanaAddress: string | null;
  mode: PartnerFlowHolderMode;
  ctx: HolderRequestContext;
};

export async function requirePartnerFlowHolder(req: NextRequest): Promise<
  | { ok: true; holder: PartnerFlowHolderSession }
  | { ok: false; error: string; status: 401 | 403; code?: string }
> {
  const auth = await requireHolderRequestContext(req);
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status, code: auth.code };
  }

  const subjectId = holderClaimsSubjectKey(auth.ctx);

  if (auth.ctx.mode === "solana_native") {
    if (!auth.ctx.walletBindingActive) {
      return {
        ok: false,
        error: "Wallet binding required before partner verification",
        status: 403,
        code: "wallet_binding_required",
      };
    }
    return {
      ok: true,
      holder: {
        subjectId,
        holderAccountId: auth.ctx.holderAccountId,
        solanaAddress: auth.ctx.solanaAddress,
        mode: "solana_native",
        ctx: auth.ctx,
      },
    };
  }

  return {
    ok: true,
    holder: {
      subjectId,
      holderAccountId: null,
      solanaAddress: null,
      mode: "legacy_sui",
      ctx: auth.ctx,
    },
  };
}
