// FILE: app/api/admin/claims/status/route.ts
// Credential lifecycle admin — validated transitions via status registry.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { transitionClaimStatus } from "@/lib/trust/credentialStatusRegistry";
import type { ClaimStatus } from "@/lib/credentials/claimSchema";

const ALLOWED: ClaimStatus[] = ["active", "suspended", "revoked", "expired", "under_review"];

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    claim_id?: string;
    status?: ClaimStatus;
    reason?: string;
    idempotency_key?: string;
  };

  if (!body.claim_id || !body.status || !ALLOWED.includes(body.status)) {
    return NextResponse.json({ error: "claim_id and valid status required" }, { status: 400 });
  }

  const actorId = req.headers.get("x-admin-pin") ?? "admin";
  const result = await transitionClaimStatus({
    claimId: body.claim_id,
    toStatus: body.status,
    reasonCode: body.reason,
    changedBy: `admin:${actorId}`,
    idempotencyKey: body.idempotency_key,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    claim_id: body.claim_id,
    from_status: result.from,
    status: result.to,
  });
}
