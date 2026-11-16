// FILE: lib/privacy/auditorDisclosure/auditorApiBypass.adversarial.test.ts
// Proves auditors cannot reach privileged custody APIs without admin authorization.

import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  buildControlledAuditorMandateIssuerFixture,
  buildControlledSignedAuditorMandate,
  controlledAuditorReceiptRecord,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";
import { POST as auditorDisclosurePOST } from "@/app/api/institutional/auditor-disclosure/route";

const readAdminEvidenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin/requireAdminRouteAccess", () => ({
  requireAdminRouteAccess: vi.fn(async () =>
    NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  ),
}));

vi.mock("@/lib/idv/sovereignAdminEvidenceAccess", () => ({
  readAdminEvidenceByCustody: (...args: unknown[]) => readAdminEvidenceMock(...args),
  SovereignEvidenceAccessDeniedError: class SovereignEvidenceAccessDeniedError extends Error {
    readonly code = "evidence_access_denied" as const;
  },
}));

import { GET as adminDocumentUrlGET } from "@/app/api/admin/identity/document-url/route";

function auditorRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("https://example.test/api/institutional/auditor-disclosure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Build 968 API bypass — auditor vs admin evidence", () => {
  it("admin document-url denies unauthenticated callers (no admin session)", async () => {
    const req = new NextRequest(
      "https://example.test/api/admin/identity/document-url?capture_session_id=sess1&artifact_kind=id_front",
    );
    const res = await adminDocumentUrlGET(req);
    expect(res.status).toBe(401);
    expect(readAdminEvidenceMock).not.toHaveBeenCalled();
  });

  it("auditor disclosure API denies missing mandate fields (role alone insufficient)", async () => {
    const res = await auditorDisclosurePOST(
      auditorRequest({ presenter_auditor_id: CONTROLLED_AUDITOR_ID, tenant_id: CONTROLLED_TENANT_ID }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("missing_required_fields");
  });

  it("auditor disclosure API denies receipt-only mandate signer", async () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({ fixture, signWith: "receipt_only" });
    const res = await auditorDisclosurePOST(
      auditorRequest({
        signed_auditor_mandate: signed,
        signed_issuer_authority: fixture.signedIssuerAuthority,
        trust_anchor_public_jwk: fixture.trustAnchorPublicJwk,
        presenter_auditor_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        receipt: controlledAuditorReceiptRecord(),
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("issuer_not_authorized_for_auditor_mandate_class");
  });

  it("auditor cannot obtain plaintext even when invoking admin route with auditor-presented ids", async () => {
    const req = new NextRequest(
      "https://example.test/api/admin/identity/document-url?capture_session_id=sess_auditor&artifact_kind=selfie",
      { headers: { "x-abraxas-auditor-id": CONTROLLED_AUDITOR_ID } },
    );
    const res = await adminDocumentUrlGET(req);
    expect(res.status).toBe(401);
    expect(readAdminEvidenceMock).not.toHaveBeenCalled();
  });

  it("valid auditor mandate returns allowlisted disclosure only via API path", async () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({ fixture });
    const res = await auditorDisclosurePOST(
      auditorRequest({
        signed_auditor_mandate: signed,
        signed_issuer_authority: fixture.signedIssuerAuthority,
        trust_anchor_public_jwk: fixture.trustAnchorPublicJwk,
        presenter_auditor_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        receipt: controlledAuditorReceiptRecord(),
        custody: {
          custody_status: "encrypted_custody",
          evidence_classification: "identity_verification",
          evidence_commitment: { digest: "commit_demo", entry_count: 1 },
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; disclosure?: Record<string, unknown> };
    expect(json.ok).toBe(true);
    expect(json.disclosure?.plaintext).toBeUndefined();
    expect(json.disclosure?.storage_path).toBeUndefined();
    expect(json.disclosure?.selfie).toBeUndefined();
  });
});