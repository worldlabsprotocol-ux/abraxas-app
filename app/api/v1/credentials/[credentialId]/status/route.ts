// FILE: app/api/v1/credentials/[credentialId]/status/route.ts
// Partner-authenticated credential status — no PII.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getCredentialStatusPublic } from "@/lib/trust/credentialStatusRegistry";
import { appendAuditEvent } from "@/lib/verification/audit";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:credential");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { credentialId } = await params;
  const status = await getCredentialStatusPublic(credentialId);

  if (!status) {
    void logPartnerUsage({
      endpoint: "/api/v1/credentials/{credentialId}/status",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 404,
      responseTimeMs: Date.now() - started,
      recordId: credentialId,
    });
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  void appendAuditEvent({
    actor_type: "partner",
    actor_id: auth.partnerId,
    action: "credential_status.lookup",
    object_type: "credential_claim",
    object_id: credentialId,
    metadata: { status: status.status },
  });

  void logPartnerUsage({
    endpoint: "/api/v1/credentials/{credentialId}/status",
    method: "GET",
    success: true,
    partner: auth.ctx,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    recordId: credentialId,
  });

  return NextResponse.json({
    artifact_type: "credential_status",
    credential: status,
  });
}
