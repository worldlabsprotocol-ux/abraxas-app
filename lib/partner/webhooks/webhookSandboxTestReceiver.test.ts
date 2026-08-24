import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPartnerWebhookTestPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import { signWebhookBody } from "@/lib/partner/webhooks/webhookSigning";

const fromMock = vi.hoisted(() => vi.fn());
const rpcMock = vi.hoisted(() => vi.fn());
const partnersMaybeSingleMock = vi.hoisted(() => vi.fn());
const receiptsLookupMaybeSingleMock = vi.hoisted(() => vi.fn());
const receiptsListResolvedMock = vi.hoisted(() => vi.fn());
const loadSecretMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  })),
}));

vi.mock("@/lib/partner/webhooks/webhookConfigService", () => ({
  loadPartnerWebhookSigningSecret: (...args: unknown[]) => loadSecretMock(...args),
}));

import {
  SANDBOX_TEST_RECEIPT_INSERT_RPC,
  SANDBOX_TEST_RECEIPTS_TABLE,
  isSandboxTestReceiverEnabled,
  listSandboxTestReceiptsForPartner,
  parseSandboxTestWebhookPayload,
  partnerIsSandboxOnly,
  persistVerifiedSandboxTestReceipt,
  receiveSandboxTestWebhook,
} from "@/lib/partner/webhooks/webhookSandboxTestReceiver";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/068_partner_webhook_sandbox_test_receiver.sql",
);
const RECEIVER_SOURCE_PATH = join(
  process.cwd(),
  "lib/partner/webhooks/webhookSandboxTestReceiver.ts",
);

const SECRET = "abx_whsec_test_secret_value_123";
const NOW_SEC = 1_700_000_000;

function buildSignedRequest(input?: {
  eventId?: string;
  partnerId?: string;
  headerEventId?: string;
  occurredAt?: string;
}): {
  rawBody: string;
  headerEventId: string;
  headerTimestamp: string;
  headerSignature: string;
} {
  const payload = buildPartnerWebhookTestPayload({
    eventId: input?.eventId ?? "evt-test-1",
    occurredAt: input?.occurredAt ?? "2026-08-08T00:00:00.000Z",
    partnerId: input?.partnerId ?? "partner-sandbox",
  });
  const rawBody = JSON.stringify(payload);
  const headerTimestamp = String(NOW_SEC);
  const headerSignature = signWebhookBody({
    secret: SECRET,
    timestamp: headerTimestamp,
    rawBody,
  });

  return {
    rawBody,
    headerEventId: input?.headerEventId ?? payload.event_id,
    headerTimestamp,
    headerSignature,
  };
}

function stubSupabaseChains(): void {
  const receiptsChain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: receiptsLookupMaybeSingleMock,
  };
  receiptsChain.select.mockReturnValue(receiptsChain);
  receiptsChain.eq.mockReturnValue(receiptsChain);
  receiptsChain.order.mockReturnValue(receiptsChain);
  receiptsChain.limit.mockImplementation(receiptsListResolvedMock);

  const partnersChain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: partnersMaybeSingleMock,
  };
  partnersChain.select.mockReturnValue(partnersChain);
  partnersChain.eq.mockReturnValue(partnersChain);

  fromMock.mockImplementation((table: string) => {
    if (table === SANDBOX_TEST_RECEIPTS_TABLE) return receiptsChain;
    if (table === "partners") return partnersChain;
    throw new Error(`unexpected table ${table}`);
  });
}

describe("webhookSandboxTestReceiver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://placeholder.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
    stubSupabaseChains();
    partnersMaybeSingleMock.mockResolvedValue({
      data: { allowed_environments: ["sandbox"] },
      error: null,
    });
    loadSecretMock.mockResolvedValue(SECRET);
    rpcMock.mockResolvedValue({
      data: [{ partner_id: "partner-sandbox" }],
      error: null,
    });
    receiptsLookupMaybeSingleMock.mockResolvedValue({
      data: { partner_id: "partner-sandbox" },
      error: null,
    });
    receiptsListResolvedMock.mockResolvedValue({
      data: [
        {
          event_id: "evt-test-1",
          partner_id: "partner-sandbox",
          event_type: "partner.webhook.test",
          received_at: "2026-08-08T00:00:05.000Z",
        },
      ],
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("migration 068 static assertions", () => {
    const migrationSql = readFileSync(MIGRATION_PATH, "utf8");

    it("creates verified-only receipts with event_id uniqueness and event_type check", () => {
      expect(migrationSql).toContain("partner_webhook_sandbox_test_receipts");
      expect(migrationSql).toContain("event_id     text        NOT NULL UNIQUE");
      expect(migrationSql).toContain("CHECK (event_type = 'partner.webhook.test')");
    });

    it("enables RLS and revokes PUBLIC, anon, and authenticated", () => {
      expect(migrationSql).toContain("ENABLE ROW LEVEL SECURITY");
      expect(migrationSql).toContain("REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM PUBLIC");
      expect(migrationSql).toContain("REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM anon");
      expect(migrationSql).toContain("REVOKE ALL ON TABLE public.partner_webhook_sandbox_test_receipts FROM authenticated");
    });

    it("grants only SELECT and INSERT to service_role", () => {
      expect(migrationSql).toContain(
        "GRANT SELECT, INSERT ON TABLE public.partner_webhook_sandbox_test_receipts TO service_role",
      );
      expect(migrationSql).not.toContain("GRANT UPDATE");
      expect(migrationSql).not.toContain("GRANT DELETE");
    });

    it("uses INSERT ON CONFLICT DO NOTHING RETURNING partner_id in the atomic RPC", () => {
      expect(migrationSql).toContain("insert_partner_webhook_sandbox_test_receipt");
      expect(migrationSql).toContain("INSERT INTO public.partner_webhook_sandbox_test_receipts");
      expect(migrationSql).toContain("ON CONFLICT (event_id) DO NOTHING");
      expect(migrationSql).toContain("RETURNING public.partner_webhook_sandbox_test_receipts.partner_id");
    });

    it("locks the insert RPC down with SECURITY DEFINER and pg_catalog search_path", () => {
      expect(migrationSql).toContain("SECURITY DEFINER");
      expect(migrationSql).toContain("SET search_path = pg_catalog, public");
      expect(migrationSql).toContain("LANGUAGE plpgsql");
      expect(migrationSql).toContain("EXCEPTION");
      expect(migrationSql).toContain("WHEN OTHERS THEN");
    });

    it("revokes RPC access from PUBLIC, anon, and authenticated", () => {
      expect(migrationSql).toContain(
        "REVOKE ALL ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM PUBLIC",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM anon",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text) FROM authenticated",
      );
    });

    it("grants RPC EXECUTE only to postgres and service_role", () => {
      expect(migrationSql).toContain(
        "GRANT EXECUTE ON FUNCTION public.insert_partner_webhook_sandbox_test_receipt(text, text)",
      );
      expect(migrationSql).toContain("TO postgres, service_role");
      expect(migrationSql).not.toMatch(
        /GRANT EXECUTE ON FUNCTION public\.insert_partner_webhook_sandbox_test_receipt\(text, text\)[\s\S]*TO[\s\S]*\banon\b/,
      );
      expect(migrationSql).not.toMatch(
        /GRANT EXECUTE ON FUNCTION public\.insert_partner_webhook_sandbox_test_receipt\(text, text\)[\s\S]*TO[\s\S]*\bauthenticated\b/,
      );
    });
  });

  it("does not branch on PostgreSQL duplicate-key error codes in receiver logic", () => {
    const source = readFileSync(RECEIVER_SOURCE_PATH, "utf8");
    expect(source).toContain(SANDBOX_TEST_RECEIPT_INSERT_RPC);
    expect(source).not.toContain("23505");
    expect(source).not.toMatch(/SQLSTATE/i);
  });

  it("gates receiver enablement on PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED=true", () => {
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "true");
    expect(isSandboxTestReceiverEnabled()).toBe(true);
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "false");
    expect(isSandboxTestReceiverEnabled()).toBe(false);
  });

  it("accepts sandbox-only partners and rejects production-capable partners", () => {
    expect(partnerIsSandboxOnly(["sandbox"])).toBe(true);
    expect(partnerIsSandboxOnly(["sandbox", "production"])).toBe(false);
    expect(partnerIsSandboxOnly(["production"])).toBe(false);
  });

  it("parses valid test payloads and rejects malformed JSON or contracts", () => {
    const valid = buildPartnerWebhookTestPayload({
      eventId: "evt-1",
      occurredAt: "2026-08-08T00:00:00.000Z",
      partnerId: "partner-sandbox",
    });
    expect(parseSandboxTestWebhookPayload(JSON.stringify(valid))?.event_id).toBe("evt-1");
    expect(parseSandboxTestWebhookPayload("{")).toBeNull();
    expect(parseSandboxTestWebhookPayload(JSON.stringify({ ...valid, event_type: "partner.receipt.issued" }))).toBeNull();
    expect(parseSandboxTestWebhookPayload(JSON.stringify({ ...valid, test: false }))).toBeNull();
  });

  it("persists a new verified receipt via the conflict-safe insert RPC", async () => {
    const result = await persistVerifiedSandboxTestReceipt({
      eventId: "evt-test-1",
      partnerId: "partner-sandbox",
    });

    expect(result).toEqual({ ok: true, idempotent: false });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith(SANDBOX_TEST_RECEIPT_INSERT_RPC, {
      p_event_id: "evt-test-1",
      p_partner_id: "partner-sandbox",
    });
    expect(receiptsLookupMaybeSingleMock).not.toHaveBeenCalled();
  });

  it("returns idempotent success when the conflict-safe insert returns no row and lookup matches", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const result = await persistVerifiedSandboxTestReceipt({
      eventId: "evt-test-1",
      partnerId: "partner-sandbox",
    });

    expect(result).toEqual({ ok: true, idempotent: true });
    expect(receiptsLookupMaybeSingleMock).toHaveBeenCalledTimes(1);
  });

  it("rejects cross-partner event_id reuse without disclosing the other partner", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    receiptsLookupMaybeSingleMock.mockResolvedValue({
      data: { partner_id: "partner-other" },
      error: null,
    });

    const result = await persistVerifiedSandboxTestReceipt({
      eventId: "evt-test-1",
      partnerId: "partner-sandbox",
    });

    expect(result).toEqual({ ok: false });
  });

  it("receives a verified sandbox test webhook and never exposes secrets in the result shape", async () => {
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "true");
    const signed = buildSignedRequest();

    const result = await receiveSandboxTestWebhook({
      ...signed,
      nowSec: NOW_SEC,
    });

    expect(result).toEqual({
      ok: true,
      received: true,
      idempotent: false,
      eventId: "evt-test-1",
      partnerId: "partner-sandbox",
    });
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(JSON.stringify(result)).not.toContain("whsec");
    expect(JSON.stringify(result)).not.toContain("endpoint");
  });

  it("returns 404 when receiver is disabled", async () => {
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "false");
    const signed = buildSignedRequest();

    const result = await receiveSandboxTestWebhook({
      ...signed,
      nowSec: NOW_SEC,
    });

    expect(result).toEqual({ ok: false, status: 404 });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects missing headers, stale timestamps, bad signatures, and header/payload mismatch", async () => {
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "true");
    const signed = buildSignedRequest();

    expect(await receiveSandboxTestWebhook({
      rawBody: signed.rawBody,
      headerEventId: null,
      headerTimestamp: signed.headerTimestamp,
      headerSignature: signed.headerSignature,
      nowSec: NOW_SEC,
    })).toEqual({ ok: false, status: 400 });

    expect(await receiveSandboxTestWebhook({
      ...signed,
      headerTimestamp: String(NOW_SEC - 10_000),
      nowSec: NOW_SEC,
    })).toEqual({ ok: false, status: 400 });

    expect(await receiveSandboxTestWebhook({
      ...signed,
      headerSignature: "v1=deadbeef",
      nowSec: NOW_SEC,
    })).toEqual({ ok: false, status: 400 });

    expect(await receiveSandboxTestWebhook({
      ...buildSignedRequest({ headerEventId: "evt-mismatch" }),
      nowSec: NOW_SEC,
    })).toEqual({ ok: false, status: 400 });
  });

  it("rejects non-sandbox partners and missing signing secrets without persisting rows", async () => {
    vi.stubEnv("PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED", "true");
    const signed = buildSignedRequest();

    partnersMaybeSingleMock.mockResolvedValueOnce({
      data: { allowed_environments: ["sandbox", "production"] },
      error: null,
    });
    expect(await receiveSandboxTestWebhook({ ...signed, nowSec: NOW_SEC })).toEqual({
      ok: false,
      status: 400,
    });

    loadSecretMock.mockResolvedValueOnce(null);
    expect(await receiveSandboxTestWebhook({ ...signed, nowSec: NOW_SEC })).toEqual({
      ok: false,
      status: 400,
    });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("lists partner-scoped receipt metadata without payloads or secrets", async () => {
    const rows = await listSandboxTestReceiptsForPartner("partner-sandbox");

    expect(rows).toEqual([
      {
        event_id: "evt-test-1",
        partner_id: "partner-sandbox",
        event_type: "partner.webhook.test",
        received_at: "2026-08-08T00:00:05.000Z",
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain("payload");
    expect(JSON.stringify(rows)).not.toContain("secret");
  });
});
