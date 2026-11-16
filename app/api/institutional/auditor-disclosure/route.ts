// FILE: app/api/institutional/auditor-disclosure/route.ts
// Purpose-bound auditor disclosure — signed mandate + server trust + authenticated auditor principal.

import { NextRequest, NextResponse } from "next/server";
import { evaluateAuditorDisclosureAccess } from "@/lib/privacy/auditorDisclosure/enforceAccess";
import type { SignedAuditorDisclosureMandate } from "@/lib/privacy/auditorDisclosure/contract";
import { AUDITOR_DISCLOSURE_PROFILE_NOTICE } from "@/lib/privacy/auditorDisclosure/contract";
import { resolveInstitutionalAuditorPrincipal } from "@/lib/privacy/auditorDisclosure/auditorPrincipal";
import { resolveAuthoritativeAuditorDisclosureTrust } from "@/lib/privacy/auditorDisclosure/serverTrust";
import { loadAuthoritativeReceiptForAuditorDisclosure } from "@/lib/privacy/auditorDisclosure/authoritativeResource";
import {
  authorizeRequestedDisclosurePurpose,
  parseRequestedDisclosurePurpose,
} from "@/lib/privacy/auditorDisclosure/requestPurpose";

const UNTRUSTED_BODY_KEYS = [
  "trust_anchor_public_jwk",
  "signed_issuer_authority",
  "presenter_auditor_id",
  "auditor_credential_id",
  "tenant_id",
  "receipt",
  "custody",
  "environment",
] as const;

function failClosed(reason: string, status = 403): NextResponse {
  return NextResponse.json({ ok: false, error: reason, notice: AUDITOR_DISCLOSURE_PROFILE_NOTICE }, { status });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (UNTRUSTED_BODY_KEYS.some((key) => Object.prototype.hasOwnProperty.call(body, key))) {
    return failClosed("untrusted_body_field_rejected");
  }

  const signedMandate = body.signed_auditor_mandate as SignedAuditorDisclosureMandate | undefined;
  if (!signedMandate?.payload) {
    return NextResponse.json({ ok: false, error: "missing_signed_auditor_mandate" }, { status: 400 });
  }

  const requestedPurpose = parseRequestedDisclosurePurpose(body.disclosure_purpose);
  if (typeof requestedPurpose !== "string") {
    return NextResponse.json({ ok: false, error: requestedPurpose.reason }, { status: 400 });
  }

  const principal = await resolveInstitutionalAuditorPrincipal(req);
  if (!principal.ok) {
    return NextResponse.json({ ok: false, error: principal.reason }, { status: principal.status });
  }

  if (principal.principal.auditor_credential_id !== signedMandate.payload.authorized_auditor_id) {
    return failClosed("authenticated_auditor_credential_mismatch");
  }

  if (principal.principal.tenant_id !== signedMandate.payload.tenant_id) {
    return failClosed("authenticated_tenant_mismatch");
  }

  const purposeCheck = authorizeRequestedDisclosurePurpose({
    requestedPurpose,
    mandatePurpose: signedMandate.payload.purpose,
    principalAllowedPurposes: principal.principal.allowed_purposes,
  });
  if (!purposeCheck.ok) {
    return failClosed(purposeCheck.reason);
  }

  if (principal.principal.audience_hash !== signedMandate.payload.audience_hash) {
    return failClosed("authenticated_audience_mismatch");
  }

  const trust = await resolveAuthoritativeAuditorDisclosureTrust();
  if (!trust.ok) {
    return failClosed(trust.reason, 503);
  }

  if (signedMandate.payload.environment !== trust.trust.environment) {
    return failClosed("auditor_mandate_environment_mismatch");
  }

  const resourceRef = signedMandate.payload.resource_ref;
  const authoritative = await loadAuthoritativeReceiptForAuditorDisclosure({
    receiptId: resourceRef,
    tenantPartnerId: principal.principal.partner_id,
  });
  if (!authoritative.ok) {
    return failClosed(authoritative.reason);
  }

  const result = evaluateAuditorDisclosureAccess({
    signedMandate,
    signedIssuerAuthority: trust.trust.signedIssuerAuthority,
    trustAnchorPublicJwk: trust.trust.trustAnchorPublicJwk,
    environment: trust.trust.environment,
    now: new Date(),
    presenter_auditor_id: principal.principal.auditor_credential_id,
    tenant_id: principal.principal.tenant_id,
    receipt: authoritative.record,
    custody: authoritative.custody,
    request_context: {
      audience_hash: principal.principal.audience_hash,
      purpose: requestedPurpose,
    },
    minimumRegistryVersion: trust.trust.minimumRegistryVersion,
    principal_allowed_purposes: principal.principal.allowed_purposes,
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