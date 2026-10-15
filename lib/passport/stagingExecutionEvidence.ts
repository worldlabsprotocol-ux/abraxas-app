// FILE: lib/passport/stagingExecutionEvidence.ts
// Founder supplied execution evidence for staging activation (not integration tests).

export const STAGING_EXECUTION_EVIDENCE_SCHEMA = "abraxas.staging_execution_evidence/v1" as const;

export const STAGING_EXECUTION_EVIDENCE_JSON_ENV = "ABRAXAS_STAGING_EXECUTION_EVIDENCE_JSON";
export const STAGING_EXECUTION_EVIDENCE_PATH_ENV = "ABRAXAS_STAGING_EXECUTION_EVIDENCE_PATH";

export type StagingBrowserAuthMethod = "google_zklogin" | "evm_wallet" | "solana_wallet";

export type StagingExecutionEvidenceV1 = {
  schema_version: typeof STAGING_EXECUTION_EVIDENCE_SCHEMA;
  recorded_at: string;
  /** Must match ABRAXAS_STAGING_ENVIRONMENT_ID on the staging host running the audit. */
  staging_environment_id: string;
  /** Holder subject bound to every corroborated execution claim. */
  holder_subject_id: string;
  /** Optional HMAC-SHA256 (base64url) over evidence payload when approval secret is configured. */
  founder_approval_hmac?: string;
  browser_authenticated_session?: {
    method: StagingBrowserAuthMethod;
    exercised_at: string;
    session_ref?: string;
  };
  idv_human_review?: {
    exercised_at: string;
    approval_authority: "founder_operator";
    verification_record_ref: string;
  };
  holder_possession_registered?: {
    exercised_at: string;
    possession_ref?: string;
  };
  institutional_consent?: {
    exercised_at: string;
    partner_ids: string[];
  };
};

export type ParseStagingExecutionEvidenceResult =
  | { ok: true; evidence: StagingExecutionEvidenceV1 }
  | { ok: false; code: string };

function isIsoTimestamp(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isBrowserMethod(value: unknown): value is StagingBrowserAuthMethod {
  return value === "google_zklogin" || value === "evm_wallet" || value === "solana_wallet";
}

export function parseStagingExecutionEvidence(raw: unknown): ParseStagingExecutionEvidenceResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, code: "staging_evidence_invalid" };
  }
  const row = raw as Record<string, unknown>;
  if (row.schema_version !== STAGING_EXECUTION_EVIDENCE_SCHEMA) {
    return { ok: false, code: "staging_evidence_schema_mismatch" };
  }
  if (!isIsoTimestamp(row.recorded_at)) {
    return { ok: false, code: "staging_evidence_recorded_at_invalid" };
  }
  const staging_environment_id =
    typeof row.staging_environment_id === "string" ? row.staging_environment_id.trim() : "";
  const holder_subject_id = typeof row.holder_subject_id === "string" ? row.holder_subject_id.trim() : "";
  if (!staging_environment_id) {
    return { ok: false, code: "staging_evidence_environment_missing" };
  }
  if (!holder_subject_id) {
    return { ok: false, code: "staging_evidence_holder_subject_missing" };
  }

  const evidence: StagingExecutionEvidenceV1 = {
    schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
    recorded_at: row.recorded_at as string,
    staging_environment_id,
    holder_subject_id,
    founder_approval_hmac:
      typeof row.founder_approval_hmac === "string" ? row.founder_approval_hmac.trim() : undefined,
  };

  if (row.browser_authenticated_session !== undefined) {
    const session = row.browser_authenticated_session;
    if (!session || typeof session !== "object" || Array.isArray(session)) {
      return { ok: false, code: "staging_evidence_browser_session_invalid" };
    }
    const s = session as Record<string, unknown>;
    if (!isBrowserMethod(s.method) || !isIsoTimestamp(s.exercised_at)) {
      return { ok: false, code: "staging_evidence_browser_session_invalid" };
    }
    evidence.browser_authenticated_session = {
      method: s.method,
      exercised_at: s.exercised_at as string,
      session_ref: typeof s.session_ref === "string" ? s.session_ref.trim() : undefined,
    };
  }

  if (row.idv_human_review !== undefined) {
    const review = row.idv_human_review;
    if (!review || typeof review !== "object" || Array.isArray(review)) {
      return { ok: false, code: "staging_evidence_idv_review_invalid" };
    }
    const r = review as Record<string, unknown>;
    if (
      r.approval_authority !== "founder_operator"
      || !isIsoTimestamp(r.exercised_at)
      || typeof r.verification_record_ref !== "string"
      || !r.verification_record_ref.trim()
    ) {
      return { ok: false, code: "staging_evidence_idv_review_invalid" };
    }
    evidence.idv_human_review = {
      exercised_at: r.exercised_at as string,
      approval_authority: "founder_operator",
      verification_record_ref: r.verification_record_ref.trim(),
    };
  }

  if (row.holder_possession_registered !== undefined) {
    const possession = row.holder_possession_registered;
    if (!possession || typeof possession !== "object" || Array.isArray(possession)) {
      return { ok: false, code: "staging_evidence_possession_invalid" };
    }
    const p = possession as Record<string, unknown>;
    if (!isIsoTimestamp(p.exercised_at)) {
      return { ok: false, code: "staging_evidence_possession_invalid" };
    }
    evidence.holder_possession_registered = {
      exercised_at: p.exercised_at as string,
      possession_ref: typeof p.possession_ref === "string" ? p.possession_ref.trim() : undefined,
    };
  }

  if (row.institutional_consent !== undefined) {
    const consent = row.institutional_consent;
    if (!consent || typeof consent !== "object" || Array.isArray(consent)) {
      return { ok: false, code: "staging_evidence_consent_invalid" };
    }
    const c = consent as Record<string, unknown>;
    if (!isIsoTimestamp(c.exercised_at) || !Array.isArray(c.partner_ids) || c.partner_ids.length === 0) {
      return { ok: false, code: "staging_evidence_consent_invalid" };
    }
    const partner_ids = c.partner_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
    if (partner_ids.length === 0) {
      return { ok: false, code: "staging_evidence_consent_invalid" };
    }
    evidence.institutional_consent = {
      exercised_at: c.exercised_at as string,
      partner_ids,
    };
  }

  return { ok: true, evidence };
}

export function loadStagingExecutionEvidenceFromEnv(
  env: Record<string, string | undefined>,
  readFile: (path: string) => string,
): ParseStagingExecutionEvidenceResult {
  const inline = env[STAGING_EXECUTION_EVIDENCE_JSON_ENV]?.trim();
  if (inline) {
    try {
      return parseStagingExecutionEvidence(JSON.parse(inline));
    } catch {
      return { ok: false, code: "staging_evidence_json_parse_failed" };
    }
  }
  const path = env[STAGING_EXECUTION_EVIDENCE_PATH_ENV]?.trim();
  if (path) {
    try {
      return parseStagingExecutionEvidence(JSON.parse(readFile(path)));
    } catch {
      return { ok: false, code: "staging_evidence_file_unreadable" };
    }
  }
  return { ok: false, code: "staging_evidence_absent" };
}
