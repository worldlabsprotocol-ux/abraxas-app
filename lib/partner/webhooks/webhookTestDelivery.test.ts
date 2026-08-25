import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    rpc: (...args: unknown[]) => rpcMock(...args),
  }),
}));

import { enqueuePartnerWebhookTestDelivery } from "@/lib/partner/webhooks/webhookTestDelivery";

const MIGRATION_067_PATH = join(
  process.cwd(),
  "supabase/migrations/067_partner_webhook_test_event_atomic.sql",
);
const MIGRATION_069_PATH = join(
  process.cwd(),
  "supabase/migrations/069_partner_webhook_test_advisory_lock_fix.sql",
);

describe("webhookTestDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("migration 067 static assertions", () => {
    const migrationSql = readFileSync(MIGRATION_067_PATH, "utf8");

    it("extends the outbox event_type check with partner.webhook.test", () => {
      expect(migrationSql).toContain("'partner.webhook.test'");
      expect(migrationSql).toContain("partner_webhook_outbox_event_type_check");
    });

    it("uses SECURITY DEFINER with pg_catalog search_path", () => {
      expect(migrationSql).toContain("SECURITY DEFINER");
      expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    });

    it("uses a transaction-scoped advisory lock inside the RPC", () => {
      expect(migrationSql).toContain("pg_catalog.pg_advisory_xact_lock");
      expect(migrationSql).toContain("partner.webhook.test");
    });

    it("restricts RPC execution to service_role and revokes public roles", () => {
      expect(migrationSql).toContain(
        "REVOKE ALL ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM PUBLIC",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM anon",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM authenticated",
      );
      expect(migrationSql).toContain(
        "GRANT EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text)",
      );
      expect(migrationSql).toContain("TO postgres, service_role");
    });

    it("uses valid EXTRACT(EPOCH FROM ...) syntax for retry_after_sec", () => {
      expect(migrationSql).not.toContain("pg_catalog.extract");
      expect(migrationSql).not.toMatch(/\bextract\s*\(\s*epoch\s+FROM/);
      expect(migrationSql).toMatch(
        /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*v_oldest_recent\s*\+\s*pg_catalog\.make_interval\(secs\s*=>\s*60\)\s*-\s*pg_catalog\.now\(\)\s*\)\s*\)/,
      );
    });
  });

  describe("migration 069 static assertions", () => {
    const migrationSql = readFileSync(MIGRATION_069_PATH, "utf8");

    it("replaces the invalid two-argument advisory lock with one bigint hash", () => {
      expect(migrationSql).toMatch(
        /pg_catalog\.pg_advisory_xact_lock\s*\(\s*pg_catalog\.hashtextextended\s*\(/,
      );
      expect(migrationSql).toContain(
        "pg_catalog.concat(v_partner_id, ':partner.webhook.test')",
      );
      expect(migrationSql).not.toMatch(
        /pg_catalog\.pg_advisory_xact_lock\s*\([^)]*,[^)]*hashtextextended/,
      );
      expect(migrationSql).not.toContain(
        "pg_catalog.hashtextextended('partner.webhook.test', 0)",
      );
    });

    it("preserves SECURITY DEFINER and pg_catalog search_path", () => {
      expect(migrationSql).toContain("SECURITY DEFINER");
      expect(migrationSql).toContain("SET search_path = pg_catalog, public");
    });

    it("revokes PUBLIC, anon, and authenticated and grants EXECUTE to postgres and service_role", () => {
      expect(migrationSql).toContain(
        "REVOKE ALL ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM PUBLIC",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM anon",
      );
      expect(migrationSql).toContain(
        "REVOKE EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text) FROM authenticated",
      );
      expect(migrationSql).toContain(
        "GRANT EXECUTE ON FUNCTION public.enqueue_partner_webhook_test_delivery(text)",
      );
      expect(migrationSql).toContain("TO postgres, service_role");
    });

    it("preserves JSON response contract and atomic rate-limit plus insert behavior", () => {
      expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.enqueue_partner_webhook_test_delivery");
      expect(migrationSql).toContain("'code', 'partner_id_required'");
      expect(migrationSql).toContain("'code', 'partner_not_found'");
      expect(migrationSql).toContain("'code', 'webhook_disabled'");
      expect(migrationSql).toContain("'code', 'rate_limited'");
      expect(migrationSql).toContain("'retry_after_sec'");
      expect(migrationSql).toContain("INSERT INTO public.partner_webhook_outbox");
      expect(migrationSql).toContain("'ok', true");
      expect(migrationSql).toContain("'queued', true");
      expect(migrationSql).toContain("'event_id', v_event_id");
      expect(migrationSql).toContain("'code', 'enqueue_failed'");
      expect(migrationSql).toMatch(
        /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*v_oldest_recent\s*\+\s*pg_catalog\.make_interval\(secs\s*=>\s*60\)\s*-\s*pg_catalog\.now\(\)\s*\)\s*\)/,
      );
    });
  });

  it("calls only the atomic enqueue RPC", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: true, queued: true, event_id: "evt-queued-1" },
      error: null,
    });

    const result = await enqueuePartnerWebhookTestDelivery("partner-a");

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("enqueue_partner_webhook_test_delivery", {
      p_partner_id: "partner-a",
    });
    expect(result).toEqual({ ok: true, queued: true, eventId: "evt-queued-1" });
  });

  it("maps rate_limited without exposing SQL details", async () => {
    rpcMock.mockResolvedValue({
      data: { ok: false, code: "rate_limited", retry_after_sec: 42 },
      error: null,
    });

    const result = await enqueuePartnerWebhookTestDelivery("partner-a");

    expect(result).toEqual({ ok: false, code: "rate_limited", retryAfterSec: 42 });
    expect(JSON.stringify(result)).not.toContain("SQLSTATE");
  });

  it("returns enqueue_unavailable when the RPC call fails", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "relation missing", code: "42P01" },
    });

    const result = await enqueuePartnerWebhookTestDelivery("partner-a");

    expect(result).toEqual({ ok: false, code: "enqueue_unavailable" });
    expect(JSON.stringify(result)).not.toContain("42P01");
  });
});
