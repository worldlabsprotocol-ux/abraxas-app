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

const PRODUCTION_OPAQUE = "vr_903c4a1df1fe0893";
const PRODUCTION_EXPIRES = new Date(Date.now() + 45 * 60 * 1000).toISOString().replace("Z", "+00:00").replace("+00:00", "+00");

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
let ensureCalls = 0;

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => ({
    ensureByOpaqueVerifyRequest: async (
      record: Parameters<typeof semanticsStore.ensureByOpaqueVerifyRequest>[0],
      options?: Parameters<typeof semanticsStore.ensureByOpaqueVerifyRequest>[1],
    ) => {
      ensureCalls += 1;
      return semanticsStore.ensureByOpaqueVerifyRequest(record, options);
    },
    save: (record: Parameters<typeof semanticsStore.save>[0]) => semanticsStore.save(record),
    peek: (jti: string) => semanticsStore.peek(jti),
    peekByVerifyRequestId: (verifyRequestId: string) =>
      semanticsStore.peekByVerifyRequestId(verifyRequestId),
    consume: (jti: string) => semanticsStore.consume(jti),
    attachVerifyRequestId: (jti: string, verifyRequestId: string) =>
      semanticsStore.attachVerifyRequestId(jti, verifyRequestId),
  }),
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => app),
}));

beforeEach(() => {
  resetHostedHandoffsForTests();
  semanticsStore = createPostgresSemanticsContinuationStore();
  ensureCalls = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveHostedHandoffForContinue opaque lookup reuse (#561)", () => {
  it("resolve #1/#2/#3 reuse one continuation with zero duplicate inserts after roundtrip", async () => {
    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: PRODUCTION_EXPIRES,
    });

    const first = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const third = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);

    expect(first.ok && second.ok && third.ok).toBe(true);
    if (!first.ok || !second.ok || !third.ok) return;

    expect(first.continuation.jti).toBe(second.continuation.jti);
    expect(second.continuation.jti).toBe(third.continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
    expect(semanticsStore.rows()[0]?.consumedAt).toBeNull();
    expect(semanticsStore.rows()[0]?.verifyRequestId).toBe(PRODUCTION_OPAQUE);
    expect(ensureCalls).toBe(3);
  });
});
