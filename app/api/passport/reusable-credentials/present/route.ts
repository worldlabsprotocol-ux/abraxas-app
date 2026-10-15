// FILE: app/api/passport/reusable-credentials/present/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import {
  BUILD_566_POLICY_RULES,
  authorizePartnerFromReusableCredential,
  build566RevocationSnapshotForCredential,
  build566SyntheticReusableCredential,
  buildPresentationRequestDisclosure,
  isPassportReusableCredentialDemoAllowed,
} from "@/lib/passport/reusableCredential";
import { BUILD_546_FIXTURE_NOW, BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";

export async function POST(req: NextRequest) {
  const csrf = portableTrustCsrfRejected(req);
  if (csrf) {
    return NextResponse.json({ error: csrf }, { status: 403 });
  }
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    return NextResponse.json(
      { error: session.message },
      { status: session.error === "forbidden" ? 403 : 401 },
    );
  }
  if (!isPassportReusableCredentialDemoAllowed()) {
    return NextResponse.json({ error: "reusable_credential_present_disabled_in_production" }, { status: 403 });
  }

  let body: { partner_id?: string; policy_id?: string; request_id?: string; credential_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.partner_id || !body.policy_id) {
    return NextResponse.json({ error: "partner_id and policy_id required" }, { status: 400 });
  }

  const credential = build566SyntheticReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: body.credential_id ?? `pc_present_${session.subjectId.slice(-8)}`,
  });
  const revocation = build566RevocationSnapshotForCredential(credential.payload.credential_id);
  const requestId = body.request_id ?? `req_present_${Date.now()}`;

  const authorized = await authorizePartnerFromReusableCredential({
    credential,
    holderSubjectId: session.subjectId,
    partnerId: body.partner_id,
    policyId: body.policy_id,
    policyVersion: 1,
    policyRules: BUILD_566_POLICY_RULES,
    requestId,
    signingKey: BUILD_546_PRIMARY_KEY,
    trustedCredentialIssuerIds: [credential.payload.issuer_id],
    portableRevocationSnapshot: revocation,
    now: BUILD_546_FIXTURE_NOW,
  });

  if (!authorized.ok) {
    return NextResponse.json({ error: authorized.code, sandbox_only: true }, { status: 400 });
  }

  const disclosure = buildPresentationRequestDisclosure({
    credentialId: credential.payload.credential_id,
    partnerId: body.partner_id,
    partnerLabel: body.partner_id,
    policyId: body.policy_id,
    requestedAttribute: "product_eligibility (over_21)",
  });

  return NextResponse.json({
    synthetic_demo: true,
    sandbox_only: true,
    idv_repeated: false,
    disclosure,
    partner_authorization: {
      receipt_id: authorized.receipt.id,
      partner_id: authorized.receipt.partner_id,
      policy_id: authorized.receipt.policy_id,
      not_a_reusable_credential: true,
    },
    presentation: authorized.presentation,
  });
}
