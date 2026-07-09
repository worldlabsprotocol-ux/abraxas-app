// FILE: app/api/admin/claims/status/route.ts
// Credential lifecycle admin — suspend / revoke / reactivate claims.

import { NextRequest, NextResponse } from "next/server";
import { updateClaimStatus } from "@/lib/credentials/claimsService";
import type { ClaimStatus } from "@/lib/credentials/claimSchema";

const ADMIN_PIN = process.env.ADMIN_PIN ?? process.env.NEXT_PUBLIC_ADMIN_PIN ?? "";

function checkAdmin(req: NextRequest): boolean {
  if (!ADMIN_PIN) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-admin-pin") === ADMIN_PIN;
}

const ALLOWED: ClaimStatus[] = ["active", "suspended", "revoked", "expired"];

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    claim_id?: string;
    status?: ClaimStatus;
    reason?: string;
  };

  if (!body.claim_id || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "claim_id and valid status required" }, { status: 400 });
  }

  try {
    await updateClaimStatus({
      claimId: body.claim_id,
      status: body.status,
      reason: body.reason,
    });
    return NextResponse.json({ ok: true, claim_id: body.claim_id, status: body.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
