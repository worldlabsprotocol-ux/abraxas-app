// FILE: lib/privacy/auditorDisclosure/auditorDisclosure.integration.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { issuerAuthorityStateDigest } from "@abraxas/independent-verifier";
import { publishSignedIssuerAuthorityFromRegistry } from "@/lib/persistence/boundary/issuerAuthority/buildFromRegistry";
import { INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS } from "./contract";
import {
  buildControlledAuditorMandateIssuerFixture,
  buildControlledSignedAuditorMandate,
  controlledAuditorReceiptRecord,
  CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";
import { INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS } from "./contract";
import * as recordedWorkflow from "@/lib/institutional/signing/recordedWorkflow";
import * as registryContinuity from "@/lib/persistence/boundary/issuerAuthority/registryContinuity";
import * as receiptViews from "@/lib/decisionReceipts/views";
import { resolveAuthoritativeAuditorDisclosureTrust } from "./serverTrust";
import { resolveInstitutionalAuditorPrincipal } from "./auditorPrincipal";
import { loadAuthoritativeReceiptForAuditorDisclosure } from "./authoritativeResource";
import { POST as auditorDisclosurePOST } from "@/app/api/institutional/auditor-disclosure/route";
import { publicReceiptJwkFingerprint } from "@/lib/decisionReceipts/verificationKeyLifecycle/fingerprint";

const requireSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  requirePartnerConsoleSession: (...args: unknown[]) => requireSessionMock(...args),
  resolvePartnerConsoleSessionKeyId: (session: { apiKeyId?: string; accountId?: string }) => {
    if (session.apiKeyId) return session.apiKeyId;
    if (session.accountId) return `native_account:${session.accountId}`;
    return null;
  },
}));

function registryJsonFromFixture(fixture: ReturnType<typeof buildControlledAuditorMandateIssuerFixture>) {
  return JSON.stringify(
    fixture.signedIssuerAuthority.payload.keys.map((key) => ({
      key_id: key.key_id,
      environment: key.environment,
      status: key.status,
      public_jwk: key.public_jwk,
      fingerprint: publicReceiptJwkFingerprint(key.public_jwk as { kty: "OKP"; crv: "Ed25519"; x: string }),
      issued_at: "2020-01-01T00:00:00.000Z",
      not_before: key.not_before,
      expires_at: key.expires_at,
      schema_versions: key.schema_versions,
      reason_class: key.reason_class,
      allow_historical_verification: key.allow_historical_verification,
      historical_verify_until: key.historical_verify_until,
    })),
  );
}

function buildIntegrationEnv() {
  const anchor = generateTestSigningKeyPair("build968-integration-anchor");
  const auditorIssuer = generateTestSigningKeyPair("build968-integration-auditor-issuer");
  const baseEnv: Record<string, string> = {
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: anchor.signingKeyId,
    ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(anchor.publicKeyJwk),
    ABRAXAS_INSTITUTIONAL_TENANT_ID: CONTROLLED_TENANT_ID,
    ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([{
      credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
      partner_id: "acme",
      session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
      auditor_credential_id: CONTROLLED_AUDITOR_ID,
      tenant_id: CONTROLLED_TENANT_ID,
      audience_hash: "audience_hash_demo_968",
      allowed_purposes: ["regulatory_examination"],
    }]),
    ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: JSON.stringify([
      {
        key_id: auditorIssuer.signingKeyId,
        environment: "demo",
        status: "active",
        public_jwk: auditorIssuer.publicKeyJwk,
        fingerprint: publicReceiptJwkFingerprint(auditorIssuer.publicKeyJwk as { kty: "OKP"; crv: "Ed25519"; x: string }),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: ["1.0.0"],
        reason_class: INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]),
    VERCEL_ENV: "preview",
  };
  const signed = publishSignedIssuerAuthorityFromRegistry({
    registryVersion: 968100,
    supersedesRegistryVersion: null,
    anchorKeyId: anchor.signingKeyId,
    anchorPrivateJwk: anchor.privateKeyJwk,
    env: baseEnv,
  });
  if (typeof signed === "object" && "ok" in signed && signed.ok === false) throw new Error(signed.reason);
  const statement = signed as Exclude<typeof signed, { ok: false; reason: string }>;
  return {
    env: {
      ...baseEnv,
      ABRAXAS_PUBLISHED_SIGNED_ISSUER_AUTHORITY_JSON: JSON.stringify(statement),
    },
    anchor,
    statement,
    authorityDigest: issuerAuthorityStateDigest(statement.payload),
  };
}

describe("Build 968 auditor disclosure integration path", () => {
  let loadReceiptSpy: ReturnType<typeof vi.spyOn>;
  let continuitySpy: ReturnType<typeof vi.spyOn>;
  let anchorSpy: ReturnType<typeof vi.spyOn>;
  let verifySignatureSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    loadReceiptSpy = vi.spyOn(recordedWorkflow, "loadRecordedDecisionReceipt");
    continuitySpy = vi.spyOn(registryContinuity, "readCurrentIssuerAuthorityRow");
    anchorSpy = vi.spyOn(registryContinuity, "readConfiguredIssuerAnchor");
    verifySignatureSpy = vi.spyOn(receiptViews, "verifyRecordSignature").mockReturnValue(true);
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: {
        partnerId: "acme",
        environment: "sandbox",
        apiKeyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
        authKind: "api_key",
      },
    });
  });

  afterEach(() => {
    loadReceiptSpy.mockRestore();
    continuitySpy.mockRestore();
    anchorSpy.mockRestore();
    verifySignatureSpy.mockRestore();
  });

  it("resolveAuthoritativeAuditorDisclosureTrust uses verify-only published issuer authority", async () => {
    const { env, anchor, authorityDigest } = buildIntegrationEnv();
    anchorSpy.mockReturnValue({
      ok: true,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
    });
    continuitySpy.mockResolvedValue({
      ok: true,
      row: {
        registryVersion: 968100,
        authorityStateDigest: authorityDigest,
        supersedesRegistryVersion: null,
      },
    });
    const trust = await resolveAuthoritativeAuditorDisclosureTrust(env);
    expect(trust.ok).toBe(true);
    expect(env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PRIVATE_JWK).toBeUndefined();
  });

  it("resolveAuthoritativeAuditorDisclosureTrust fails closed on forged published issuer authority", async () => {
    const { env, anchor, statement, authorityDigest } = buildIntegrationEnv();
    anchorSpy.mockReturnValue({
      ok: true,
      anchorKeyId: anchor.signingKeyId,
      anchorPublicJwk: anchor.publicKeyJwk,
    });
    continuitySpy.mockResolvedValue({
      ok: true,
      row: {
        registryVersion: 968100,
        authorityStateDigest: authorityDigest,
        supersedesRegistryVersion: null,
      },
    });
    env.ABRAXAS_PUBLISHED_SIGNED_ISSUER_AUTHORITY_JSON = JSON.stringify({
      ...statement,
      signature: `${statement.signature.slice(0, -4)}xxxx`,
    });
    const trust = await resolveAuthoritativeAuditorDisclosureTrust(env);
    expect(trust.ok).toBe(false);
  });

  it("loadAuthoritativeReceiptForAuditorDisclosure loads store record (not client body)", async () => {
    const record = controlledAuditorReceiptRecord();
    loadReceiptSpy.mockResolvedValue({ ok: true, record });
    const loaded = await loadAuthoritativeReceiptForAuditorDisclosure({
      receiptId: record.id,
      tenantPartnerId: "acme",
    });
    expect(loaded.ok).toBe(true);
    expect(loadReceiptSpy).toHaveBeenCalledWith({ env: process.env, receiptId: record.id });
  });

  it("POST route integrates real trust, principal, and authoritative receipt loaders", async () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const registryOnlyAuditorKey = JSON.stringify([
      {
        key_id: fixture.auditorMandateIssuerKey.signingKeyId,
        environment: "demo",
        status: "active",
        public_jwk: fixture.auditorMandateIssuerKey.publicKeyJwk,
        fingerprint: publicReceiptJwkFingerprint(
          fixture.auditorMandateIssuerKey.publicKeyJwk as { kty: "OKP"; crv: "Ed25519"; x: string },
        ),
        issued_at: "2020-01-01T00:00:00.000Z",
        not_before: "2020-01-01T00:00:00.000Z",
        expires_at: null,
        schema_versions: ["1.0.0"],
        reason_class: INSTITUTIONAL_AUDITOR_MANDATE_ISSUER_REASON_CLASS,
        allow_historical_verification: false,
        historical_verify_until: null,
      },
    ]);
    const published = publishSignedIssuerAuthorityFromRegistry({
      registryVersion: fixture.signedIssuerAuthority.payload.registry_version,
      supersedesRegistryVersion: null,
      anchorKeyId: fixture.anchorKey.signingKeyId,
      anchorPrivateJwk: fixture.anchorKey.privateKeyJwk,
      env: {
        ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: registryOnlyAuditorKey,
        VERCEL_ENV: "preview",
      },
    });
    if (typeof published === "object" && "ok" in published && published.ok === false) throw new Error(published.reason);
    const env = {
      ...buildIntegrationEnv().env,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID: fixture.anchorKey.signingKeyId,
      ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK: JSON.stringify(fixture.trustAnchorPublicJwk),
      ABRAXAS_RECEIPT_VERIFICATION_REGISTRY: registryOnlyAuditorKey,
      ABRAXAS_PUBLISHED_SIGNED_ISSUER_AUTHORITY_JSON: JSON.stringify(published),
    };
    const authorityDigest = issuerAuthorityStateDigest((published as Exclude<typeof published, { ok: false }>).payload);
    Object.assign(process.env, env);
    anchorSpy.mockImplementation(() => ({
      ok: true,
      anchorKeyId: fixture.anchorKey.signingKeyId,
      anchorPublicJwk: fixture.trustAnchorPublicJwk,
    }));
    continuitySpy.mockResolvedValue({
      ok: true,
      row: {
        registryVersion: (published as Exclude<typeof published, { ok: false }>).payload.registry_version,
        authorityStateDigest: authorityDigest,
        supersedesRegistryVersion: null,
      },
    });
    const record = controlledAuditorReceiptRecord();
    loadReceiptSpy.mockResolvedValue({ ok: true, record });

    const signed = buildControlledSignedAuditorMandate({ fixture });

    const req = new NextRequest("http://localhost/api/institutional/auditor-disclosure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signed_auditor_mandate: signed,
        disclosure_purpose: "regulatory_examination",
      }),
    });

    const principal = await resolveInstitutionalAuditorPrincipal(req, env);
    expect(principal.ok).toBe(true);

    const res = await auditorDisclosurePOST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok?: boolean };
    expect(json.ok).toBe(true);
  });

  it("POST route fails closed on disallowed disclosure purpose with real principal resolver", async () => {
    const fixture = buildControlledAuditorMandateIssuerFixture();
    const env = {
      ...buildIntegrationEnv().env,
      ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([{
        credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
        partner_id: "acme",
        session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
        auditor_credential_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        audience_hash: "audience_hash_demo_968",
        allowed_purposes: ["regulatory_examination"],
      }]),
    };
    Object.assign(process.env, env);
    const signed = buildControlledSignedAuditorMandate({ fixture });
    const req = new NextRequest("http://localhost/api/institutional/auditor-disclosure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signed_auditor_mandate: signed,
        disclosure_purpose: "soc2_type2",
      }),
    });
    const principal = await resolveInstitutionalAuditorPrincipal(req, env);
    expect(principal.ok).toBe(true);
    const res = await auditorDisclosurePOST(req);
    expect(res.status).toBe(403);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("disclosure_purpose_not_authorized_for_credential");
  });
});