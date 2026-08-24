// FILE: lib/partner/webhooks/webhookSandboxTestReceiver.ts
// First-party verified-only inbound receipts for sandbox partner.webhook.test events.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadPartnerWebhookSigningSecret } from "@/lib/partner/webhooks/webhookConfigService";
import { webhookTestPayloadIsValid } from "@/lib/partner/webhooks/webhookPayloadContract";
import {
  verifyWebhookSignature,
  WEBHOOK_EVENT_ID_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
} from "@/lib/partner/webhooks/webhookSigning";
import {
  PARTNER_WEBHOOK_TEST_EVENT_TYPE,
  type PartnerWebhookTestPayload,
} from "@/lib/partner/webhooks/types";

export const SANDBOX_TEST_RECEIPTS_TABLE = "partner_webhook_sandbox_test_receipts";
export const SANDBOX_TEST_RECEIPT_INSERT_RPC = "insert_partner_webhook_sandbox_test_receipt";
export const SANDBOX_RECEIVER_GENERIC_ERROR = "Invalid request";

export interface SandboxTestReceiptRow {
  event_id: string;
  partner_id: string;
  event_type: typeof PARTNER_WEBHOOK_TEST_EVENT_TYPE;
  received_at: string;
}

export interface ReceiveSandboxTestWebhookInput {
  rawBody: string;
  headerEventId: string | null;
  headerTimestamp: string | null;
  headerSignature: string | null;
  nowSec?: number;
}

export type ReceiveSandboxTestWebhookResult =
  | { ok: true; received: true; idempotent: boolean; eventId: string; partnerId: string }
  | { ok: false; status: 400 | 404 | 503 };

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function isSandboxTestReceiverEnabled(): boolean {
  return process.env.PARTNER_WEBHOOK_SANDBOX_RECEIVER_ENABLED?.trim() === "true";
}

export function partnerIsSandboxOnly(allowedEnvironments: readonly string[]): boolean {
  return allowedEnvironments.includes("sandbox") && !allowedEnvironments.includes("production");
}

export function parseSandboxTestWebhookPayload(
  rawBody: string,
): PartnerWebhookTestPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as Partial<PartnerWebhookTestPayload>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.event_id !== "string" || !parsed.event_id.trim()) return null;
    if (typeof parsed.partner_id !== "string" || !parsed.partner_id.trim()) return null;
    if (parsed.event_type !== PARTNER_WEBHOOK_TEST_EVENT_TYPE) return null;
    if (!webhookTestPayloadIsValid(parsed as PartnerWebhookTestPayload)) return null;
    return parsed as PartnerWebhookTestPayload;
  } catch {
    return null;
  }
}

export async function loadSandboxOnlyPartner(
  partnerId: string,
): Promise<{ ok: true } | { ok: false }> {
  const client = sb();
  if (!client) return { ok: false };

  const { data, error } = await client
    .from("partners")
    .select("allowed_environments")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (error || !data) return { ok: false };
  const allowed = (data.allowed_environments ?? []) as string[];
  if (!partnerIsSandboxOnly(allowed)) return { ok: false };
  return { ok: true };
}

export async function persistVerifiedSandboxTestReceipt(input: {
  eventId: string;
  partnerId: string;
}): Promise<
  | { ok: true; idempotent: boolean }
  | { ok: false }
> {
  const client = sb();
  if (!client) return { ok: false };

  const { data: insertedRows, error: insertError } = await client.rpc(
    SANDBOX_TEST_RECEIPT_INSERT_RPC,
    {
      p_event_id: input.eventId,
      p_partner_id: input.partnerId,
    },
  );

  if (insertError) {
    return { ok: false };
  }

  const insertedPartnerId = Array.isArray(insertedRows) && insertedRows.length > 0
    ? String((insertedRows[0] as { partner_id: string }).partner_id)
    : null;

  if (insertedPartnerId === input.partnerId) {
    return { ok: true, idempotent: false };
  }

  const { data: existing, error: lookupError } = await client
    .from(SANDBOX_TEST_RECEIPTS_TABLE)
    .select("partner_id")
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (lookupError || !existing?.partner_id) {
    return { ok: false };
  }

  if (existing.partner_id === input.partnerId) {
    return { ok: true, idempotent: true };
  }

  return { ok: false };
}

export async function receiveSandboxTestWebhook(
  input: ReceiveSandboxTestWebhookInput,
): Promise<ReceiveSandboxTestWebhookResult> {
  if (!isSandboxTestReceiverEnabled()) {
    return { ok: false, status: 404 };
  }

  if (!input.headerEventId?.trim() || !input.headerTimestamp?.trim() || !input.headerSignature?.trim()) {
    return { ok: false, status: 400 };
  }

  const payload = parseSandboxTestWebhookPayload(input.rawBody);
  if (!payload) {
    return { ok: false, status: 400 };
  }

  if (input.headerEventId.trim() !== payload.event_id) {
    return { ok: false, status: 400 };
  }

  const partnerCheck = await loadSandboxOnlyPartner(payload.partner_id);
  if (!partnerCheck.ok) {
    return { ok: false, status: 400 };
  }

  const signingSecret = await loadPartnerWebhookSigningSecret(payload.partner_id);
  if (!signingSecret) {
    return { ok: false, status: 400 };
  }

  const signatureCheck = verifyWebhookSignature({
    secret: signingSecret,
    timestamp: input.headerTimestamp.trim(),
    rawBody: input.rawBody,
    signatureHeader: input.headerSignature.trim(),
    nowSec: input.nowSec,
  });

  if (!signatureCheck.ok) {
    return { ok: false, status: 400 };
  }

  const persisted = await persistVerifiedSandboxTestReceipt({
    eventId: payload.event_id,
    partnerId: payload.partner_id,
  });

  if (!persisted.ok) {
    return { ok: false, status: 400 };
  }

  return {
    ok: true,
    received: true,
    idempotent: persisted.idempotent,
    eventId: payload.event_id,
    partnerId: payload.partner_id,
  };
}

export async function listSandboxTestReceiptsForPartner(
  partnerId: string,
): Promise<SandboxTestReceiptRow[] | null> {
  const client = sb();
  if (!client) return null;

  const { data, error } = await client
    .from(SANDBOX_TEST_RECEIPTS_TABLE)
    .select("event_id, partner_id, event_type, received_at")
    .eq("partner_id", partnerId)
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) return null;

  return (data ?? []).map((row) => ({
    event_id: row.event_id as string,
    partner_id: row.partner_id as string,
    event_type: row.event_type as typeof PARTNER_WEBHOOK_TEST_EVENT_TYPE,
    received_at: row.received_at as string,
  }));
}

export const SANDBOX_RECEIVER_REQUEST_HEADERS = {
  eventId: WEBHOOK_EVENT_ID_HEADER,
  timestamp: WEBHOOK_TIMESTAMP_HEADER,
  signature: WEBHOOK_SIGNATURE_HEADER,
} as const;
