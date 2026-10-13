// FILE: lib/institutionalCertification/build549/contract.ts

import type { CertificationVerdict, CertificationObservationClass } from "@/lib/institutionalCertification/build546/contract";

export const BUILD_549_CERTIFICATION_VERSION = "1.0.0" as const;

export interface Build549EnvironmentIdentity {
  staging_url_redacted: string;
  expected_supabase_ref: string;
  deployed_commit_sha_prefix: string | null;
  agent_certification_commit_sha: string;
  deployment_environment: string | null;
  vercel_protection_configured: boolean;
}

export interface Build549LiveCaseEvidence {
  test_id: string;
  observation_class: CertificationObservationClass;
  environment_identity: string;
  deployment_commit: string | null;
  partner_application_id: string | null;
  policy_id: string | null;
  synthetic_holder_ref: string | null;
  receipt_id: string | null;
  request_correlation_id: string | null;
  issuer_key_reference: string | null;
  verification_timestamp: string;
  observed_response_status: string | null;
  expected_outcome: string;
  actual_outcome: string;
  cryptographic_authenticity: CertificationVerdict | "not_evaluated";
  current_authorization: CertificationVerdict | "not_evaluated";
  replay_consumption_outcome: string | null;
  audit_persistence_outcome: string | null;
  evidence_location: string[];
  verdict: CertificationVerdict;
  detail: string;
}

export interface Build549LatencyBlock {
  samples: number;
  verify_ms: { p50: number; p95: number; max: number };
  current_validity_ms: { p50: number; p95: number; max: number };
  durable_consumption_ms: { p50: number; p95: number; max: number };
  rp_decision_ms: { p50: number; p95: number; max: number };
}

export interface Build549CertificationReport {
  certification_version: typeof BUILD_549_CERTIFICATION_VERSION;
  build: "549";
  title: "Live institutional partner certification";
  generated_at: string;
  commit_sha: string;
  extends_builds: ["546", "547", "548"];
  environment: Build549EnvironmentIdentity;
  prerequisite_audit: {
    configured: string[];
    missing: string[];
    operator_required: string[];
  };
  live_integration: {
    holder_to_receipt_to_rp: CertificationVerdict;
    detail: string;
  };
  independent_verification: {
    verdict: CertificationVerdict;
    detail: string;
  };
  durable_replay: {
    verdict: CertificationVerdict;
    detail: string;
  };
  supabase_independence: {
    verdict: "pass" | "fail" | "blocked";
    detail: string;
  };
  latency: Build549LatencyBlock;
  cases: Build549LiveCaseEvidence[];
  institutional_controls_certified: string[];
  summary: {
    pass: number;
    fail: number;
    blocked: number;
    code_merge_ready: boolean;
    live_institutional_certification: CertificationVerdict;
  };
  blockers: string[];
  disclaimer: string;
}

export const BUILD_549_DISCLAIMER =
  "Build #549 records observed staging integration where authorized. BLOCKED cases are not failures of local cryptographic harnesses. " +
  "Never substitute fixture grants for live partner responses. Minimal disclosure — no holder PII in this report.";
