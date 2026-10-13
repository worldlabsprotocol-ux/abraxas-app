// FILE: lib/institutionalCertification/build546/contract.ts
// Build #546 — machine-readable institutional certification contract.

export const BUILD_546_CERTIFICATION_VERSION = "1.0.0" as const;

export type CertificationVerdict = "pass" | "fail" | "blocked";

export type CertificationObservationClass = "local_simulated" | "live_staging" | "live_devnet";

export interface CertificationCaseResult {
  test_id: string;
  threat_or_property: string;
  expected_behavior: string;
  observed_behavior: string;
  verification_evidence: string[];
  verdict: CertificationVerdict;
  observation_class: CertificationObservationClass;
  failure_codes?: string[];
}

export interface Build546CertificationReport {
  certification_version: typeof BUILD_546_CERTIFICATION_VERSION;
  build: "546";
  title: "Independent verification and institutional partner certification";
  generated_at: string;
  commit_sha: string;
  environment: {
    node: string;
    observation_default: CertificationObservationClass;
  };
  architecture_summary_ref: "docs/build-546/TRUST_ARCHITECTURE_AUDIT.md";
  dependency_limitations: string[];
  supabase_independence: {
    offline_verifier_runs_without_supabase: boolean;
    external_relying_party_runs_without_supabase: boolean;
    live_staging_holder_flow: CertificationVerdict;
    detail: string;
  };
  cases: CertificationCaseResult[];
  summary: {
    pass: number;
    fail: number;
    blocked: number;
    ready_for_institutional_merge_review: boolean;
  };
  disclaimer: string;
}

export const BUILD_546_DISCLAIMER =
  "Passing local simulated adversarial tests demonstrates cryptographic and contract behavior against fixtures. " +
  "They are not institutional production certification, legal sufficiency, or live third-party audit attestation.";
