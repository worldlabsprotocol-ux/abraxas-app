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

describe("auditor credential binding invariants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects shared institutional operator session keys (native account)", () => {
    expect(assertIndividualAuditorCredentialSessionKey("native_account:owner-1")).toEqual({
      ok: false,
      reason: "institutional_auditor_credential_not_individual",
    });
  });

  it("accepts individually provisioned auditor credential session keys", () => {
    expect(assertIndividualAuditorCredentialSessionKey(CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY)).toBe(true);
  });

  it("drops registry rows that bind generic operator keys", () => {
    const env = {
      ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY: JSON.stringify([
        {
          credential_class: INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
          partner_id: "acme",
          session_key_id: "key-institutional-operator",
          auditor_credential_id: CONTROLLED_AUDITOR_ID,
          audience_hash: "audience_hash_demo_968",
          allowed_purposes: ["regulatory_examination"],
        },
      ]),
    };
    expect(parseAuditorAccessRegistry(env)).toEqual([]);
  });

  it("resolveInstitutionalAuditorPrincipal fails closed for partner operator session without auditor credential", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", apiKeyId: "key-institutional-operator" },
    });
    const resolved = await resolveInstitutionalAuditorPrincipal(
      new NextRequest("http://localhost/api/institutional/auditor-disclosure"),
      registryEnv(),
    );
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.reason).toBe("institutional_auditor_credential_not_individual");
  });

  it("resolveInstitutionalAuditorPrincipal permits individually registered auditor credential session", async () => {
    requireSessionMock.mockResolvedValue({
      ok: true,
      session: { partnerId: "acme", environment: "sandbox", apiKeyId: CONTROLLED_AUDITOR_CREDENTIAL_SESSION_KEY },
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
});