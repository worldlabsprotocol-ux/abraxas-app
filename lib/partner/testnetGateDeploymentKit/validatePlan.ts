import { institutionalEnvelopeLeaks } from "./institutional";
import { classifyKitFile, isPlanningEnvelope } from "./classify";
import { verifyInstitutionalPlan } from "./verify";
import type { KitCliResult, TestnetGateKitEnvelope } from "./types";

const STATIC_IDENTITY_KEYS = [
  "organization_commitment",
  "actor_commitment",
  "institutional_result_category_hash",
  "organization_ref",
  "actor_ref",
  "valid_until",
  "subject_hash",
  "receipt_id",
] as const;

function hasStaticIdentity(plan: Record<string, unknown>): boolean {
  return STATIC_IDENTITY_KEYS.some((key) => key in plan && plan[key] != null);
}

export function validateInstitutionalPlanFile(raw: unknown): KitCliResult {
  const command = "validate-plan";
  const kind = classifyKitFile(raw);
  if (kind === "registry_manifest") {
    return { ok: false, command, reason: "registry_manifest", file_kind: kind };
  }
  if (kind !== "plan_envelope" || !isPlanningEnvelope(raw)) {
    return { ok: false, command, reason: "invalid", file_kind: "invalid" };
  }
  if (institutionalEnvelopeLeaks(raw).length) {
    return { ok: false, command, reason: "forbidden_field", file_kind: "plan_envelope" };
  }
  const envelope = raw as TestnetGateKitEnvelope;
  if (envelope.institutional) {
    if (hasStaticIdentity(envelope.institutional as unknown as Record<string, unknown>)) {
      return { ok: false, command, reason: "binding_mismatch", file_kind: "plan_envelope" };
    }
    const checked = verifyInstitutionalPlan(envelope.institutional, envelope);
    if (!checked.ok) return { ok: false, command, reason: checked.reason, file_kind: "plan_envelope" };
  }
  if (envelope.gate_type === "solana") {
    const v2 = envelope.solana_v2;
    if (!v2 || v2.message_len !== 468 || v2.schema_version !== 2 || v2.require_institutional !== true) {
      return { ok: false, command, reason: "institutional_required", file_kind: "plan_envelope" };
    }
  }
  if (envelope.network_id !== "solana_devnet" && envelope.network_id !== "evm_sepolia") {
    return { ok: false, command, reason: "network_disabled", file_kind: "plan_envelope" };
  }
  return { ok: true, command, envelope, file_kind: "plan_envelope", broadcast: false };
}
