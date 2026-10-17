// FILE: lib/partner/launchpad/operatorSessionFromAccount.ts

import type { NextRequest } from "next/server";
import { resolveAccountSession } from "@/lib/auth/accountSession";
import { assertPartnerMembership } from "@/lib/auth/nativeAccount/store";
import {
  attachPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
  type PartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";

export async function issueOperatorSessionForAccountMembership(input: {
  accountId: string;
  partnerId: string;
  environment?: "sandbox" | "production";
}): Promise<string | null> {
  const membership = await assertPartnerMembership(input.accountId, input.partnerId);
  if (!membership.ok) return null;

  return issuePartnerConsoleSessionToken({
    partnerId: input.partnerId,
    environment: input.environment ?? "sandbox",
    authKind: "account",
    accountId: input.accountId,
    membershipRole: membership.role,
  });
}

export async function tryAttachOperatorSessionFromAccount(
  req: NextRequest,
  partnerId: string,
): Promise<PartnerConsoleSession | null> {
  const accountSession = await resolveAccountSession(req);
  if (!accountSession) return null;
  const membership = await assertPartnerMembership(accountSession.accountId, partnerId);
  if (!membership.ok) return null;
  return {
    partnerId,
    environment: "sandbox",
    accountId: accountSession.accountId,
    membershipRole: membership.role,
  };
}

export function attachOperatorSessionCookie(res: import("next/server").NextResponse, token: string): void {
  attachPartnerConsoleSessionCookie(res, token);
}
