// FILE: lib/partner/twoAppEvaluation/store.ts
// Evaluation registry — partner_launchpad_activity + in-memory for tests. No migration.

import { randomUUID } from "node:crypto";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import type { TwoAppEvidenceClassification, TwoAppEvaluationRecord } from "./contract";
import { TWO_APP_DEFAULT_POLICY_PACK, TWO_APP_EVALUATION_PUBLIC_CODE } from "./contract";

const memory = new Map<string, TwoAppEvaluationRecord>();

export function resetTwoAppEvaluationStoreForTests(): void {
  memory.clear();
}

export function seedTwoAppEvaluationForTests(record: TwoAppEvaluationRecord): void {
  memory.set(record.evaluation_id, record);
}

function activityMetadata(record: TwoAppEvaluationRecord): Record<string, string | number | boolean | null> {
  return {
    evaluation_id: record.evaluation_id,
    companion_app_ref: record.app_b.application_id,
    evaluation_role: "app_a",
    target_policy_pack: record.target_policy_pack,
    evidence_class: record.evidence_classification,
    display_label: record.app_a.display_name,
    lifecycle_class: "two_app_evaluation",
  };
}

export async function saveTwoAppEvaluationRecord(record: TwoAppEvaluationRecord): Promise<void> {
  memory.set(record.evaluation_id, record);
  if (process.env.VITEST) return;

  try {
    const sb = requireSupabaseAdmin();
    await recordLaunchpadActivity(sb, {
      applicationId: record.app_a.application_id,
      partnerId: record.partner_id,
      eventType: "application_provisioned",
      publicCode: TWO_APP_EVALUATION_PUBLIC_CODE,
      metadata: activityMetadata(record),
    });
    await recordLaunchpadActivity(sb, {
      applicationId: record.app_b.application_id,
      partnerId: record.partner_id,
      eventType: "application_provisioned",
      publicCode: TWO_APP_EVALUATION_PUBLIC_CODE,
      metadata: {
        evaluation_id: record.evaluation_id,
        companion_app_ref: record.app_a.application_id,
        evaluation_role: "app_b",
        target_policy_pack: record.target_policy_pack,
        evidence_class: record.evidence_classification,
        display_label: record.app_b.display_name,
        lifecycle_class: "two_app_evaluation",
      },
    });
  } catch {
    // best-effort durable anchor; in-memory remains source for local dev without DB
  }
}

export async function loadTwoAppEvaluationRecord(
  evaluationId: string,
): Promise<TwoAppEvaluationRecord | null> {
  const cached = memory.get(evaluationId);
  if (cached) return cached;
  if (process.env.VITEST) return null;

  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_activity")
      .select("metadata, partner_id, application_id, created_at")
      .eq("public_code", TWO_APP_EVALUATION_PUBLIC_CODE)
      .contains("metadata", { evaluation_id: evaluationId, evaluation_role: "app_a" })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!data?.metadata || typeof data.metadata !== "object") return null;
    const meta = data.metadata as Record<string, unknown>;
    const appAId = String(data.application_id ?? "");
    const appBId = String(meta.companion_app_ref ?? "");
    if (!appAId || !appBId) return null;

    const { data: apps } = await sb
      .from("partner_launchpad_applications")
      .select("id, display_name")
      .in("id", [appAId, appBId]);
    const appA = apps?.find((a) => a.id === appAId);
    const appB = apps?.find((a) => a.id === appBId);
    if (!appA || !appB) return null;

    const record: TwoAppEvaluationRecord = {
      evaluation_id: evaluationId,
      partner_id: String(data.partner_id),
      environment: "sandbox",
      started_at: String(data.created_at ?? new Date().toISOString()),
      target_policy_pack: String(meta.target_policy_pack ?? TWO_APP_DEFAULT_POLICY_PACK),
      app_a: { application_id: appAId, display_name: String(appA.display_name) },
      app_b: { application_id: appBId, display_name: String(appB.display_name) },
      evidence_classification: String(meta.evidence_class ?? "EXTERNAL_SANDBOX") as TwoAppEvidenceClassification,
      operator_classification_override: null,
      discovery_completed_at: null,
      blocked_category: null,
      blocked_note: null,
    };
    memory.set(evaluationId, record);
    return record;
  } catch {
    return null;
  }
}

export async function listTwoAppEvaluationsForPartner(
  partnerId: string,
): Promise<TwoAppEvaluationRecord[]> {
  if (process.env.VITEST) {
    return Array.from(memory.values()).filter((r) => r.partner_id === partnerId);
  }
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_activity")
      .select("metadata, partner_id, application_id, created_at")
      .eq("partner_id", partnerId)
      .eq("public_code", TWO_APP_EVALUATION_PUBLIC_CODE)
      .contains("metadata", { evaluation_role: "app_a" })
      .order("created_at", { ascending: false })
      .limit(50);

    const records: TwoAppEvaluationRecord[] = [];
    for (const row of data ?? []) {
      const meta = row.metadata as Record<string, unknown> | null;
      const evaluationId = typeof meta?.evaluation_id === "string" ? meta.evaluation_id : null;
      if (!evaluationId) continue;
      const loaded = await loadTwoAppEvaluationRecord(evaluationId);
      if (loaded) records.push(loaded);
    }
    return records;
  } catch {
    return Array.from(memory.values()).filter((r) => r.partner_id === partnerId);
  }
}

export async function listAllTwoAppEvaluationsForAdmin(): Promise<TwoAppEvaluationRecord[]> {
  if (process.env.VITEST) return Array.from(memory.values());
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_launchpad_activity")
      .select("metadata")
      .eq("public_code", TWO_APP_EVALUATION_PUBLIC_CODE)
      .contains("metadata", { evaluation_role: "app_a" })
      .order("created_at", { ascending: false })
      .limit(100);

    const ids = new Set<string>();
    for (const row of data ?? []) {
      const meta = row.metadata as Record<string, unknown> | null;
      if (typeof meta?.evaluation_id === "string") ids.add(meta.evaluation_id);
    }
    const records: TwoAppEvaluationRecord[] = [];
    for (const id of Array.from(ids)) {
      const loaded = await loadTwoAppEvaluationRecord(id);
      if (loaded) records.push(loaded);
    }
    return records;
  } catch {
    return Array.from(memory.values());
  }
}

export function createEvaluationId(): string {
  return randomUUID();
}
