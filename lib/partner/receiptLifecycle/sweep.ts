// FILE: lib/partner/receiptLifecycle/sweep.ts
// Operator/server sweep for receipt.expiring. Bounded, idempotent, no live send.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  RECEIPT_LIFECYCLE_EXPIRING_WINDOW_MS,
  RECEIPT_LIFECYCLE_SCHEDULING_POSTURE,
  RECEIPT_LIFECYCLE_SWEEP_LIMIT,
} from "./contract";
import { enqueueReceiptLifecycleEvent } from "./enqueue";

const sweepBuckets = new Map<string, { count: number; resetAt: number }>();

export function resetReceiptLifecycleSweepRateLimitForTests(): void {
  sweepBuckets.clear();
}

export function receiptLifecycleSweepRateLimited(key: string, limit = 4, windowMs = 60_000): boolean {
  const now = Date.now();
  const existing = sweepBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    sweepBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (existing.count >= limit) return true;
  existing.count += 1;
  return false;
}

export async function sweepExpiringReceipts(input?: {
  now?: Date;
  limit?: number;
}): Promise<{
  ok: true;
  scanned: number;
  enqueued: number;
  duplicates: number;
  skipped: number;
  live_send: false;
  scheduling: string;
} | { ok: false; error: string }> {
  const now = input?.now ?? new Date();
  const limit = Math.min(input?.limit ?? RECEIPT_LIFECYCLE_SWEEP_LIMIT, RECEIPT_LIFECYCLE_SWEEP_LIMIT);
  const horizon = new Date(now.getTime() + RECEIPT_LIFECYCLE_EXPIRING_WINDOW_MS).toISOString();
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("decision_receipts")
      .select("id, partner_id, policy_id, policy_version, expires_at, status, revoked_at")
      .eq("status", "active")
      .is("revoked_at", null)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", horizon)
      .limit(limit);
    if (error) return { ok: false, error: "schema_unavailable" };
    const rows = data ?? [];
    let enqueued = 0;
    let duplicates = 0;
    let skipped = 0;
    for (const row of rows) {
      const partnerId = String(row.partner_id ?? "").trim();
      const receiptId = String(row.id ?? "").trim();
      if (!partnerId || !receiptId) {
        skipped += 1;
        continue;
      }
      const result = await enqueueReceiptLifecycleEvent({
        partnerId,
        eventType: "receipt.expiring",
        receiptId,
        policyId: typeof row.policy_id === "string" ? row.policy_id : null,
        policyVersion: typeof row.policy_version === "number" ? row.policy_version : null,
        expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
      });
      if (!result.ok) {
        skipped += 1;
        continue;
      }
      if (result.created) enqueued += 1;
      else duplicates += 1;
    }
    return {
      ok: true,
      scanned: rows.length,
      enqueued,
      duplicates,
      skipped,
      live_send: false,
      scheduling: RECEIPT_LIFECYCLE_SCHEDULING_POSTURE,
    };
  } catch {
    return { ok: false, error: "schema_unavailable" };
  }
}
