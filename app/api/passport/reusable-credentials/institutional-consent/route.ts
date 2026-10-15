// FILE: app/api/passport/reusable-credentials/institutional-consent/route.ts

import { NextRequest, NextResponse } from "next/server";
import { portableTrustCsrfRejected } from "@/lib/passport/portableTrust/csrf";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { resolveHolderReusableCredential } from "@/lib/passport/reusableCredential/resolveStoredCredential";
import { isPassportReusableCredentialStorageEnabled } from "@/lib/passport/reusableCredential/storageGate";
import { resolvePresentationPartnerPolicy } from "@/lib/passport/reusableCredential/institutionalPresentationPolicy";
import { hashInstitutionalConsentBinding } from "@/lib/passport/reusableCredential/institutionalConsentBinding";
import { insertInstitutionalPresentationConsentDirect } from "@/lib/persistence/passportInstitutionalConsentDirect";

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
  if (!isPassportReusableCredentialStorageEnabled()) {
    return NextResponse.json({ error: "storage_disabled" }, { status: 403 });
  }

  let body: { partner_id?: string; policy_id?: string; credential_id?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.partner_id || !body.policy_id || !body.credential_id) {
    return NextResponse.json(
      { error: "partner_id, policy_id, and credential_id required" },
      { status: 400 },
    );
  }

  const credential = await resolveHolderReusableCredential({
    holderSubjectId: session.subjectId,
    credentialId: body.credential_id,
  });
  if (!credential) {
    return NextResponse.json({ error: "credential_not_found" }, { status: 404 });
  }

  const policy = await resolvePresentationPartnerPolicy({
    partnerId: body.partner_id,
    policyId: body.policy_id,
    credential,
  });
  if (!policy.ok) {
    return NextResponse.json({ error: policy.code }, { status: 403 });
  }

  const disclosureHash = hashInstitutionalConsentBinding({
    holder_subject_id: session.subjectId,
    credential_id: credential.payload.credential_id,
    partner_id: body.partner_id,
    policy_id: body.policy_id,
    policy_version: policy.entry.policy_version,
    requested_attribute: policy.entry.requested_attribute,
  });

  const inserted = await insertInstitutionalPresentationConsentDirect({
    holderSubjectId: session.subjectId,
    credentialId: credential.payload.credential_id,
    partnerId: body.partner_id,
    policyId: body.policy_id,
    policyVersion: policy.entry.policy_version,
    disclosureHash,
  });
  if (!inserted.ok) {
    return NextResponse.json({ error: inserted.code }, { status: 503 });
  }

  return NextResponse.json({
    build: 568,
    consent_id: inserted.consentId,
    expires_at: inserted.expiresAt,
    partner_id: body.partner_id,
    policy_id: body.policy_id,
    policy_version: policy.entry.policy_version,
    credential_id: credential.payload.credential_id,
    note: "Single-use consent for this institution, policy, credential, and disclosure scope.",
  });
}
