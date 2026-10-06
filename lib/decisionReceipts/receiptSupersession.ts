// FILE: lib/decisionReceipts/receiptSupersession.ts
// Durable receipt supersession — scoped replacement without mutating signed artifacts.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ReceiptSupersessionScope } from "@/lib/decisionReceipts/currentValidity/contract";

const TABLE = "decision_receipt_supersessions";
const memory = new Map<string, {
  superseded_receipt_id: string;
  superseding_receipt_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  scope: ReceiptSupersessionScope;
  superseded_at: string;
}>();

function skipDurable(): boolean {
  return Boolean(process.env.VITEST);
}

export function resetReceiptSupersessionsForTests(): void {
  memory.clear();
}

export function putReceiptSupersessionForTests(input: {
  supersededReceiptId: string;
  supersedingReceiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  scope?: ReceiptSupersessionScope;
}): void {
  memory.set(input.supersededReceiptId, {
    superseded_receipt_id: input.supersededReceiptId,
    superseding_receipt_id: input.supersedingReceiptId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    scope: input.scope ?? "session_refresh",
    superseded_at: new Date().toISOString(),
  });
}

export async function isReceiptSuperseded(receiptId: string): Promise<{
  superseded: boolean;
  superseding_receipt_id?: string;
  scope?: ReceiptSupersessionScope;
  superseded_at?: string;
}> {
  const cached = memory.get(receiptId);
  if (cached) {
    return {
      superseded: true,
      superseding_receipt_id: cached.superseding_receipt_id,
      scope: cached.scope,
      superseded_at: cached.superseded_at,
    };
  }
  if (skipDurable()) return { superseded: false };
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from(TABLE)
      .select("superseding_receipt_id, scope, superseded_at")
      .eq("superseded_receipt_id", receiptId)
      .maybeSingle();
    if (error || !data) return { superseded: false };
    return {
      superseded: true,
      superseding_receipt_id: String(data.superseding_receipt_id),
      scope: data.scope as ReceiptSupersessionScope,
      superseded_at: String(data.superseded_at),
    };
  } catch {
    throw Object.assign(new Error("validity_store_unavailable"), { code: "validity_store_unavailable" });
  }
}

export async function recordReceiptSupersession(input: {
  supersededReceiptId: string;
  supersedingReceiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  subjectPseudonymId?: string | null;
  launchpadApplicationId?: string | null;
  scope?: ReceiptSupersessionScope;
}): Promise<void> {
  const row = {
    superseded_receipt_id: input.supersededReceiptId,
    superseding_receipt_id: input.supersedingReceiptId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    subject_pseudonym_id: input.subjectPseudonymId ?? null,
    launchpad_application_id: input.launchpadApplicationId ?? null,
    scope: input.scope ?? "session_refresh",
    superseded_at: new Date().toISOString(),
  };
  memory.set(input.supersededReceiptId, {
    superseded_receipt_id: row.superseded_receipt_id,
    superseding_receipt_id: row.superseding_receipt_id,
    partner_id: row.partner_id,
    policy_id: row.policy_id,
    policy_version: row.policy_version,
    scope: row.scope as ReceiptSupersessionScope,
    superseded_at: row.superseded_at,
  });
  if (skipDurable()) return;
  const sb = requireSupabaseAdmin();
  const { error } = await sb.from(TABLE).upsert(row, { onConflict: "superseded_receipt_id" });
  if (error) throw Object.assign(new Error("supersession_store_unavailable"), { code: "supersession_store_unavailable" });
}

export async function recordReceiptSupersessionBestEffort(input: Parameters<typeof recordReceiptSupersession>[0]): Promise<void> {
  try {
    await recordReceiptSupersession(input);
  } catch {
    // Supersession recording must not block issuance.
  }
}
