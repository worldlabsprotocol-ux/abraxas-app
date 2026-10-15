// FILE: lib/passport/stagingExecutionEvidenceIntegrity.test.ts

import { describe, expect, it } from "vitest";
import {
  assessStagingExecutionEvidenceIntegrity,
  computeFounderApprovalHmac,
  STAGING_ENVIRONMENT_ID_ENV,
  STAGING_EVIDENCE_APPROVAL_SECRET_ENV,
} from "./stagingExecutionEvidenceIntegrity";
import { STAGING_EXECUTION_EVIDENCE_SCHEMA } from "./stagingExecutionEvidence";

const NOW = Date.parse("2026-10-15T12:00:00.000Z");

function baseEvidence() {
  return {
    schema_version: STAGING_EXECUTION_EVIDENCE_SCHEMA,
    recorded_at: "2026-10-15T11:00:00.000Z",
    staging_environment_id: "staging-west-1",
    holder_subject_id: "abx_hs_test_subject",
    browser_authenticated_session: {
      method: "evm_wallet" as const,
      exercised_at: "2026-10-15T10:30:00.000Z",
    },
    idv_human_review: {
      exercised_at: "2026-10-15T10:45:00.000Z",
      approval_authority: "founder_operator" as const,
      verification_record_ref: "idv-record-1",
    },
    holder_possession_registered: {
      exercised_at: "2026-10-15T10:50:00.000Z",
    },
  };
}

describe("staging execution evidence integrity", () => {
  it("rejects fabricated evidence without authoritative corroboration", () => {
    const result = assessStagingExecutionEvidenceIntegrity({
      evidence: baseEvidence(),
      env: { [STAGING_ENVIRONMENT_ID_ENV]: "staging-west-1" },
      corroboration: {
        holder_subject_exists: false,
        holder_wallet_binding: false,
        holder_zklogin_binding: false,
        idv_row: null,
        possession_updated_at: null,
      },
      nowMs: NOW,
    });
    expect(result.browser.status).not.toBe("verified");
    expect(result.idv_review.status).not.toBe("verified");
    expect(result.possession.status).not.toBe("verified");
    expect(result.failure_codes).toContain("staging_evidence_holder_subject_not_found");
  });

  it("rejects environment mismatch for plausible evidence", () => {
    const result = assessStagingExecutionEvidenceIntegrity({
      evidence: baseEvidence(),
      env: { [STAGING_ENVIRONMENT_ID_ENV]: "production-east-1" },
      corroboration: null,
      nowMs: NOW,
    });
    expect(result.environment_match).toBe(false);
    expect(result.failure_codes).toContain("staging_evidence_environment_mismatch");
  });

  it("requires founder approval hmac when approval secret is configured", () => {
    const evidence = baseEvidence();
    const env = {
      [STAGING_ENVIRONMENT_ID_ENV]: "staging-west-1",
      [STAGING_EVIDENCE_APPROVAL_SECRET_ENV]: "founder-only-secret",
    };
    const withoutHmac = assessStagingExecutionEvidenceIntegrity({
      evidence,
      env,
      corroboration: null,
      nowMs: NOW,
    });
    expect(withoutHmac.founder_approval_valid).toBe(false);

    const signed = {
      ...evidence,
      founder_approval_hmac: computeFounderApprovalHmac(evidence, env[STAGING_EVIDENCE_APPROVAL_SECRET_ENV]!),
    };
    const withHmac = assessStagingExecutionEvidenceIntegrity({
      evidence: signed,
      env,
      corroboration: {
        holder_subject_exists: true,
        holder_wallet_binding: true,
        holder_zklogin_binding: false,
        idv_row: {
          holder_subject_id: "abx_hs_test_subject",
          status: "approved",
          identity_verification_status: "approved",
          credential_status: "active",
          credential_jti: "jti-1",
          credential_issued_at: "2026-10-15T10:40:00.000Z",
          document_verified: true,
          liveness_passed: true,
        },
        possession_updated_at: "2026-10-15T10:49:00.000Z",
      },
      nowMs: NOW,
    });
    expect(withHmac.founder_approval_valid).toBe(true);
    expect(withHmac.browser.status).toBe("verified");
    expect(withHmac.idv_review.status).toBe("verified");
    expect(withHmac.possession.status).toBe("verified");
  });
});
