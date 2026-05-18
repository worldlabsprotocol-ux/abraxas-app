// FILE: lib/services/verificationStateMachine.ts
// Deterministic verification state machine.
// NO state transitions happen outside this module.
// Every transition emits an event and writes an audit log.
// Failure states are modeled explicitly — not as afterthoughts.

import { createAdminClient }          from "@/lib/supabase";
import { emitAssetEvent, Events }     from "@/lib/services/eventService";
import { ASSET_CLASS_REGISTRY }       from "@/lib/protocol/assetClasses";
import type { AssetClassName }        from "@/lib/protocol/assetClasses";

// ── Allowed transitions (enforced — not advisory) ─────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted:            ["under_review",    "rejected"],
  under_review:         ["partner_required","additional_documents","rejected","suspended"],
  partner_required:     ["under_review",    "additional_documents","rejected","suspended"],
  additional_documents: ["under_review",    "rejected","suspended"],
  provenance_review:    ["custody_pending", "additional_documents","rejected","suspended"],
  custody_pending:      ["risk_scoring",    "rejected","suspended"],
  risk_scoring:         ["approved",        "rejected","suspended"],
  approved:             ["collateral_eligible","suspended"],
  collateral_eligible:  ["suspended"],      // only suspension can pull back
  rejected:             [],                 // terminal
  suspended:            ["under_review"],   // only path back: manual review
  expired:              [],                 // terminal
};

export type TransitionResult =
  | { ok: true;  newStatus: string }
  | { ok: false; reason: string };

// ── Guard: is this transition allowed? ───────────────────────────────────────
export function isTransitionAllowed(from: string, to: string): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// ── Core transition function ─────────────────────────────────────────────────
export async function transitionAssetStatus(params: {
  assetId:    string;
  toStatus:   string;
  actor:      string;
  actorName?: string;
  note?:      string;
  fraudFlag?: { type: string; severity: string; description: string };
}): Promise<TransitionResult> {
  const db = createAdminClient();
  if (!db) return { ok:false, reason:"Database not configured" };

  // Fetch current status
  const { data: asset, error: fetchErr } = await db
    .from("assets")
    .select("id, verification_status, category, owner_wallet")
    .eq("id", params.assetId)
    .single();

  if (fetchErr || !asset) return { ok:false, reason:"Asset not found" };

  const fromStatus = asset.verification_status;

  // Enforce state machine — reject invalid transitions
  if (!isTransitionAllowed(fromStatus, params.toStatus)) {
    await db.from("audit_logs").insert({
      actor:       params.actor,
      action:      "ILLEGAL_TRANSITION_ATTEMPT",
      resource:    "assets",
      resource_id: params.assetId,
      old_state:   { status: fromStatus },
      new_state:   { attempted: params.toStatus },
    });
    return { ok:false, reason:`Transition ${fromStatus} → ${params.toStatus} is not permitted` };
  }

  // Write the transition
  const { error: updateErr } = await db
    .from("assets")
    .update({
      verification_status: params.toStatus,
      verified_at:         params.toStatus === "approved"             ? new Date().toISOString() : undefined,
      collateralized_at:   params.toStatus === "collateral_eligible"  ? new Date().toISOString() : undefined,
    })
    .eq("id", params.assetId);

  if (updateErr) return { ok:false, reason: updateErr.message };

  // Emit event
  await emitAssetEvent({
    assetId:    params.assetId,
    eventType:  fromStatus === "risk_scoring" && params.toStatus === "approved"
      ? "VERIFICATION_APPROVED" : "VERIFICATION_STAGE_PASSED",
    actor:      params.actor,
    actorName:  params.actorName,
    payload:    { from: fromStatus, to: params.toStatus, note: params.note },
  });

  // Emit collateral activation
  if (params.toStatus === "collateral_eligible") {
    await emitAssetEvent({
      assetId:   params.assetId,
      eventType: "COLLATERAL_ACTIVATED",
      actor:     "SYSTEM",
      payload:   { activatedBy: params.actor },
    });
  }

  // Raise fraud flag if provided
  if (params.fraudFlag) {
    await db.from("fraud_flags").insert({
      asset_id:    params.assetId,
      flag_type:   params.fraudFlag.type,
      severity:    params.fraudFlag.severity,
      description: params.fraudFlag.description,
      raised_by:   params.actor,
      status:      "open",
    });
    await emitAssetEvent({
      assetId:   params.assetId,
      eventType: "FRAUD_FLAG_RAISED",
      actor:     params.actor,
      payload:   params.fraudFlag,
    });
    // Update counter on asset
    await db.rpc("increment_fraud_flag_count", { asset_id: params.assetId });
  }

  // Audit log
  await db.from("audit_logs").insert({
    actor:       params.actor,
    action:      "STATUS_TRANSITION",
    resource:    "assets",
    resource_id: params.assetId,
    old_state:   { status: fromStatus },
    new_state:   { status: params.toStatus, note: params.note },
  });

  return { ok:true, newStatus: params.toStatus };
}

// ── Failure state: suspend an asset ──────────────────────────────────────────
export async function suspendAsset(params: {
  assetId: string;
  actor:   string;
  reason:  string;
}): Promise<TransitionResult> {
  return transitionAssetStatus({
    assetId:  params.assetId,
    toStatus: "suspended",
    actor:    params.actor,
    note:     params.reason,
  });
}

// ── Failure state: expire stale submissions ───────────────────────────────────
// Run as a scheduled job (pg_cron or Supabase Edge Function cron)
export async function expireStaleSubmissions(maxAgeDays = 90): Promise<number> {
  const db = createAdminClient();
  if (!db) return 0;

  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();

  const { data: stale } = await db
    .from("assets")
    .select("id")
    .in("verification_status", ["submitted","under_review","additional_documents"])
    .lt("submitted_at", cutoff);

  if (!stale?.length) return 0;

  for (const { id } of stale) {
    await transitionAssetStatus({
      assetId:  id,
      toStatus: "expired",
      actor:    "SYSTEM",
      note:     `Expired after ${maxAgeDays} days without progression`,
    });
  }

  return stale.length;
}

// ── SQL helper: increment_fraud_flag_count ────────────────────────────────────
// Add this function to Supabase SQL editor:
/*
create or replace function increment_fraud_flag_count(asset_id uuid)
returns void language sql security definer as $$
  update public.assets
  set active_flag_count = active_flag_count + 1
  where id = asset_id;
$$;
*/