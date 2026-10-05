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

/** PostgREST often returns timestamptz as `T` + `+00` without `:00` — Date.parse is NaN on that shape. */
const POSTGREST_CONTINUATION_EXPIRES = "2026-10-05T12:53:01.053+00";

/** SQL ::text observation from live production continuation row. */
const POSTGRES_TEXT_CONTINUATION_EXPIRES = "2026-10-05 12:53:01.053+00";

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
    expect(Number.isFinite(Date.parse(POSTGREST_CONTINUATION_EXPIRES))).toBe(false);
    expect(parsePartnerFlowInstant(POSTGREST_CONTINUATION_EXPIRES)).not.toBeNull();
    expect(legacyContinuationExpired(POSTGREST_CONTINUATION_EXPIRES)).toBe(true);
    expect(parsePartnerFlowInstant(POSTGREST_CONTINUATION_EXPIRES)! > Date.now()).toBe(true);
  });

  it("reuses continuation when peek returns PostgREST T+00 timestamptz", async () => {
    storeWrapper = wrapWithPostgresReadSerialization(
      semanticsStore,
      (saved) => saved.replace("Z", "+00:00").replace("+00:00", "+00").replace(" ", "T"),
    );

    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: POSTGREST_CONTINUATION_EXPIRES.replace("T", " ").replace("+00", "+00:00"),
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

  it("reuses continuation when peek returns exact production SQL text shape", async () => {
    storeWrapper = wrapWithPostgresReadSerialization(
      semanticsStore,
      () => POSTGRES_TEXT_CONTINUATION_EXPIRES,
    );

    const created = await createHostedHandoff({ application: app, stored, runtime: "universal_https" });
    putHandoffForTests({
      ...created,
      verify_request: PRODUCTION_OPAQUE,
      expires_at: POSTGRES_TEXT_CONTINUATION_EXPIRES,
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
