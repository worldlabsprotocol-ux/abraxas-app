// FILE: lib/partner/hostedHandoff/store.ts
// Durable handoff records. Fail closed when the table or allowlist is unavailable.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/siteUrl";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";
import { opaqueCallbackRef } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import type { PartnerFlowStoredConfig } from "@/lib/partner/launchpad/partnerFlowRequest/view";
import {
  HOSTED_HANDOFF_CHECKLIST,
  HOSTED_HANDOFF_NOTICE,
  HOSTED_HANDOFF_TTL_MS,
  HOSTED_HANDOFF_VERSION,
  type HostedHandoffRuntime,
} from "./contract";
import { nonceHash, opaqueHandoffRef, opaqueNonce, opaqueVerifyRequest } from "./opaque";
import type { HostedHandoffPartnerView, HostedHandoffPublicView, HostedHandoffRecord } from "./types";

const TABLE = "hosted_partner_flow_handoffs";
const memory = new Map<string, HostedHandoffRecord>();

export function resetHostedHandoffsForTests(): void {
  memory.clear();
}

export function putHandoffForTests(record: HostedHandoffRecord): void {
  memory.set(record.handoff_ref, record);
}

function hostedUrl(verifyRequest: string): string {
  return `${SITE_URL.replace(/\/$/, "")}/partner/continue?verify_request=${encodeURIComponent(verifyRequest)}`;
}

function fromRow(row: Record<string, unknown>): HostedHandoffRecord {
  return {
    id: String(row.id),
    handoff_ref: String(row.handoff_ref),
    verify_request: String(row.verify_request),
    application_id: String(row.application_id),
    partner_id: String(row.partner_id),
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    action: row.action as HostedHandoffRecord["action"],
    purpose: String(row.purpose),
    callback_ref: String(row.callback_ref),
    runtime: row.runtime as HostedHandoffRuntime,
    environment: row.environment === "production" ? "production" : "sandbox",
    status: row.status as HostedHandoffRecord["status"],
    nonce_hash: String(row.nonce_hash),
    issued_at: String(row.issued_at),
    expires_at: String(row.expires_at),
    consumed_at: row.consumed_at ? String(row.consumed_at) : null,
    public_receipt_id: row.public_receipt_id ? String(row.public_receipt_id) : null,
    fixture: row.fixture === true,
  };
}

function refreshStatus(record: HostedHandoffRecord, now = Date.now()): HostedHandoffRecord {
  if (record.status === "created" && new Date(record.expires_at).getTime() <= now) {
    return { ...record, status: "expired" };
  }
  return record;
}

async function persist(record: HostedHandoffRecord): Promise<void> {
  memory.set(record.handoff_ref, record);
  if (process.env.VITEST || process.env.NODE_ENV === "test") return;
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      id: record.id,
      handoff_ref: record.handoff_ref,
      verify_request: record.verify_request,
      application_id: record.application_id,
      partner_id: record.partner_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      action: record.action,
      purpose: record.purpose,
      callback_ref: record.callback_ref,
      runtime: record.runtime,
      environment: record.environment,
      status: record.status,
      nonce_hash: record.nonce_hash,
      issued_at: record.issued_at,
      expires_at: record.expires_at,
      consumed_at: record.consumed_at,
      public_receipt_id: record.public_receipt_id,
      fixture: record.fixture,
    }, { onConflict: "handoff_ref" });
    if (error) {
      const msg = `${error.message} ${error.code ?? ""}`.toLowerCase();
      if (msg.includes("does not exist") || msg.includes("schema") || msg.includes("42p01")) {
        throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
      }
      throw Object.assign(new Error("unavailable"), { code: "unavailable" });
    }
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export async function loadHandoff(handoffRef: string): Promise<HostedHandoffRecord | null> {
  const cached = memory.get(handoffRef);
  if (cached) return refreshStatus(cached);
  if (process.env.VITEST || process.env.NODE_ENV === "test") return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("handoff_ref", handoffRef).maybeSingle();
    if (error || !data) return cached ? refreshStatus(cached) : null;
    const record = refreshStatus(fromRow(data as Record<string, unknown>));
    memory.set(record.handoff_ref, record);
    return record;
  } catch {
    return cached ? refreshStatus(cached) : null;
  }
}

export async function loadHandoffByVerifyRequest(verifyRequest: string): Promise<HostedHandoffRecord | null> {
  for (const record of memory.values()) {
    if (record.verify_request === verifyRequest) return refreshStatus(record);
  }
  if (process.env.VITEST || process.env.NODE_ENV === "test") return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.from(TABLE).select("*").eq("verify_request", verifyRequest).maybeSingle();
    if (error || !data) return null;
    const record = refreshStatus(fromRow(data as Record<string, unknown>));
    memory.set(record.handoff_ref, record);
    return record;
  } catch {
    return null;
  }
}

export function projectPublic(record: HostedHandoffRecord): HostedHandoffPublicView {
  const live = refreshStatus(record);
  return {
    version: HOSTED_HANDOFF_VERSION,
    notice: HOSTED_HANDOFF_NOTICE,
    hosted_url: hostedUrl(live.verify_request),
    handoff_ref: live.handoff_ref,
    verify_request: live.verify_request,
    runtime: live.runtime,
    environment: live.environment,
    status: live.status,
    expires_at: live.expires_at,
    checklist: HOSTED_HANDOFF_CHECKLIST,
    callback_bound: true,
    must_reverify: true,
    is_grant: false,
    activates_production: false,
    activates_mainnet: false,
    issues_credentials: false,
  };
}

export function projectPartner(record: HostedHandoffRecord): HostedHandoffPartnerView {
  const live = refreshStatus(record);
  return {
    ...projectPublic(live),
    public_receipt_id: live.status === "completed" || live.status === "consumed" ? live.public_receipt_id : null,
    action: live.action,
    policy_version: live.policy_version,
  };
}

export async function createHostedHandoff(input: {
  application: LaunchpadApplicationRow;
  stored: PartnerFlowStoredConfig;
  runtime: HostedHandoffRuntime;
  fixture?: boolean;
}): Promise<HostedHandoffRecord> {
  const urls = input.application.allowed_return_urls ?? [];
  const callback = input.stored.callback_url;
  if (!callback || !isLaunchpadReturnUrlAllowlisted(urls, callback)) {
    throw Object.assign(new Error("callback_rejected"), { code: "callback_rejected" });
  }
  if (!input.stored.action || !input.stored.purpose) {
    throw Object.assign(new Error("not_configured"), { code: "not_configured" });
  }
  if (!input.application.policy_id) {
    throw Object.assign(new Error("app_unpinned"), { code: "app_unpinned" });
  }
  if (input.application.environment === "production" && input.application.status !== "active") {
    throw Object.assign(new Error("production_denied"), { code: "production_denied" });
  }
  const seed = `${input.application.id}:${opaqueNonce()}`;
  const now = new Date();
  const record: HostedHandoffRecord = {
    id: crypto.randomUUID(),
    handoff_ref: opaqueHandoffRef(seed),
    verify_request: opaqueVerifyRequest(seed),
    application_id: input.application.id,
    partner_id: input.application.partner_id,
    policy_id: input.application.policy_id,
    policy_version: input.application.policy_version,
    action: input.stored.action,
    purpose: input.stored.purpose,
    callback_ref: opaqueCallbackRef(callback),
    runtime: input.runtime,
    environment: input.application.environment === "production" ? "production" : "sandbox",
    status: "created",
    nonce_hash: nonceHash(opaqueNonce()),
    issued_at: now.toISOString(),
    expires_at: new Date(now.getTime() + HOSTED_HANDOFF_TTL_MS).toISOString(),
    consumed_at: null,
    public_receipt_id: null,
    fixture: input.fixture === true,
  };
  await persist(record);
  return record;
}

export async function cancelHostedHandoff(record: HostedHandoffRecord, partnerId: string, applicationId: string): Promise<HostedHandoffRecord> {
  if (record.partner_id !== partnerId || record.application_id !== applicationId) {
    throw Object.assign(new Error("tenant_mismatch"), { code: "tenant_mismatch" });
  }
  const live = refreshStatus(record);
  if (live.status !== "created") {
    throw Object.assign(new Error("not_cancellable"), { code: "not_cancellable" });
  }
  const next = { ...live, status: "cancelled" as const };
  await persist(next);
  return next;
}

export async function completeHostedHandoff(input: {
  record: HostedHandoffRecord;
  partnerId: string;
  applicationId: string;
  publicReceiptId: string;
  nonce?: string;
}): Promise<HostedHandoffRecord> {
  const current = (await loadHandoff(input.record.handoff_ref)) ?? input.record;
  if (current.partner_id !== input.partnerId || current.application_id !== input.applicationId) {
    throw Object.assign(new Error("tenant_mismatch"), { code: "tenant_mismatch" });
  }
  const live = refreshStatus(current);
  if (live.status === "consumed" || live.status === "completed") {
    throw Object.assign(new Error("replay_denied"), { code: "replay_denied" });
  }
  if (live.status !== "created") {
    throw Object.assign(new Error("not_completable"), { code: "not_completable" });
  }
  if (input.nonce && nonceHash(input.nonce) !== live.nonce_hash) {
    throw Object.assign(new Error("replay_denied"), { code: "replay_denied" });
  }
  const next: HostedHandoffRecord = {
    ...live,
    status: "completed",
    public_receipt_id: input.publicReceiptId,
    consumed_at: new Date().toISOString(),
  };
  await persist(next);
  return next;
}

export async function bindHandoffToIssuedReceipt(input: {
  verifyRequest: string;
  partnerId: string;
  policyId: string;
  publicReceiptId: string;
}): Promise<void> {
  const record = await loadHandoffByVerifyRequest(input.verifyRequest);
  if (!record) return;
  if (record.partner_id !== input.partnerId || record.policy_id !== input.policyId) return;
  await completeHostedHandoff({
    record,
    partnerId: input.partnerId,
    applicationId: record.application_id,
    publicReceiptId: input.publicReceiptId,
  });
}

export async function consumeHandoffReceiptLookup(record: HostedHandoffRecord, partnerId: string): Promise<HostedHandoffRecord> {
  const current = (await loadHandoff(record.handoff_ref)) ?? record;
  if (current.partner_id !== partnerId) {
    throw Object.assign(new Error("tenant_mismatch"), { code: "tenant_mismatch" });
  }
  const live = refreshStatus(current);
  if (live.status === "consumed") {
    throw Object.assign(new Error("replay_denied"), { code: "replay_denied" });
  }
  if (live.status !== "completed") {
    throw Object.assign(new Error("not_ready"), { code: "not_ready" });
  }
  const next = { ...live, status: "consumed" as const };
  await persist(next);
  return next;
}

export function handoffLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const needle of [
    "callback_url",
    "return_url",
    "abx_live_",
    "abx_test_",
    "private_key",
    "oauth_token",
    "id_token",
    "wallet_address",
    "date_of_birth",
  ]) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
