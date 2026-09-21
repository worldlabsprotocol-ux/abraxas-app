// FILE: lib/verification/issuerTrust/match.ts
// Exact method matching. Never falls back to a weaker issuer.

import type { PolicyPack } from "@/lib/partner/launchpad/policyPacks";
import type { SanitizedReleaseShape } from "@/lib/partner/policyReleaseCandidate/sanitize";
import { ASSURANCE_RANK } from "@/lib/policy/compatibilityEdge/types";
import {
  HOLDER_APPROVED_METHOD,
  NO_VERIFIED_METHOD,
  VERIFICATION_ISSUER_TRUST_NOTICE,
} from "./contract";
import {
  opaqueIssuerRef,
  VERIFICATION_ISSUER_TRUST_RECORDS,
  type VerificationIssuerRecord,
} from "./registry";
import { overlayReclaimIssuerRecord } from "@/lib/reclaimAttestation/issuer";

export interface IssuerPlanEntry {
  issuer_ref: string;
  record_version: number;
  label: string;
  method_category: string;
  assurance_level: string;
  status: string;
  integration: string;
  holder_selectable: false | true;
  partner_selectable: false;
  planning_only: boolean;
}

export interface IssuerMethodPlan {
  notice: string;
  holder_notice: string;
  availability: "approved_verification_method" | "no_verified_method";
  no_verified_method: boolean;
  can_ready_for_review: boolean;
  creates_policy: false;
  publishes_catalog: false;
  activates_mainnet: false;
  entries: IssuerPlanEntry[];
}

const DISCLOSURE_RANK = {
  result_only: 0,
  result_and_method_category: 1,
  result_and_freshness: 1,
} as const;

function nowMs(now?: Date): number {
  return (now ?? new Date()).getTime();
}

export function issuerRecordIsCurrent(record: VerificationIssuerRecord, now?: Date): boolean {
  const ts = nowMs(now);
  if (new Date(record.valid_from).getTime() > ts) return false;
  if (record.valid_until && new Date(record.valid_until).getTime() <= ts) return false;
  return true;
}

function assuranceOk(actual: string, required: string): boolean {
  const left = ASSURANCE_RANK[actual];
  const right = ASSURANCE_RANK[required];
  if (left == null || right == null) return false;
  return left >= right;
}

function disclosureOk(supported: keyof typeof DISCLOSURE_RANK, required: keyof typeof DISCLOSURE_RANK): boolean {
  return DISCLOSURE_RANK[supported] <= DISCLOSURE_RANK[required];
}

export function isHolderSelectable(record: VerificationIssuerRecord): boolean {
  return record.status === "active"
    && (record.integration === "integrated" || record.integration === "integration_ready")
    && record.method_category !== "account_login"
    && issuerRecordIsCurrent(record);
}

export function matchesReleaseShape(record: VerificationIssuerRecord, shape: SanitizedReleaseShape, now?: Date): boolean {
  if (!issuerRecordIsCurrent(record, now)) return false;
  if (record.status === "disabled" || record.status === "retiring") return false;
  if (record.method_category === "account_login") return false;
  if (record.method_category !== shape.method_category) return false;
  if (!(record.result_categories as readonly string[]).includes(shape.result_category)) return false;
  if (!record.environments.includes(shape.environment)) return false;
  if (String(record.assurance_level) === "L0") return false;
  if (!assuranceOk(record.assurance_level, shape.minimum_assurance)) return false;
  if (!disclosureOk(record.disclosure_boundary, shape.disclosure_profile)) return false;
  return record.status === "active" || record.status === "review_required";
}

function toEntry(record: VerificationIssuerRecord): IssuerPlanEntry {
  const selectable = isHolderSelectable(record);
  return {
    issuer_ref: opaqueIssuerRef(record.issuer_key, record.record_version),
    record_version: record.record_version,
    label: record.label,
    method_category: record.method_category,
    assurance_level: record.assurance_level,
    status: record.status,
    integration: record.integration,
    holder_selectable: selectable,
    partner_selectable: false,
    planning_only: record.status === "review_required" || record.integration === "planned",
  };
}

export function overlayIssuerTrustRecords(
  records: readonly VerificationIssuerRecord[] = VERIFICATION_ISSUER_TRUST_RECORDS,
): VerificationIssuerRecord[] {
  return records.map(overlayReclaimIssuerRecord);
}

export function planIssuersForReleaseShape(
  shape: SanitizedReleaseShape,
  records: readonly VerificationIssuerRecord[] = overlayIssuerTrustRecords(),
  now?: Date,
): IssuerMethodPlan {
  const matched = records.filter((record) => matchesReleaseShape(record, shape, now));
  const canReady = matched.some((record) => record.status === "active" || record.status === "review_required");
  const holderOk = matched.some(isHolderSelectable);
  return {
    notice: VERIFICATION_ISSUER_TRUST_NOTICE,
    holder_notice: holderOk ? HOLDER_APPROVED_METHOD : NO_VERIFIED_METHOD,
    availability: canReady ? "approved_verification_method" : "no_verified_method",
    no_verified_method: !canReady,
    can_ready_for_review: canReady,
    creates_policy: false,
    publishes_catalog: false,
    activates_mainnet: false,
    entries: matched.map(toEntry),
  };
}

const PACK_RESULTS: Record<string, SanitizedReleaseShape["result_category"]> = {
  age_18_retail: "age_18",
  age_21_retail: "age_21",
  residency_us: "residency",
  wallet_control: "wallet_control",
  membership_credential: "membership",
  collector_redemption: "collector_redemption",
  identity_liveness: "identity_liveness",
  sandbox_economic_demo: "sandbox_demo",
};

export function planIssuersForPack(pack: PolicyPack, now?: Date): IssuerMethodPlan {
  const result = PACK_RESULTS[pack.id] ?? "sandbox_demo";
  const method = pack.id === "identity_liveness"
    ? "identity_liveness"
    : pack.id === "sandbox_economic_demo"
      ? "self_attestation"
      : pack.id === "wallet_control"
        ? "wallet_control"
        : "reuse_existing_proof";
  const shape: SanitizedReleaseShape = {
    policy_label: `reviewed_gate_${result}` as SanitizedReleaseShape["policy_label"],
    action: "retail_access",
    result_category: result,
    shared_result: ["eligibility_result"],
    withheld: ["date_of_birth", "holder_wallet"],
    method_category: method as SanitizedReleaseShape["method_category"],
    minimum_assurance: pack.minimum_assurance === "L0" ? "L1" : pack.minimum_assurance === "L4" ? "L3" : pack.minimum_assurance as SanitizedReleaseShape["minimum_assurance"],
    environment: pack.production_suitability === "sandbox_only" ? "sandbox" : "sandbox",
    action_scopes: ["sandbox:protocol_access"],
    disclosure_profile: "result_only",
    compatibility_impact: "policy_review",
    live_policy: false,
    publishes_catalog: false,
    mutates_compatibility_edge: false,
  };
  if (pack.id === "sandbox_economic_demo") {
    return planIssuersForReleaseShape({ ...shape, method_category: "partner_age_check", minimum_assurance: "L1" }, overlayIssuerTrustRecords(), now);
  }
  if (pack.id === "wallet_control") {
    return planIssuersForReleaseShape({ ...shape, method_category: "reuse_existing_proof", minimum_assurance: "L1" }, overlayIssuerTrustRecords(), now);
  }
  return planIssuersForReleaseShape(shape, overlayIssuerTrustRecords(), now);
}

export function issuerTrustLeaks(payload: unknown): string[] {
  const blob = JSON.stringify(payload).toLowerCase();
  const leaks: string[] = [];
  for (const needle of ["abx_live_", "abx_test_", "callback_url", "oauth", "id_token", "private_key", "sqlstate", "receipt_id", "app_secret", "extracted_parameters"]) {
    if (blob.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
