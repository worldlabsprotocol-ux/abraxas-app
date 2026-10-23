// FILE: lib/partner/launchpad/operatorSessionFromAccount.ts

import type { NextRequest } from "next/server";
import { resolveAccountSession } from "@/lib/auth/accountSession";
import {
  assertPartnerMembership,
  listPartnerMemberships,
  type PartnerMembershipRole,
} from "@/lib/auth/nativeAccount/store";
import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  attachPartnerConsoleSessionCookie,
  issuePartnerConsoleSessionToken,
  type PartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";

export type ResolveOperatorPartnerResult =
  | { ok: true; partnerId: string; role: PartnerMembershipRole }
  | { ok: false; code: "partner_id_required" | "membership_required" | "application_not_found" | "application_partner_mismatch" };

/** Resolve which partner tenant an Abraxas account may operate under Launchpad. */
export async function resolveOperatorPartnerForAccountMembership(input: {
  accountId: string;
  partnerId?: string;
  applicationId?: string;
}): Promise<ResolveOperatorPartnerResult> {
  const explicitPartner = input.partnerId?.trim();
  const applicationId = input.applicationId?.trim();

  if (applicationId) {
    const app = await getLaunchpadApplicationById(applicationId);
    if (!app) return { ok: false, code: "application_not_found" };
    const appPartnerId = String(app.partner_id);
    if (explicitPartner && explicitPartner !== appPartnerId) {
      return { ok: false, code: "application_partner_mismatch" };
    }
    const membership = await assertPartnerMembership(input.accountId, appPartnerId);
    if (!membership.ok) return { ok: false, code: "membership_required" };
    return { ok: true, partnerId: appPartnerId, role: membership.role };
  }

  if (explicitPartner) {
    const membership = await assertPartnerMembership(input.accountId, explicitPartner);
    if (!membership.ok) return { ok: false, code: "membership_required" };
    return { ok: true, partnerId: explicitPartner, role: membership.role };
  }

  const memberships = await listPartnerMemberships(input.accountId);
  if (memberships.length === 1) {
    const only = memberships[0]!;
    const membership = await assertPartnerMembership(input.accountId, only.partner_id);
    if (!membership.ok) return { ok: false, code: "membership_required" };
    return { ok: true, partnerId: only.partner_id, role: membership.role };
  }

  return { ok: false, code: "partner_id_required" };
}

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
