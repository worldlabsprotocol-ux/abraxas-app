// FILE: app/api/auth/native/session/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  clearAccountSessionCookie,
  resolveAccountSession,
} from "@/lib/auth/accountSession";
import { listPartnerMemberships } from "@/lib/auth/nativeAccount/store";
import { assertNativeAuthEnabled, mapNativeStoreError } from "@/lib/auth/nativeAccount/apiGate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const session = await resolveAccountSession(req);
  if (!session) {
    return NextResponse.json({ ok: true, authenticated: false });
  }

  try {
    const memberships = await listPartnerMemberships(session.accountId);
    return NextResponse.json({
      ok: true,
      authenticated: true,
      account_id: session.accountId,
      auth_method: session.authMethod,
      partner_memberships: memberships,
    });
  } catch (error) {
    const mapped = mapNativeStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}

export async function DELETE() {
  const disabled = assertNativeAuthEnabled();
  if (disabled) return disabled;

  const res = NextResponse.json({ ok: true });
  clearAccountSessionCookie(res);
  return res;
}
