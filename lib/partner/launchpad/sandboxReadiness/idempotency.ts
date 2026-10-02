// FILE: lib/partner/launchpad/sandboxReadiness/idempotency.ts
// Tenant-scoped idempotent retries for sandbox readiness runs.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export interface StoredSandboxRun {
  applicationId: string;
  partnerId: string;
  stage: string;
  idempotencyKey: string;
  status: string;
  code: string;
  detail: string;
  at: string;
}

const TABLE = "sandbox_readiness_runs";
const store = new Map<string, StoredSandboxRun>();

function skipDurableStore(): boolean {
  return Boolean(process.env.VITEST);
}

function isProductionRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

export function resetSandboxIdempotencyStoreForTests(): void {
  store.clear();
}

function key(input: {
  partnerId: string;
  applicationId: string;
  stage: string;
  idempotencyKey: string;
}): string {
  return `${input.partnerId}:${input.applicationId}:${input.stage}:${input.idempotencyKey}`;
}

export async function rememberSandboxRun(run: StoredSandboxRun): Promise<void> {
  store.set(key(run), run);

  if (skipDurableStore()) return;

  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(TABLE).upsert({
      partner_id: run.partnerId,
      application_id: run.applicationId,
      stage: run.stage,
      idempotency_key: run.idempotencyKey,
      status: run.status,
      code: run.code,
      detail: run.detail,
      recorded_at: run.at,
    }, { onConflict: "partner_id,application_id,stage,idempotency_key" });
    if (error) throw error;
  } catch (error) {
    if (isProductionRuntime()) {
      console.warn("[sandbox_readiness] durable idempotency persist failed:", error instanceof Error ? error.message : error);
    }
  }
}

export async function recallSandboxRun(input: {
  partnerId: string;
  applicationId: string;
  stage: string;
  idempotencyKey: string;
}): Promise<StoredSandboxRun | null> {
  const cached = store.get(key(input));
  if (cached) return cached;

  if (skipDurableStore()) return null;

  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from(TABLE)
      .select("*")
      .eq("partner_id", input.partnerId)
      .eq("application_id", input.applicationId)
      .eq("stage", input.stage)
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (!data) return null;
    const run: StoredSandboxRun = {
      applicationId: String(data.application_id),
      partnerId: String(data.partner_id),
      stage: String(data.stage),
      idempotencyKey: String(data.idempotency_key),
      status: String(data.status),
      code: String(data.code),
      detail: String(data.detail),
      at: String(data.recorded_at),
    };
    store.set(key(input), run);
    return run;
  } catch {
    return null;
  }
}
