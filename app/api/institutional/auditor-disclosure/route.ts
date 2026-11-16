// FILE: app/api/institutional/auditor-disclosure/route.ts
// Purpose-bound auditor disclosure — requires signed auditor mandate (not role alone).

import { NextRequest, NextResponse } from "next/server";
import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import { evaluateAuditorDisclosureAccess } from "@/lib/privacy/auditorDisclosure/enforceAccess";
import type { SignedAuditorDisclosureMandate } from "@/lib/privacy/auditorDisclosure/contract";
import { AUDITOR_DISCLOSURE_PROFILE_NOTICE } from "@/lib/privacy/auditorDisclosure/contract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { AuditorDisclosureCustodyMeta } from "@/lib/privacy/auditorDisclosure/buildSource";

export type AuditorDisclosureRequestBody = {
  signed_auditor_mandate: SignedAuditorDisclosureMandate;
  signed_issuer_authority: SignedIssuerAuthorityStatement;
  trust_anchor_public_jwk: JsonWebKey;
  presenter_auditor_id: string;
  tenant_id: string;
  environment?: "demo" | "production";
  receipt?: DecisionReceiptRecord;
  custody?: AuditorDisclosureCustodyMeta;
};

function failClosed(reason: string, status = 403): NextResponse {
  return NextResponse.json({ ok: false, error: reason, notice: AUDITOR_DISCLOSURE_PROFILE_NOTICE }, { status });
}

export async function POST(req: NextRequest) {
  let body: AuditorDisclosureRequestBody;
  try {
    body = (await req.json()) as AuditorDisclosureRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (
    !body?.signed_auditor_mandate?.payload
    || !body.signed_issuer_authority?.payload
    || !body.trust_anchor_public_jwk
    || !body.presenter_auditor_id
    || !body.tenant_id
  ) {
    return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }

  const environment = body.environment ?? body.signed_auditor_mandate.payload.environment;
  const receipt = body.receipt ?? null;
  const custody: AuditorDisclosureCustodyMeta = body.custody ?? {
    custody_status: "encrypted_custody",
    evidence_classification: "identity_verification",
    evidence_commitment: null,
  };

  const result = evaluateAuditorDisclosureAccess({
    signedMandate: body.signed_auditor_mandate,
    signedIssuerAuthority: body.signed_issuer_authority,
    trustAnchorPublicJwk: body.trust_anchor_public_jwk,
    environment,
    now: new Date(),
    presenter_auditor_id: body.presenter_auditor_id,
    tenant_id: body.tenant_id,
    receipt,
    custody,
  });

  if (!result.ok) {
    return failClosed(result.reason);
  }

  return NextResponse.json({
    ok: true,
    disclosure_surface: "auditor_review",
    disclosure: result.disclosure,
    trust_boundaries: result.trust_boundaries,
    notice: AUDITOR_DISCLOSURE_PROFILE_NOTICE,
  });
}