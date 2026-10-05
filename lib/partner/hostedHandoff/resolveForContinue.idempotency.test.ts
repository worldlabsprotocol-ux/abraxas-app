import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import { createPostgresSemanticsContinuationStore } from "@/lib/partner/partnerFlowContinuationStore.postgresSemantics";
import {
  createHostedHandoff,
  loadHandoffByVerifyRequest,
  putHandoffForTests,
  resetHostedHandoffsForTests,
} from "./store";
import { resolveHostedHandoffForContinue } from "./resolveForContinue";

const PRODUCTION_OPAQUE = "vr_32c58469099aa6a6";

const app: LaunchpadApplicationRow = {
  id: "8d30e3b1-3409-4bef-8d04-66335f38e96e",
  public_slug: "ref-wc-postrev-proof",
  partner_id: "ref-wc-postrev-5ffe",
  application_name: "Post-Revocation Wallet Control Proof",
  display_name: "Post-Revocation Wallet Control Proof",
  environment: "sandbox",
  policy_id: "ref-wc-postrev-5ffe-wallet_control-v1",
  policy_version: 1,
  policy_template_id: "wallet_control",
  allowed_return_urls: ["https://example.com/callback"],
  api_key_id: "key-1",
  production_api_key_id: null,
  production_key_revealed_at: null,
  status: "active",
  idempotency_key: null,
  created_at: "2026-09-20T00:00:00.000Z",
  updated_at: "2026-09-20T00:00:00.000Z",
};

const stored: PartnerFlowStoredConfig = {
  purpose: "Confirm you control an eligible wallet",
  action: "wallet_bound_action",
  callback_url: "https://example.com/callback",
  capabilities: [],
  display_label: "Post-Revocation Wallet Control Proof",
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

describe("resolveHostedHandoffForContinue idempotency", () => {
  it("returns the same logical continuation across three sequential resolves", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: PRODUCTION_OPAQUE });

    const first = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const third = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const handoff = await loadHandoffByVerifyRequest(PRODUCTION_OPAQUE);

    expect(first.ok && second.ok && third.ok).toBe(true);
    if (!first.ok || !second.ok || !third.ok) return;

    expect(first.continuation.jti).toBe(second.continuation.jti);
    expect(second.continuation.jti).toBe(third.continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
    expect(handoff?.status).toBe("created");
    expect(handoff?.consumed_at).toBeNull();
    expect(first.preview.return_url).toBe("https://example.com/callback");
    expect(second.preview.partner_id).toBe("ref-wc-postrev-5ffe");
    expect(third.preview.policy_id).toBe("ref-wc-postrev-5ffe-wallet_control-v1");
  });

  it("handles concurrent first resolves with one continuation row", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: PRODUCTION_OPAQUE });

    const results = await Promise.all([
      resolveHostedHandoffForContinue(PRODUCTION_OPAQUE),
      resolveHostedHandoffForContinue(PRODUCTION_OPAQUE),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    if (!results[0]?.ok || !results[1]?.ok) return;
    expect(results[0].continuation.jti).toBe(results[1].continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
  });

  it("handles concurrent subsequent resolves after the first row exists", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: PRODUCTION_OPAQUE });

    const initial = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;

    const repeats = await Promise.all(Array.from({ length: 4 }, () =>
      resolveHostedHandoffForContinue(PRODUCTION_OPAQUE)));

    expect(repeats.every((result) => result.ok)).toBe(true);
    for (const result of repeats) {
      if (!result.ok) continue;
      expect(result.continuation.jti).toBe(initial.continuation.jti);
    }
    expect(semanticsStore.rowCount()).toBe(1);
  });

  it("reuses continuation when Postgres returns +00 timestamptz on expires_at", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    const futureExpires = new Date(Date.now() + 45 * 60 * 1000).toISOString().replace("Z", "+00");
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: futureExpires,
    });

    const first = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.continuation.jti).toBe(second.continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
    expect(semanticsStore.rows()[0]?.expiresAt).toMatch(/\+00$|Z$/);
  });

  it("would have failed before idempotency fix when reuse missed unique conflict", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({ ...created, verify_request: PRODUCTION_OPAQUE });

    await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    expect(semanticsStore.rowCount()).toBe(1);

    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    expect(second.ok).toBe(true);
    expect(semanticsStore.rowCount()).toBe(1);
  });
});
