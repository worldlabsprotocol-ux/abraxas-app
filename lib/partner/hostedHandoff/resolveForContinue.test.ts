import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import type { PartnerFlowContinuationRecord } from "@/lib/partner/partnerFlowContinuation";
import {
  createHostedHandoff,
  loadHandoffByVerifyRequest,
  putHandoffForTests,
  resetHostedHandoffsForTests,
} from "./store";
import { resolveHostedHandoffForContinue, resolveHandoffCallbackUrl } from "./resolveForContinue";

const app: LaunchpadApplicationRow = {
  id: "11111111-1111-1111-1111-111111111111",
  public_slug: "acme-retail",
  partner_id: "acme",
  application_name: "Acme retail",
  display_name: "Acme",
  environment: "sandbox",
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  policy_template_id: "age_21_retail",
  allowed_return_urls: ["http://localhost:3000/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

const stored: PartnerFlowStoredConfig = {
  purpose: "Confirm adult retail eligibility",
  action: "retail_access",
  callback_url: "http://localhost:3000/callback",
  capabilities: [],
  display_label: "Acme",
};

const ensuredRecords = new Map<string, PartnerFlowContinuationRecord>();
const ensureByOpaqueVerifyRequest = vi.fn(async (record: PartnerFlowContinuationRecord) => {
  const key = record.verifyRequestId ?? "";
  const existing = ensuredRecords.get(key);
  if (existing) return { record: existing, wasCreated: false };
  ensuredRecords.set(key, record);
  return { record, wasCreated: true };
});

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    ensureByOpaqueVerifyRequest,
    peekByVerifyRequestId: vi.fn(),
    save: vi.fn(),
    peek: vi.fn(),
    consume: vi.fn(),
    attachVerifyRequestId: vi.fn(),
  }),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => app),
}));

beforeEach(() => {
  ensuredRecords.clear();
  ensureByOpaqueVerifyRequest.mockClear();
});

afterEach(() => {
  resetHostedHandoffsForTests();
  vi.clearAllMocks();
});

const PRODUCTION_OPAQUE = "vr_81cfe12715d8c338";

describe("resolveHostedHandoffForContinue", () => {
  it("resolves a freshly created handoff by verify_request", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const resolved = await resolveHostedHandoffForContinue(created.verify_request);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.preview.partner_id).toBe("acme");
    expect(resolved.preview.policy_id).toBe(app.policy_id);
    expect(resolved.preview.return_url).toBe("http://localhost:3000/callback");
    expect(resolved.continuation.verifyRequestId).toBe(created.verify_request);
    expect(ensureByOpaqueVerifyRequest).toHaveBeenCalled();
  });

  it("persists continuation for production-shaped opaque vr_* without consuming handoff", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: PRODUCTION_OPAQUE });

    const first = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const handoff = await loadHandoffByVerifyRequest(PRODUCTION_OPAQUE);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(handoff?.status).toBe("created");
    expect(handoff?.consumed_at).toBeNull();
    expect(ensureByOpaqueVerifyRequest).toHaveBeenCalledWith(expect.objectContaining({
      verifyRequestId: PRODUCTION_OPAQUE,
      partnerId: "acme",
      policyId: app.policy_id,
      returnUrl: "http://localhost:3000/callback",
    }), expect.any(Object));
  });

  it("resolves from durable lookup after clearing process memory", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    resetHostedHandoffsForTests();
    putHandoffForTests(created);
    const resolved = await resolveHostedHandoffForContinue(created.verify_request);
    expect(resolved.ok).toBe(true);
  });

  it("returns missing for unknown verify_request", async () => {
    const resolved = await resolveHostedHandoffForContinue("vr_unknown00000000");
    expect(resolved).toEqual({ ok: false, code: "missing" });
  });

  it("returns expired after TTL", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      expires_at: "2000-01-01T00:00:00.000Z",
      status: "created",
    });
    const resolved = await resolveHostedHandoffForContinue(created.verify_request);
    expect(resolved).toEqual({ ok: false, code: "expired" });
  });

  it("does not treat open/review resolve as consumption", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const first = await resolveHostedHandoffForContinue(created.verify_request);
    const second = await loadHandoffByVerifyRequest(created.verify_request);
    expect(first.ok).toBe(true);
    expect(second?.status).toBe("created");
    expect(second?.consumed_at).toBeNull();
  });

  it("reuses an existing continuation on refresh-equivalent resolve", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const continuation = {
      jti: "jti-1",
      partnerId: "acme",
      policyId: app.policy_id!,
      returnUrl: "http://localhost:3000/callback",
      purpose: stored.purpose,
      createdAt: new Date().toISOString(),
      expiresAt: created.expires_at,
      verifyRequestId: created.verify_request,
    };
    ensuredRecords.set(created.verify_request, continuation);
    const resolved = await resolveHostedHandoffForContinue(created.verify_request);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.continuation.jti).toBe("jti-1");
  });

  it("returns existing continuation from atomic ensure without save recovery", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const winner = {
      jti: "jti-winner",
      partnerId: "acme",
      policyId: app.policy_id!,
      returnUrl: "http://localhost:3000/callback",
      purpose: stored.purpose,
      createdAt: new Date().toISOString(),
      expiresAt: created.expires_at,
      verifyRequestId: created.verify_request,
    };
    ensuredRecords.set(created.verify_request, winner);

    const resolved = await resolveHostedHandoffForContinue(created.verify_request);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.continuation.jti).toBe("jti-winner");
  });
});

describe("resolveHandoffCallbackUrl", () => {
  it("matches callback_ref to the registered allowlisted URL only", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    expect(resolveHandoffCallbackUrl(app.allowed_return_urls ?? [], created.callback_ref))
      .toBe("http://localhost:3000/callback");
    expect(resolveHandoffCallbackUrl(["https://evil.example/steal"], created.callback_ref)).toBeNull();
  });
});
