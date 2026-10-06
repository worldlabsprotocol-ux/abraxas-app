// FILE: lib/identity/providerIngestion/replayStore.ts
// Durable provider event replay protection — database-backed, multi-instance safe.

import { createHash } from "crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export function hashProviderEvent(
  providerId: string,
  providerEventId: string,
  eventBody: unknown,
): string {
  const canonical = JSON.stringify(eventBody);
  return createHash("sha256")
    .update(`${providerId}:${providerEventId}:${canonical}`, "utf8")
    .digest("hex");
}

export type ReplayConsumeResult =
  | { ok: true; code: "consumed" }
  | { ok: true; code: "duplicate" }
  | { ok: false; code: "conflict"; existingHash: string }
  | { ok: false; code: "rpc_failed"; detail?: string };

export async function consumeProviderEventReplay(input: {
  providerId: string;
  providerEventId: string;
  eventHash: string;
  abraxasSubjectId?: string | null;
  outcome?: string;
}): Promise<ReplayConsumeResult> {
  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("consume_provider_event_replay", {
    p_provider_id: input.providerId,
    p_provider_event_id: input.providerEventId,
    p_event_hash: input.eventHash,
    p_abraxas_subject_id: input.abraxasSubjectId ?? null,
    p_outcome: input.outcome ?? "processed",
  });

  if (error) {
    return { ok: false, code: "rpc_failed", detail: error.message };
  }

  const result = data as { ok?: boolean; code?: string; existing_hash?: string } | null;
  if (!result) {
    return { ok: false, code: "rpc_failed", detail: "empty_rpc_result" };
  }

  if (result.ok && result.code === "consumed") {
    return { ok: true, code: "consumed" };
  }
  if (!result.ok && result.code === "duplicate") {
    return { ok: true, code: "duplicate" };
  }
  if (!result.ok && result.code === "conflict") {
    return { ok: false, code: "conflict", existingHash: result.existing_hash ?? "" };
  }

  return { ok: false, code: "rpc_failed", detail: result.code ?? "unknown" };
}
