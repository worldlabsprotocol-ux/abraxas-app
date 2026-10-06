import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import { createPostgresSemanticsContinuationStore } from "@/lib/partner/partnerFlowContinuationStore.postgresSemantics";
import {
  createHostedHandoff,
  putHandoffForTests,
  resetHostedHandoffsForTests,
} from "./store";
import { resolveHostedHandoffForContinue } from "./resolveForContinue";

const OPAQUE = "vr_a1b2c3d4e5f678901";

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

let semanticsStore = createPostgresSemanticsContinuationStore();

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => semanticsStore,
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => app),
}));

beforeEach(() => {
  resetHostedHandoffsForTests();
  semanticsStore = createPostgresSemanticsContinuationStore();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveHostedHandoffForContinue atomic guard semantics (#565)", () => {
  it("rejects expired handoff before continuation ensure", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: OPAQUE,
      expires_at: "2000-01-01T00:00:00.000Z",
    });

    const resolved = await resolveHostedHandoffForContinue(OPAQUE);
    expect(resolved).toEqual({ ok: false, code: "expired" });
    expect(semanticsStore.rowCount()).toBe(0);
  });

  it("rejects consumed continuation returned by atomic ensure", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const first = await resolveHostedHandoffForContinue(OPAQUE);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    await semanticsStore.consume(first.continuation.jti);
    const second = await resolveHostedHandoffForContinue(OPAQUE);
    expect(second).toEqual({ ok: false, code: "unavailable" });
  });

  it("rejects binding mismatch on reused continuation", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const first = await resolveHostedHandoffForContinue(OPAQUE);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const row = semanticsStore.rows()[0];
    if (!row) throw new Error("missing row");
    await semanticsStore.save({
      ...row,
      returnUrl: "https://evil.example/steal",
    });

    const second = await resolveHostedHandoffForContinue(OPAQUE);
    expect(second).toEqual({ ok: false, code: "unavailable" });
  });

  it("normalizes whitespace on opaque verify_request via ensure path", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: OPAQUE });

    const padded = `  ${OPAQUE}  `;
    const first = await resolveHostedHandoffForContinue(padded);
    const second = await resolveHostedHandoffForContinue(OPAQUE);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.continuation.jti).toBe(second.continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
  });
});
