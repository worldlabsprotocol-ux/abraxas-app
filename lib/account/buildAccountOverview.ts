// FILE: lib/account/buildAccountOverview.ts
// Pure assembly for GET /api/account/overview — no cross-session authorization.

import type { BrowserSession } from "@/lib/auth/browserSession";
import type { AccountSession } from "@/lib/auth/accountSession";
import type { PartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { ACCOUNT_SESSIONS_INDEPENDENT_NOTICE } from "@/lib/account/accountHubCopy";

export type AccountOverviewPayload = {
  ok: true;
  native_account: {
    authenticated: boolean;
    account_id: string | null;
    auth_method: AccountSession["authMethod"] | null;
    partner_membership_count: number;
  };
  holder: {
    authenticated: boolean;
    subject_id: string | null;
    sui_address: string | null;
    auth_method: BrowserSession["authMethod"] | null;
    wallet_caip10: string | null;
  };
  partner_console: {
    authenticated: boolean;
    partner_id: string | null;
    environment: "sandbox" | "production" | null;
  };
  sessions_are_independent: true;
  notice: string;
};

export function buildAccountOverview(input: {
  holderSession: BrowserSession | null;
  partnerSession: PartnerConsoleSession | null;
  nativeAccountSession?: AccountSession | null;
  partnerMembershipCount?: number;
}): AccountOverviewPayload {
  return {
    ok: true,
    native_account: {
      authenticated: Boolean(input.nativeAccountSession),
      account_id: input.nativeAccountSession?.accountId ?? null,
      auth_method: input.nativeAccountSession?.authMethod ?? null,
      partner_membership_count: input.partnerMembershipCount ?? 0,
    },
    holder: {
      authenticated: Boolean(input.holderSession),
      subject_id: input.holderSession?.subjectId ?? null,
      sui_address: input.holderSession?.suiAddress ?? input.holderSession?.subjectId ?? null,
      auth_method: input.holderSession?.authMethod ?? null,
      wallet_caip10: input.holderSession?.walletCaip10 ?? null,
    },
    partner_console: {
      authenticated: Boolean(input.partnerSession),
      partner_id: input.partnerSession?.partnerId ?? null,
      environment: input.partnerSession?.environment ?? null,
    },
    sessions_are_independent: true,
    notice: ACCOUNT_SESSIONS_INDEPENDENT_NOTICE,
  };
}
