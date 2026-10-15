// FILE: lib/passport/stagingExecutionEvidenceIntegrity.ts

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  isAuthoritativeFinalApproval,
  type VerificationRowForIssuance,
} from "@/lib/idv/authoritativeVerificationForIssuance";
import type { StagingExecutionEvidenceV1 } from "./stagingExecutionEvidence";

export const STAGING_ENVIRONMENT_ID_ENV = "ABRAXAS_STAGING_ENVIRONMENT_ID";
export const STAGING_EVIDENCE_APPROVAL_SECRET_ENV = "ABRAXAS_STAGING_EXECUTION_EVIDENCE_APPROVAL_SECRET";

const MAX_EVIDENCE_AGE_MS = 1000 * 60 * 60 * 24 * 90;
const CLOCK_SKEW_MS = 1000 * 60 * 5;

export type EvidenceCorroborationSnapshot = {
  holder_subject_exists: boolean;
  holder_wallet_binding: boolean;
  holder_zklogin_binding: boolean;
  idv_row: VerificationRowForIssuance | null;
  possession_updated_at: string | null;
};

export type EvidenceClaimVerdict =
  | { status: "verified" }
  | { status: "uncorroborated"; code: string }
  | { status: "blocked_founder"; code: string }
  | { status: "absent" };

export type StagingEvidenceIntegrityResult = {
  environment_match: boolean;
  timestamps_valid: boolean;
  founder_approval_valid: boolean;
  browser: EvidenceClaimVerdict;
  idv_review: EvidenceClaimVerdict;
  possession: EvidenceClaimVerdict;
  failure_codes: string[];
};

function parseMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function stableEvidencePayload(evidence: StagingExecutionEvidenceV1): string {
  const { founder_approval_hmac: _ignored, ...rest } = evidence as StagingExecutionEvidenceV1 & {
    founder_approval_hmac?: string;
  };
  return JSON.stringify(rest);
}

export function computeFounderApprovalHmac(evidence: StagingExecutionEvidenceV1, secret: string): string {
  return createHmac("sha256", secret.trim()).update(stableEvidencePayload(evidence)).digest("base64url");
}

export function verifyFounderApprovalHmac(
  evidence: StagingExecutionEvidenceV1,
  secret: string,
): boolean {
  const expected = evidence.founder_approval_hmac?.trim();
  if (!expected || !secret.trim()) return false;
  const digest = createHmac("sha256", secret.trim()).update(stableEvidencePayload(evidence)).digest();
  try {
    const provided = Buffer.from(expected, "base64url");
    return provided.length === digest.length && timingSafeEqual(provided, digest);
  } catch {
    return false;
  }
}

function validateEvidenceTimestamps(evidence: StagingExecutionEvidenceV1, nowMs: number): boolean {
  const recordedMs = parseMs(evidence.recorded_at);
  if (recordedMs === null || recordedMs > nowMs + CLOCK_SKEW_MS) return false;
  if (nowMs - recordedMs > MAX_EVIDENCE_AGE_MS) return false;

  const sections = [
    evidence.browser_authenticated_session?.exercised_at,
    evidence.idv_human_review?.exercised_at,
    evidence.holder_possession_registered?.exercised_at,
    evidence.institutional_consent?.exercised_at,
  ].filter(Boolean) as string[];

  for (const iso of sections) {
    const exercisedMs = parseMs(iso);
    if (exercisedMs === null || exercisedMs > nowMs + CLOCK_SKEW_MS) return false;
    if (exercisedMs > recordedMs + CLOCK_SKEW_MS) return false;
  }
  return true;
}

function environmentMatches(evidence: StagingExecutionEvidenceV1, env: Record<string, string | undefined>): boolean {
  const expected = env[STAGING_ENVIRONMENT_ID_ENV]?.trim();
  const actual = evidence.staging_environment_id?.trim();
  return Boolean(expected && actual && expected === actual);
}

export function assessStagingExecutionEvidenceIntegrity(input: {
  evidence: StagingExecutionEvidenceV1;
  env: Record<string, string | undefined>;
  corroboration: EvidenceCorroborationSnapshot | null;
  nowMs?: number;
}): StagingEvidenceIntegrityResult {
  const nowMs = input.nowMs ?? Date.now();
  const failure_codes: string[] = [];
  const push = (code: string) => {
    if (!failure_codes.includes(code)) failure_codes.push(code);
  };

  const timestamps_valid = validateEvidenceTimestamps(input.evidence, nowMs);
  if (!timestamps_valid) push("staging_evidence_timestamps_invalid");

  const environment_match = environmentMatches(input.evidence, input.env);
  if (!environment_match) push("staging_evidence_environment_mismatch");

  const secret = input.env[STAGING_EVIDENCE_APPROVAL_SECRET_ENV]?.trim();
  const founder_approval_valid = secret ? verifyFounderApprovalHmac(input.evidence, secret) : true;
  if (secret && !founder_approval_valid) push("staging_evidence_founder_approval_invalid");

  const holderSubject = input.evidence.holder_subject_id?.trim();
  if (!holderSubject) push("staging_evidence_holder_subject_missing");

  const baseBlocked = !timestamps_valid || !environment_match || !founder_approval_valid || !holderSubject;

  const browserSection = input.evidence.browser_authenticated_session;
  let browser: EvidenceClaimVerdict = { status: "absent" };
  if (browserSection) {
    if (baseBlocked || !input.corroboration) {
      browser = { status: "blocked_founder", code: "staging_evidence_browser_uncorroborated" };
      push("staging_evidence_browser_uncorroborated");
    } else if (!input.corroboration.holder_subject_exists) {
      browser = { status: "uncorroborated", code: "staging_evidence_holder_subject_not_found" };
      push("staging_evidence_holder_subject_not_found");
    } else if (
      browserSection.method === "google_zklogin"
      && !input.corroboration.holder_zklogin_binding
    ) {
      browser = { status: "uncorroborated", code: "staging_evidence_zklogin_binding_missing" };
      push("staging_evidence_zklogin_binding_missing");
    } else if (
      (browserSection.method === "evm_wallet" || browserSection.method === "solana_wallet")
      && !input.corroboration.holder_wallet_binding
    ) {
      browser = { status: "uncorroborated", code: "staging_evidence_wallet_binding_missing" };
      push("staging_evidence_wallet_binding_missing");
    } else {
      browser = { status: "verified" };
    }
  }

  let idv_review: EvidenceClaimVerdict = { status: "absent" };
  if (input.evidence.idv_human_review) {
    const row = input.corroboration?.idv_row ?? null;
    if (baseBlocked || !input.corroboration) {
      idv_review = { status: "blocked_founder", code: "staging_evidence_idv_uncorroborated" };
      push("staging_evidence_idv_uncorroborated");
    } else if (!row) {
      idv_review = { status: "uncorroborated", code: "staging_evidence_idv_record_not_found" };
      push("staging_evidence_idv_record_not_found");
    } else if (row.holder_subject_id?.trim() !== holderSubject) {
      idv_review = { status: "uncorroborated", code: "staging_evidence_idv_subject_mismatch" };
      push("staging_evidence_idv_subject_mismatch");
    } else if (!isAuthoritativeFinalApproval(row)) {
      idv_review = { status: "uncorroborated", code: "staging_evidence_idv_not_authoritative" };
      push("staging_evidence_idv_not_authoritative");
    } else {
      idv_review = { status: "verified" };
    }
  }

  let possession: EvidenceClaimVerdict = { status: "absent" };
  if (input.evidence.holder_possession_registered) {
    const updatedAt = input.corroboration?.possession_updated_at ?? null;
    const exercisedMs = parseMs(input.evidence.holder_possession_registered.exercised_at);
    const possessionMs = updatedAt ? parseMs(updatedAt) : null;
    if (baseBlocked || !input.corroboration) {
      possession = { status: "blocked_founder", code: "staging_evidence_possession_uncorroborated" };
      push("staging_evidence_possession_uncorroborated");
    } else if (!updatedAt || possessionMs === null) {
      possession = { status: "uncorroborated", code: "staging_evidence_possession_not_found" };
      push("staging_evidence_possession_not_found");
    } else if (possessionMs > (exercisedMs ?? 0) + CLOCK_SKEW_MS) {
      possession = { status: "uncorroborated", code: "staging_evidence_possession_timestamp_mismatch" };
      push("staging_evidence_possession_timestamp_mismatch");
    } else {
      possession = { status: "verified" };
    }
  }

  return {
    environment_match,
    timestamps_valid,
    founder_approval_valid,
    browser,
    idv_review,
    possession,
    failure_codes,
  };
}
