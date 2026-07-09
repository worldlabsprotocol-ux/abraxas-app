// FILE: app/api/admin/issuers/[issuerId]/route.ts
// Issuer inspector — profile, signing keys, audit events.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import {
  getIssuerById,
  listIssuerSigningKeys,
  upsertPartnerIssuerTrustRule,
} from "@/lib/trust/issuerFramework";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ issuerId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { issuerId } = await params;
  const issuer = await getIssuerById(issuerId);
  if (!issuer) {
    return NextResponse.json({ error: "Issuer not found" }, { status: 404 });
  }

  const keys = await listIssuerSigningKeys(issuerId);
  const sb = requireSupabaseAdmin();
  const { data: auditEvents } = await sb
    .from("issuer_audit_events")
    .select("*")
    .eq("issuer_id", issuerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ issuer, signing_keys: keys, audit_events: auditEvents ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ issuerId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    key_id?: string;
    public_key_jwk?: Record<string, unknown>;
    allowed_claim_scopes?: string[];
    expires_at?: string | null;
    partner_id?: string;
    policy_id?: string;
    claim_type?: string;
    accepted_issuer_ids?: string[];
  };

  const { issuerId } = await params;
  const actorId = req.headers.get("x-admin-pin") ?? "admin";

  if (body.action === "add_signing_key") {
    if (!body.key_id || !body.public_key_jwk) {
      return NextResponse.json({ error: "key_id and public_key_jwk required" }, { status: 400 });
    }
    const { createIssuerSigningKey } = await import("@/lib/trust/issuerFramework");
    const key = await createIssuerSigningKey({
      issuerId,
      keyId: body.key_id,
      publicKeyJwk: body.public_key_jwk,
      allowedClaimScopes: body.allowed_claim_scopes ?? [],
      expiresAt: body.expires_at,
      actorId,
    });
    return NextResponse.json({ signing_key: key });
  }

  if (body.action === "revoke_signing_key" && body.key_id) {
    const { revokeIssuerSigningKey } = await import("@/lib/trust/issuerFramework");
    const ok = await revokeIssuerSigningKey(body.key_id, actorId);
    if (!ok) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    return NextResponse.json({ ok: true, key_id: body.key_id, status: "revoked" });
  }

  if (body.action === "add_trust_rule") {
    if (!body.partner_id || !body.claim_type || !body.accepted_issuer_ids?.length) {
      return NextResponse.json({ error: "partner_id, claim_type, accepted_issuer_ids required" }, { status: 400 });
    }
    const rule = await upsertPartnerIssuerTrustRule({
      partnerId: body.partner_id,
      policyId: body.policy_id,
      claimType: body.claim_type,
      acceptedIssuerIds: body.accepted_issuer_ids,
    });
    return NextResponse.json({ trust_rule: rule });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
