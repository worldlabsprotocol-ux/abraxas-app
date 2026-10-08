import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => vi.fn());
const application = vi.hoisted(() => vi.fn());
const adopt = vi.hoisted(() => vi.fn());
const schema = vi.hoisted(() => vi.fn());

vi.mock("@/lib/partner/launchpad/apiHelpers", () => ({
  enforceLaunchpadRateLimit: vi.fn(async () => null),
  requireLaunchpadSession: session,
  launchpadError: (code: string, status: number, error?: string) => Response.json({ ok: false, code, error }, { status }),
  launchpadJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({ getLaunchpadApplicationForPartner: application }));
vi.mock("@/lib/policy/changeControl", () => ({ adoptPolicyVersionForApplication: adopt }));
vi.mock("@/lib/policy/changeControl/schemaReady", () => ({
  assertPolicyChangeControlSchemaReady: schema,
  probePolicyChangeControlSchema: vi.fn(),
  isPolicySchemaMissingError: vi.fn(() => false),
  policySchemaUnavailableResult: vi.fn(),
  POLICY_SCHEMA_UNAVAILABLE_HTTP_STATUS: 503,
}));

import { POST } from "./route";

const appId = "690d0c89-7b98-4946-8ad2-7469f5ca89d9";
const request = (body: unknown) => new NextRequest(`http://localhost/api/launchpad/applications/${appId}/policies`, {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});
const context = { params: Promise.resolve({ id: appId }) };

describe("authenticated policy adoption route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.mockResolvedValue({ ok: true, session: { partnerId: "good-trouble" } });
    application.mockResolvedValue({ id: appId, partner_id: "good-trouble", policy_id: "good-trouble-age_21_retail-v1", policy_version: 1 });
    schema.mockResolvedValue(undefined);
  });

  it("rejects an unauthenticated request before application lookup or adoption", async () => {
    session.mockResolvedValue({ ok: false, response: Response.json({ code: "launchpad_unauthorized" }, { status: 401 }) });
    const res = await POST(request({ action: "adopt", version: 2, expected_version: 1 }), context);
    expect(res.status).toBe(401);
    expect(application).not.toHaveBeenCalled();
    expect(adopt).not.toHaveBeenCalled();
  });

  it("rejects a different tenant even if the UI is rendered", async () => {
    application.mockResolvedValue(null);
    const res = await POST(request({ action: "adopt", version: 2, expected_version: 1 }), context);
    expect(application).toHaveBeenCalledWith(appId, "good-trouble");
    expect(res.status).toBe(404);
    expect(adopt).not.toHaveBeenCalled();
  });

  it("rejects a stale browser pin before the atomic RPC", async () => {
    application.mockResolvedValue({ id: appId, partner_id: "good-trouble", policy_version: 2 });
    const res = await POST(request({ action: "adopt", version: 2, expected_version: 1 }), context);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("policy_version_mismatched");
    expect(adopt).not.toHaveBeenCalled();
  });

  it("passes the tenant-scoped application and target version to atomic adoption", async () => {
    adopt.mockResolvedValue({ application: { id: appId, policy_version: 2 }, from_version: 1, to_version: 2, idempotent_replay: false });
    const res = await POST(request({ action: "adopt", version: 2, expected_version: 1 }), context);
    expect(res.status).toBe(200);
    expect(adopt).toHaveBeenCalledWith({
      application: expect.objectContaining({ id: appId, partner_id: "good-trouble", policy_version: 1 }),
      toVersion: 2, actorId: "good-trouble",
    });
  });
});

