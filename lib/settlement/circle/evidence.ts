// FILE: lib/settlement/circle/evidence.ts
// Minimum safe reconciliation evidence. No secrets, PII, wallet addresses, or raw payloads.

import { CIRCLE_MANIFEST_FORBIDDEN_NEEDLES } from "@/lib/settlement/circle/codes";
import {
  CIRCLE_CURRENCY,
  CIRCLE_INFRASTRUCTURE_LABEL,
  CIRCLE_NETWORK,
  CIRCLE_SETTLEMENT_ARTIFACT,
  CIRCLE_SETTLEMENT_LABEL,
  CIRCLE_SETTLEMENT_SCHEMA_VERSION,
  type CircleIntentState,
} from "@/lib/settlement/circle/constants";
import { isCircleUuidV4 } from "@/lib/settlement/circle/idempotency";

export interface CircleSafeEvidence {
  artifact: typeof CIRCLE_SETTLEMENT_ARTIFACT;
  schema_version: typeof CIRCLE_SETTLEMENT_SCHEMA_VERSION;
  environment: "sandbox";
  label: typeof CIRCLE_SETTLEMENT_LABEL;
  infrastructure_label: typeof CIRCLE_INFRASTRUCTURE_LABEL;
  not_a_custodian: true;
  intent_is_not_a_payment: true;
  activates_production: false;
  network: typeof CIRCLE_NETWORK;
  currency: typeof CIRCLE_CURRENCY;
  amount_minor: number;
  state: CircleIntentState;
  provider_request_ref: string | null;
  circle_transaction_id: string | null;
  provider_state: string | null;
  provider_occurred_at: string | null;
  intent_id: string;
  receipt_id: string;
  policy_id: string;
  policy_version: number;
  idempotency_key: string;
  last_updated_at: string | null;
}

export function jsonNeedles(value: unknown): string {
  return JSON.stringify(value).toLowerCase();
}

export function forbiddenEvidenceHits(value: unknown): string[] {
  const blob = jsonNeedles(value);
  return CIRCLE_MANIFEST_FORBIDDEN_NEEDLES.filter((needle) => blob.includes(needle));
}

export function validateCircleSafeEvidence(value: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!value || typeof value !== "object") return { ok: false, errors: ["evidence_not_object"] };
  const rec = value as Record<string, unknown>;
  if (rec.artifact !== CIRCLE_SETTLEMENT_ARTIFACT) errors.push("artifact_invalid");
  if (rec.schema_version !== CIRCLE_SETTLEMENT_SCHEMA_VERSION) errors.push("schema_version_invalid");
  if (rec.environment !== "sandbox") errors.push("environment_not_sandbox");
  if (rec.network !== CIRCLE_NETWORK) errors.push("network_not_arc_testnet");
  if (rec.currency !== CIRCLE_CURRENCY) errors.push("currency_not_usdc");
  if (rec.activates_production !== false) errors.push("activates_production_not_false");
  if (rec.not_a_custodian !== true) errors.push("custodian_claim_missing");
  if (rec.intent_is_not_a_payment !== true) errors.push("intent_marked_as_payment");
  if (typeof rec.amount_minor !== "number" || !Number.isInteger(rec.amount_minor)) {
    errors.push("amount_minor_not_integer");
  }
  if (typeof rec.intent_id !== "string" || !isCircleUuidV4(rec.intent_id)) {
    errors.push("intent_id_not_uuid_v4");
  }
  if (typeof rec.receipt_id !== "string" || !rec.receipt_id.trim()) errors.push("receipt_id_missing");
  if (typeof rec.policy_id !== "string" || !rec.policy_id.trim()) errors.push("policy_id_missing");
  if (typeof rec.policy_version !== "number") errors.push("policy_version_missing");
  if (typeof rec.idempotency_key !== "string" || !isCircleUuidV4(rec.idempotency_key)) {
    errors.push("idempotency_key_not_uuid_v4");
  }
  const keys = Object.keys(rec).join(" ").toLowerCase();
  if (keys.includes("wallet") || keys.includes("secret") || keys.includes("payload") || keys.includes("address")) {
    errors.push("forbidden_key_name");
  }
  for (const needle of forbiddenEvidenceHits(value)) {
    errors.push(`forbidden_material:${needle}`);
  }
  return { ok: errors.length === 0, errors };
}

export function circleEvidenceConformanceFixture(
  overrides: Partial<CircleSafeEvidence> = {},
): CircleSafeEvidence {
  return {
    artifact: CIRCLE_SETTLEMENT_ARTIFACT,
    schema_version: CIRCLE_SETTLEMENT_SCHEMA_VERSION,
    environment: "sandbox",
    label: CIRCLE_SETTLEMENT_LABEL,
    infrastructure_label: CIRCLE_INFRASTRUCTURE_LABEL,
    not_a_custodian: true,
    intent_is_not_a_payment: true,
    activates_production: false,
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: 10_000,
    state: "pending",
    provider_request_ref: null,
    circle_transaction_id: null,
    provider_state: null,
    provider_occurred_at: null,
    intent_id: "00000000-0000-4000-8000-000000000088",
    receipt_id: "00000000-0000-4000-8000-000000000099",
    policy_id: "acme-age-21-v1",
    policy_version: 1,
    idempotency_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    last_updated_at: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}
