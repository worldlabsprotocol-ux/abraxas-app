// FILE: lib/privacy/auditorDisclosure/auditorApiBypass.adversarial.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  buildControlledAuditorMandateIssuerFixture,
  buildControlledSignedAuditorMandate,
  controlledAuditorReceiptRecord,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";

const resolvePrincipalMock = vi.hoisted(() => vi.fn());
const resolveTrustMock = vi.hoisted(() => vi.fn());
const loadReceiptMock = vi.hoisted(() => vi.fn());
const readAdminEvidenceMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/privacy/auditorDisclosure/auditorPrincipal", () => ({
  resolveInstitutionalAuditorPrincipal: (...args: unknown[]) => resolvePrincipalMock(...args),
}));

vi.mock("@/lib/privacy/auditorDisclosure/serverTrust", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./serverTrust")>();
  return {
    ...actual,
    resolveAuthoritativeAuditorDisclosureTrust: (...args: unknown[]) => resolveTrustMock(...args),
  };
});

vi.mock("@/lib/privacy/auditorDisclosure/authoritativeResource", () => ({
  loadAuthoritativeReceiptForAuditorDisclosure: (...args: unknown[]) => loadReceiptMock(...args),
}));

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
import { POST as auditorDisclosurePOST } from "@/app/api/institutional/auditor-disclosure/route";

function auditorRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("https://example.test/api/institutional/auditor-disclosure", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      disclosure_purpose: "regulatory_examination",
      ...body,
    }),
  });
}

function mockHappyPath() {
  const fixture = buildControlledAuditorMandateIssuerFixture();
  const signed = buildControlledSignedAuditorMandate({ fixture });
  resolvePrincipalMock.mockResolvedValue({
    ok: true,
    principal: {
      auditor_credential_id: CONTROLLED_AUDITOR_ID,
      tenant_id: CONTROLLED_TENANT_ID,
      audience_hash: signed.payload.audience_hash,
      allowed_purposes: [signed.payload.purpose],
      partner_id: "acme",
      session_key_id: "f47ac10b-58cc-4372-a567-0e02b2c3d968",
    },
  });
  resolveTrustMock.mockResolvedValue({
    ok: true,
    trust: {
      signedIssuerAuthority: fixture.signedIssuerAuthority,
      trustAnchorPublicJwk: fixture.trustAnchorPublicJwk,
      environment: "demo" as const,
      minimumRegistryVersion: 968001,
    },
  });
  loadReceiptMock.mockResolvedValue({
    ok: true,
    record: controlledAuditorReceiptRecord(),
    custody: {
      custody_status: "encrypted_custody",
      evidence_classification: "identity_verification",
      evidence_commitment: null,
    },
  });
  return { fixture, signed };
}

describe("Build 968 API bypass — auditor vs admin evidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.ABRAXAS_AUDITOR_DISCLOSURE_REVOKED_MANDATES;
  });

  it("admin document-url denies unauthenticated callers (no admin session)", async () => {
    const req = new NextRequest(
      "https://example.test/api/admin/identity/document-url?capture_session_id=sess1&artifact_kind=id_front",
    );
    const res = await adminDocumentUrlGET(req);
    expect(res.status).toBe(401);
    expect(readAdminEvidenceMock).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied trust anchor and issuer authority in body", async () => {
    const { fixture, signed } = mockHappyPath();
    const res = await auditorDisclosurePOST(
      auditorRequest({
        signed_auditor_mandate: signed,
        trust_anchor_public_jwk: fixture.trustAnchorPublicJwk,
        signed_issuer_authority: fixture.signedIssuerAuthority,
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("untrusted_body_field_rejected");
    expect(resolveTrustMock).not.toHaveBeenCalled();
  });

  it("rejects caller-supplied auditor_credential_id (session registry is authoritative)", async () => {
    const { signed } = mockHappyPath();
    const res = await auditorDisclosurePOST(
      auditorRequest({
        signed_auditor_mandate: signed,
        auditor_credential_id: "auditor_substitution_attempt",
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("untrusted_body_field_rejected");
  });

  it("rejects caller-supplied receipt and tenant impersonation fields", async () => {
    mockHappyPath();
    const forged = {
      ...controlledAuditorReceiptRecord(),
      partner_id: "evil",
      decision_result: "approved",
    };
    const res = await auditorDisclosurePOST(
      auditorRequest({
        signed_auditor_mandate: buildControlledSignedAuditorMandate({
          fixture: buildControlledAuditorMandateIssuerFixture(),
        }),
        presenter_auditor_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        receipt: forged,
      }),
    );
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("untrusted_body_field_rejected");
    expect(loadReceiptMock).not.toHaveBeenCalled();
  });

  it("rejects forged presenter credential when principal does not match mandate", async () => {
    const { signed } = mockHappyPath();
    resolvePrincipalMock.mockResolvedValue({
      ok: true,
      principal: {
        auditor_credential_id: "auditor_attacker",
        tenant_id: CONTROLLED_TENANT_ID,
        audience_hash: signed.payload.audience_hash,
        allowed_purposes: [signed.payload.purpose],
        partner_id: "acme",
        session_key_id: "native_account:attacker",
      },
    });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("authenticated_auditor_credential_mismatch");
  });

  it("rejects cross-tenant body tenant claims via authenticated tenant binding", async () => {
    const { signed } = mockHappyPath();
    resolvePrincipalMock.mockResolvedValue({
      ok: true,
      principal: {
        auditor_credential_id: CONTROLLED_AUDITOR_ID,
        tenant_id: "tenant_other",
        audience_hash: signed.payload.audience_hash,
        allowed_purposes: [signed.payload.purpose],
        partner_id: "acme",
        session_key_id: "native_account:auditor-demo",
      },
    });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("authenticated_tenant_mismatch");
  });

  it("rejects self-signed attacker anchor (server trust resolution fails closed)", async () => {
    const { signed } = mockHappyPath();
    resolveTrustMock.mockResolvedValue({ ok: false, reason: "published_issuer_authority_unconfigured" });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(503);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("published_issuer_authority_unconfigured");
  });

  it("rejects altered evidence when authoritative source disagrees with mandate resource", async () => {
    const { signed } = mockHappyPath();
    loadReceiptMock.mockResolvedValue({
      ok: true,
      record: { ...controlledAuditorReceiptRecord(), id: "dr_tampered_source" },
      custody: {
        custody_status: "encrypted_custody",
        evidence_classification: "identity_verification",
        evidence_commitment: null,
      },
    });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("auditor_mandate_resource_mismatch");
  });

  it("rejects wrong audience for authenticated request context", async () => {
    const { signed } = mockHappyPath();
    resolvePrincipalMock.mockResolvedValue({
      ok: true,
      principal: {
        auditor_credential_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        audience_hash: "audience_wrong_for_request",
        allowed_purposes: [signed.payload.purpose],
        partner_id: "acme",
        session_key_id: "native_account:auditor-demo",
      },
    });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("authenticated_audience_mismatch");
  });

  it("rejects disallowed purpose for authenticated request context", async () => {
    const { signed } = mockHappyPath();
    resolvePrincipalMock.mockResolvedValue({
      ok: true,
      principal: {
        auditor_credential_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        audience_hash: signed.payload.audience_hash,
        allowed_purposes: ["soc2_type2"],
        partner_id: "acme",
        session_key_id: "native_account:auditor-demo",
      },
    });
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("disclosure_purpose_not_authorized_for_credential");
  });

  it("auditor disclosure API denies receipt-only mandate signer", async () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const signed = buildControlledSignedAuditorMandate({ fixture, signWith: "receipt_only" });
    mockHappyPath();
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
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
    const { signed } = mockHappyPath();
    const res = await auditorDisclosurePOST(auditorRequest({ signed_auditor_mandate: signed }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean; disclosure?: Record<string, unknown> };
    expect(json.ok).toBe(true);
    expect(json.disclosure?.plaintext).toBeUndefined();
    expect(json.disclosure?.storage_path).toBeUndefined();
    expect(json.disclosure?.selfie).toBeUndefined();
    expect(loadReceiptMock).toHaveBeenCalled();
  });
});