// FILE: lib/account/buildAccountOverview.ts
// Pure assembly for GET /api/account/overview — no cross-session authorization.

import type { BrowserSession } from "@/lib/auth/browserSession";
import type { AccountSession } from "@/lib/auth/accountSession";
import type { EphemeralWalletSession } from "@/lib/auth/ephemeralWallet/walletSession";
import type { PartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { ACCOUNT_SESSIONS_INDEPENDENT_NOTICE } from "@/lib/account/accountHubCopy";

export type AccountOverviewPayload = {
  ok: true;
  native_account: {
    authenticated: boolean;
    account_id: string | null;
    auth_method: AccountSession["authMethod"] | null;
    partner_membership_count: number;
    partner_memberships: Array<{ partner_id: string; role: string }>;
  };
  wallet_auth: {
    authenticated: boolean;
    wallet_address: string | null;
    auth_mode: "ephemeral_wallet" | null;
    scopes: string[];
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
  ephemeralWalletSession?: EphemeralWalletSession | null;
  partnerMembershipCount?: number;
  partnerMemberships?: Array<{ partner_id: string; role: string }>;
}): AccountOverviewPayload {
  const walletAuthenticated = Boolean(input.ephemeralWalletSession);
  return {
    ok: true,
    native_account: {
      authenticated: Boolean(input.nativeAccountSession) || walletAuthenticated,
      account_id: input.nativeAccountSession?.accountId ?? null,
      auth_method: input.nativeAccountSession?.authMethod ?? (walletAuthenticated ? "solana_wallet" : null),
      partner_membership_count: input.partnerMembershipCount ?? 0,
      partner_memberships: input.partnerMemberships ?? [],
    },
    wallet_auth: {
      authenticated: walletAuthenticated,
      wallet_address: input.ephemeralWalletSession?.walletAddress ?? null,
      auth_mode: walletAuthenticated ? "ephemeral_wallet" : null,
      scopes: input.ephemeralWalletSession?.scopes ?? [],
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
