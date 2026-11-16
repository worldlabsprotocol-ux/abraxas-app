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
  pgGetApiKeyRevoked: vi.fn(),
}));
const sovereignPgFlag = vi.hoisted(() => vi.fn(() => false));

vi.mock("@/lib/partner/launchpad/launchpadPersistence", () => ({
  launchpadUsesSovereignPostgres: () => sovereignPgFlag(),
}));

vi.mock("@/lib/partner/launchpad/sovereign/launchpadPgStore", () => ({
  pgGetApiKeyRevoked: (...args: unknown[]) => launchpadPgMock.pgGetApiKeyRevoked(...args),
}));

vi.mock("@/lib/partner/launchpad/partnerConsoleSession", () => ({
  requirePartnerConsoleSession: (...args: unknown[]) => requireSessionMock(...args),
  resolvePartnerConsoleSessionKeyId: (session: { apiKeyId?: string; accountId?: string }) => {
    if (session.apiKeyId) return session.apiKeyId;
    if (session.accountId) return `native_account:${session.accountId}`;
    return null;
  },
}));

function registryEnv(overrides: Record<string, unknown> = {}, extraRow?: Record<string, unknown>) {
  const base = {
    credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
    partner_id: "acme",
    session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
    auditor_credential_id: CONTROLLED_AUDITOR_ID,
    tenant_id: CONTROLLED_TENANT_ID,
    audience_hash: "audience_hash_demo_968",
    allowed_purposes: ["regulatory_examination"],
    ...overrides,
  };
  const rows = extraRow ? [base, extraRow] : [base];
  return {
    ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify(rows),
  };
}

describe("auditor credential binding invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sovereignPgFlag.mockReturnValue(false);
    launchpadPgMock.pgGetApiKeyRevoked.mockResolvedValue(false);
  });

  it("documents legacy prefix helper without requiring it for registry parse", () => {
    expect(assertIndividualAuditorCredentialSessionKey("auditor_disclosure:label")).toBe(true);
    expect(assertIndividualAuditorCredentialSessionKey(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY)).toEqual({
      ok: false,
      reason: "institutional_auditor_credential_not_individual",
    });
  });

  it("parseAuditorAccessRegistry accepts UUID partner_api_keys.id session bindings", () => {
    const env = {
      ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([
        {
          credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
          partner_id: "acme",
          session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
          auditor_credential_id: CONTROLLED_AUDITOR_ID,
          audience_hash: "audience_hash_demo_968",
          allowed_purposes: ["regulatory_examination"],
        },
      ]),
    };
    expect(parseAuditorAccessRegistry(env)).toHaveLength(1);
  });

  it("parseAuditorAccessRegistry drops rows with invalid purposes", () => {
    const env = {
      ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([
        {
          credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
          partner_id: "acme",
          session_key_id: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY,
          auditor_credential_id: CONTROLLED_AUDITOR_ID,
          audience_hash: "audience_hash_demo_968",
          allowed_purposes: ["not_a_real_purpose"],
        },
      ]),
    };
    expect(parseAuditorAccessRegistry(env)).toEqual([]);
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

  it("resolveInstitutionalAuditorPrincipal denies shared operator API key without registry row", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", apiKeyId: "b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3", authKind: "api_key" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_not_authorized");
  });

  it("resolveInstitutionalAuditorPrincipal permits registry-bound UUID api key session", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", apiKeyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY, authKind: "api_key" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.principal.auditor_credential_id).toBe(CONTROLLED_AUDITOR_ID);
      expect(resolved.principal.session_key_id).toBe(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY);
    }
  });

  it("resolveInstitutionalAuditorPrincipal denies cross-tenant registry mismatch (wrong partner)", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "other-partner", environment: "sandbox", apiKeyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY, authKind: "api_key" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_not_authorized");
  });

  it("resolveInstitutionalAuditorPrincipal denies revoked partner API key when sovereign pg is enabled", async () => {
    sovereignPgFlag.mockReturnValue(true);
    launchpadPgMock.pgGetApiKeyRevoked.mockResolvedValue(true);
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", apiKeyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY, authKind: "api_key" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_revoked");
  });
});