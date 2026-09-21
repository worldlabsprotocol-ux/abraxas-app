import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authenticatePartnerMock = vi.fn();
const getAppMock = vi.fn();
const issueMock = vi.fn();

vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));
vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: (...args: unknown[]) => getAppMock(...args),
}));
vi.mock("@/lib/partner/chainAttestation/issue", () => ({
  issueChainEligibilityAttestation: (...args: unknown[]) => issueMock(...args),
}));

import { POST } from "@/app/api/v1/chain-attestations/route";

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/v1/chain-attestations", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const validBody = {
  receipt_id: "dr_test",
  action_type: "enable_protocol_access",
  action_scope: "sandbox:protocol_access",
  network_id: "evm_sandbox",
  chain_id: 11155111,
  verifying_contract: "0x1111111111111111111111111111111111111111",
  application_id: "app-1",
};

describe("chain attestation issuance route", () => {
  beforeEach(() => {
    authenticatePartnerMock.mockReset();
    getAppMock.mockReset();
    issueMock.mockReset();
  });

  it("rejects missing and invalid partner auth", async () => {
    authenticatePartnerMock.mockResolvedValue(null);
    const unauth = await POST(req(validBody));
    expect(unauth.status).toBe(401);
    authenticatePartnerMock.mockResolvedValue({ ok: false, status: 401, error: "nope" });
    const bad = await POST(req(validBody));
    expect(bad.status).toBe(401);
  });

  it("rejects cross-tenant application ids", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme" } });
    getAppMock.mockResolvedValue(null);
    const res = await POST(req(validBody));
    expect(res.status).toBe(403);
  });

  it("returns attestation_unavailable when the issuer fails closed", async () => {
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme" } });
    getAppMock.mockResolvedValue({
      id: "app-1",
      partner_id: "acme",
      policy_id: "policy-1",
      policy_version: 1,
      environment: "sandbox",
    });
    issueMock.mockResolvedValue({
      ok: false,
      reason: "attestation_unavailable",
      client: {
        allowed: false,
        reason: "attestation_unavailable",
        action_binding: {
          action_type: "enable_protocol_access",
          action_scope: "sandbox:protocol_access",
          nonce_state: "rejected",
          wallet_binding: "not_attached",
        },
        expires_at: null,
        schema_version: 1,
        network_id: "evm_sandbox",
        environment: "sandbox",
      },
    });
    const res = await POST(req(validBody));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.reason).toBe("attestation_unavailable");
    expect(json.private_key).toBeUndefined();
    expect(json.signature).toBeUndefined();
  });
});
