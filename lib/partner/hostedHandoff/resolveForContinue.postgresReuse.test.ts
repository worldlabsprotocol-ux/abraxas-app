import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import type { PartnerFlowContinuationRecord, PartnerFlowContinuationStore } from "@/lib/partner/partnerFlowContinuation";
import { createPostgresSemanticsContinuationStore } from "@/lib/partner/partnerFlowContinuationStore.postgresSemantics";
import { parsePartnerFlowInstant } from "@/lib/partner/parsePartnerFlowInstant";
import {
  createHostedHandoff,
  putHandoffForTests,
  resetHostedHandoffsForTests,
} from "./store";
import { resolveHostedHandoffForContinue } from "./resolveForContinue";

const PRODUCTION_OPAQUE = "vr_25f3eb26b6652937";

function futurePostgresExpiryShapes() {
  const iso = new Date(Date.now() + 45 * 60 * 1000).toISOString();
  const postgrest = iso.replace("Z", "+00").replace("+00:00", "+00");
  const postgresText = iso.replace("T", " ").replace("Z", "+00");
  return { postgrest, postgresText };
}

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

function mapRowExpiresAt(value: unknown): string {
  return String(value ?? "");
}

/** Wrap store peek paths with Supabase mapRow String() + optional Postgres read shape. */
function wrapWithPostgresReadSerialization(
  inner: PartnerFlowContinuationStore,
  readShape: (saved: string) => string,
): PartnerFlowContinuationStore {
  const rewrite = (record: PartnerFlowContinuationRecord | null): PartnerFlowContinuationRecord | null => {
    if (!record) return null;
    const serialized = mapRowExpiresAt(record.expiresAt);
    return { ...record, expiresAt: readShape(serialized) };
  };

  return {
    save: (record) => inner.save(record),
    peek: async (jti) => rewrite(await inner.peek(jti)),
    peekByVerifyRequestId: async (verifyRequestId) => rewrite(await inner.peekByVerifyRequestId(verifyRequestId)),
    ensureByOpaqueVerifyRequest: async (record, options) => {
      const result = await inner.ensureByOpaqueVerifyRequest(record, options);
      const rewritten = rewrite(result.record);
      if (!rewritten) throw new Error("ensure rewrite failed");
      return { ...result, record: rewritten };
    },
    consume: async (jti) => rewrite(await inner.consume(jti)),
    attachVerifyRequestId: (jti, verifyRequestId) => inner.attachVerifyRequestId(jti, verifyRequestId),
  };
}

let semanticsStore = createPostgresSemanticsContinuationStore();
let storeWrapper: PartnerFlowContinuationStore = semanticsStore;

vi.mock("@/lib/partner/partnerFlowContinuationStore", () => ({
  createSupabaseContinuationStore: () => storeWrapper,
}));

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication", () => ({
  getLaunchpadApplicationForPartner: vi.fn(async () => app),
}));

beforeEach(() => {
  resetHostedHandoffsForTests();
  semanticsStore = createPostgresSemanticsContinuationStore();
  storeWrapper = semanticsStore;
});

afterEach(() => {
  vi.clearAllMocks();
});

function legacyContinuationExpired(expiresAt: string, now = Date.now()): boolean {
  const expires = Date.parse(expiresAt);
  return !Number.isFinite(expires) || expires <= now;
}

describe("resolveHostedHandoffForContinue postgres continuation reuse", () => {
  it("documents Date.parse failure on PostgREST T+00 shape", () => {
    const { postgrest } = futurePostgresExpiryShapes();
    expect(Number.isFinite(Date.parse(postgrest))).toBe(false);
    expect(parsePartnerFlowInstant(postgrest)).not.toBeNull();
    expect(legacyContinuationExpired(postgrest)).toBe(true);
    expect(parsePartnerFlowInstant(postgrest)! > Date.now()).toBe(true);
  });

  it("reuses continuation when ensure returns PostgREST T+00 timestamptz", async () => {
    const { postgrest } = futurePostgresExpiryShapes();
    storeWrapper = wrapWithPostgresReadSerialization(
      semanticsStore,
      (saved) => saved.replace("Z", "+00:00").replace("+00:00", "+00").replace(" ", "T"),
    );

    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: postgrest.replace("T", " ").replace("+00", "+00:00"),
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
    expect(semanticsStore.rows()[0]?.expiresAt).toMatch(/\+00/);
  });

  it("reuses continuation when ensure returns exact production SQL text shape", async () => {
    const { postgresText } = futurePostgresExpiryShapes();
    storeWrapper = wrapWithPostgresReadSerialization(
      semanticsStore,
      () => postgresText,
    );

    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: postgresText,
    });

    const first = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const second = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);
    const third = await resolveHostedHandoffForContinue(PRODUCTION_OPAQUE);

    expect(first.ok && second.ok && third.ok).toBe(true);
    if (!first.ok || !second.ok || !third.ok) return;

    expect(first.continuation.jti).toBe(second.continuation.jti);
    expect(second.continuation.jti).toBe(third.continuation.jti);
    expect(semanticsStore.rowCount()).toBe(1);
  });
});
