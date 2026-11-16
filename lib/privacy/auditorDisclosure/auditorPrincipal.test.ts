// FILE: lib/privacy/auditorDisclosure/auditorPrincipal.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
  CONTROLLED_AUDITOR_ID,
  CONTROLLED_TENANT_ID,
} from "./controlledFixture";
import {
  INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
  assertIndividualAuditorCredentialSessionKey,
} from "./contract";
import { parseAuditorAccessRegistry, resolveInstitutionalAuditorPrincipal } from "./auditorPrincipal";

const requireSessionMock = vi.hoisted(() => vi.fn());
const launchpadPgMock = vi.hoisted(() => ({
  pgResolvePartnerApiKeyForAuditorCredential: vi.fn(),
}));
const sovereignPgFlag = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/lib/partner/launchpad/launchpadPersistence", () => ({
  launchpadUsesSovereignPostgres: () => sovereignPgFlag(),
}));

vi.mock("@/lib/partner/launchpad/sovereign/launchpadPgStore", () => ({
  pgResolvePartnerApiKeyForAuditorCredential: (...args: unknown[]) =>
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  requirePartnerConsoleSession: (...args: unknown[]) => requireSessionMock(...args),
  resolvePartnerConsoleSessionKeyId: (session: { apiKeyId?: string; accountId?: string }) => {
    if (session.apiKeyId) return session.apiKeyId;
    if (session.accountId) return `native_account:${session.accountId}`;
    return null;
  },
}));

function registryEnv(overrides: Record<string, unknown> = {}) {
  return {
    ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([
      {
        credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
        partner_id: "acme",
        session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
        auditor_credential_id: CONTROLLED_AUDITOR_ID,
        tenant_id: CONTROLLED_TENANT_ID,
        audience_hash: "audience_hash_demo_968",
        allowed_purposes: ["regulatory_examination"],
        ...overrides,
      },
    ]),
  };
}

function apiKeySession(apiKeyId: string, partnerId = "acme") {
  return {
    ok: true,
    session: { partnerId, environment: "sandbox", apiKeyId, authKind: "api_key" as const },
  };
}

describe("auditor credential binding invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sovereignPgFlag.mockReturnValue(true);
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential.mockResolvedValue({
      ok: true,
      disposition: "active",
    });
  });

  it("documents legacy prefix helper without requiring it for registry parse", () => {
    expect(assertIndividualAuditorCredentialSessionKey("auditor_disclosure:label")).toBe(true);
    expect(assertIndividualAuditorCredentialSessionKey(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY)).toEqual({
      ok: false,
      reason: "institutional_auditor_credential_not_individual",
    });
  });

  it("parseAuditorAccessRegistry accepts UUID partner_api_keys.id session bindings", () => {
    expect(parseAuditorAccessRegistry(registryEnv())).toHaveLength(1);
  });

  it("rejects malformed non-UUID session key ids before registry authorize", async () => {
    requireSessionMock.mockResolvedValue(apiKeySession("key-institutional-operator"));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.reason).toBe("institutional_auditor_session_key_malformed");
    }
    expect(launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential).not.toHaveBeenCalled();
  });

  it("fails closed when sovereign credential store is unavailable", async () => {
    sovereignPgFlag.mockReturnValue(false);
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_status_unavailable");
  });

  it("rejects missing authoritative API key records", async () => {
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential.mockResolvedValue({
      ok: false,
      disposition: "missing",
    });
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_missing");
  });

  it("rejects revoked API keys (stale console session loses auditor auth)", async () => {
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential.mockResolvedValue({
      ok: false,
      disposition: "revoked",
    });
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_revoked");
  });

  it("rejects partner mismatch from authoritative key record", async () => {
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential.mockResolvedValue({
      ok: false,
      disposition: "partner_mismatch",
    });
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_partner_mismatch");
  });

  it("rejects DB errors from authoritative lookup", async () => {
    launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential.mockResolvedValue({
      ok: false,
      disposition: "unavailable",
    });
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_status_unavailable");
  });

  it("rejects native account partner console sessions", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", accountId: "owner-1", authKind: "account" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_account_session_not_permitted");
  });

  it("denies shared operator API key without auditor registry row", async () => {
    requireSessionMock.mockResolvedValue(
      apiKeySession("b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3"),
    );
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_not_authorized");
  });

  it("permits active UUID api key with registry row and authoritative active disposition", async () => {
    requireSessionMock.mockResolvedValue(apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY));
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(true);
    expect(launchpadPgMock.pgResolvePartnerApiKeyForAuditorCredential).toHaveBeenCalledWith({
      keyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
      expectedPartnerId: "acme",
    });
    if (resolved.ok) {
      expect(resolved.principal.auditor_credential_id).toBe(CONTROLLED_AUDITOR_ID);
      expect(resolved.principal.session_key_id).toBe(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY);
    }
  });

  it("denies cross-tenant registry mismatch (wrong partner in registry only)", async () => {
    requireSessionMock.mockResolvedValue(
      apiKeySession(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY, "other-partner"),
    );
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_not_authorized");
  });
});