// FILE: lib/partner/actionControlPlane/lifecycle.ts
// Map existing Launchpad activity and webhook state to opaque, safe lifecycle rows.

import { createHash } from "crypto";
import {
  ACTION_CONTROL_PLANE_LIFECYCLE_LANES,
  type ActionControlPlaneLifecycleLane,
  type ActionControlPlaneSafeReason,
} from "./contract";

export interface ActionControlPlaneActivityRow {
  id: string;
  event_type: string;
  public_code: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ActionControlPlaneLifecycleItem {
  id: string;
  lane: ActionControlPlaneLifecycleLane;
  status: "ok" | "attention" | "blocked" | "idle";
  reason: ActionControlPlaneSafeReason;
  count: number;
  last_opaque_id: string | null;
}

export function opaqueActionControlPlaneId(rawId: string): string {
  return `acp_${createHash("sha256").update(rawId).digest("hex").slice(0, 12)}`;
}

function safeReasonFromCode(code: string | null | undefined): ActionControlPlaneSafeReason {
  const value = String(code ?? "").toLowerCase();
  if (value.includes("replay") || value === "reused") return "nonce_replayed";
  if (value.includes("expired")) return "receipt_expired";
  if (value.includes("revoked")) return "receipt_revoked";
  if (value.includes("denied") || value.includes("wrong_")) return "policy_denied";
  if (value.includes("issued") || value.includes("verified") || value === "approved") return "permitted";
  if (value.includes("version")) return "policy_version_blocked";
  if (value.includes("webhook") && value.includes("fail")) return "webhook_failed";
  return "action_required";
}

function laneFromRow(row: ActionControlPlaneActivityRow): ActionControlPlaneLifecycleLane | null {
  const metaLane = row.metadata?.lifecycle_lane;
  if (
    typeof metaLane === "string"
    && (ACTION_CONTROL_PLANE_LIFECYCLE_LANES as readonly string[]).includes(metaLane)
  ) {
    return metaLane as ActionControlPlaneLifecycleLane;
  }
  const family = String(row.metadata?.action_family ?? "");
  if (family === "trading_venue" || family === "payment_authorization") return "action_preflight";
  if (family === "wallet_standard_binding") return "action_preflight";
  if (row.event_type === "proof_reused" || row.public_code === "reused" || row.public_code === "replayed") {
    return "nonce_replay";
  }
  if (
    row.event_type === "receipt_issued"
    || row.event_type === "receipt_verified"
    || row.event_type === "receipt_signing_attempted"
    || row.event_type === "verification_failed"
  ) {
    return "receipt_validity";
  }
  if (row.event_type === "sandbox_readiness_run" && String(row.metadata?.stage ?? "") === "webhook_test") {
    return "webhook_delivery";
  }
  if (row.event_type === "sandbox_readiness_run" && String(row.metadata?.stage ?? "") === "policy_version_compatibility") {
    return "policy_version";
  }
  if (row.public_code === "trading_preflight" || row.public_code === "payment_preflight") {
    return "action_preflight";
  }
  return null;
}

export function buildActionControlPlaneLifecycle(input: {
  activity: ActionControlPlaneActivityRow[];
  webhookDeliveryStatus?: string | null;
  webhookFailure?: boolean;
  policyVersionBlocked?: boolean;
}): ActionControlPlaneLifecycleItem[] {
  const buckets = new Map<ActionControlPlaneLifecycleLane, ActionControlPlaneLifecycleItem>();
  for (const lane of ACTION_CONTROL_PLANE_LIFECYCLE_LANES) {
    buckets.set(lane, {
      id: lane,
      lane,
      status: "idle",
      reason: "not_run",
      count: 0,
      last_opaque_id: null,
    });
  }

  for (const row of input.activity) {
    const lane = laneFromRow(row);
    if (!lane) continue;
    const current = buckets.get(lane)!;
    current.count += 1;
    if (!current.last_opaque_id) current.last_opaque_id = opaqueActionControlPlaneId(row.id);
    const reason = safeReasonFromCode(row.public_code);
    if (reason === "nonce_replayed" || reason === "receipt_revoked" || reason === "webhook_failed") {
      current.status = "blocked";
      current.reason = reason;
    } else if (reason === "receipt_expired" || reason === "policy_denied" || reason === "policy_version_blocked") {
      if (current.status !== "blocked") {
        current.status = "attention";
        current.reason = reason;
      }
    } else if (current.status === "idle") {
      current.status = "ok";
      current.reason = reason === "permitted" ? "permitted" : reason;
    }
  }

  const webhook = buckets.get("webhook_delivery")!;
  if (input.webhookFailure) {
    webhook.status = "blocked";
    webhook.reason = "webhook_failed";
  } else if (input.webhookDeliveryStatus === "retrying") {
    webhook.status = "attention";
    webhook.reason = "webhook_retrying";
  } else if (input.webhookDeliveryStatus === "delivered" && webhook.status === "idle") {
    webhook.status = "ok";
    webhook.reason = "permitted";
  }

  const policy = buckets.get("policy_version")!;
  if (input.policyVersionBlocked && policy.status !== "blocked") {
    policy.status = "attention";
    policy.reason = "policy_version_blocked";
  }

  return ACTION_CONTROL_PLANE_LIFECYCLE_LANES.map((lane) => buckets.get(lane)!);
}

export function activityMarksCapability(
  activity: ActionControlPlaneActivityRow[],
  capability: "trading_venue" | "payment_authorization" | "wallet_standard_binding",
): boolean {
  const codes = capability === "trading_venue"
    ? ["trading_preflight", "trading_preflight_tested"]
    : capability === "payment_authorization"
      ? ["payment_preflight", "payment_preflight_tested"]
      : ["wallet_binding_tested", "wallet_standard_bound"];
  return activity.some((row) => {
    if (codes.includes(String(row.public_code ?? ""))) return true;
    return row.metadata?.action_family === capability && row.metadata?.probe === true;
  });
}
