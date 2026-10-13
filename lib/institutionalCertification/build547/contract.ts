// FILE: lib/institutionalCertification/build547/contract.ts

import type { CertificationCaseResult, CertificationVerdict } from "@/lib/institutionalCertification/build546/contract";

export const BUILD_547_CERTIFICATION_VERSION = "1.0.0" as const;

export interface Build547LatencySample {
  request_id: string;
  observed_at: string;
  verify_ms: number;
  rp_decide_ms: number;
  cryptographically_authentic: boolean;
  currently_authorizable: boolean;
  verdict: string;
}

export interface Build547CertificationReport {
  certification_version: typeof BUILD_547_CERTIFICATION_VERSION;
  build: "547";
  title: "Live partner verification certification";
  generated_at: string;
  commit_sha: string;
  extends_build: "546";
  environment: {
    node: string;
    observation_default: "local_simulated" | "live_staging";
  };
  dependency_limitations: string[];
  supabase_independence: {
    verifier_runs_without_supabase: true;
    external_rp_runs_without_supabase: true;
    consumption_store: "filesystem_atomic_wx";
    live_authenticated_holder_journey: CertificationVerdict;
    detail: string;
  };
  latency: {
    samples: number;
    verify_ms: { p50: number; p95: number; max: number };
    rp_decide_ms: { p50: number; p95: number; max: number };
  };
  cases: CertificationCaseResult[];
  evidence_records: Array<{
    test_id: string;
    request_ids: string[];
    consumption_ids?: string[];
    observed_at: string[];
    outcomes: string[];
  }>;
  summary: {
    pass: number;
    fail: number;
    blocked: number;
    ready_for_institutional_merge_review: boolean;
  };
  disclaimer: string;
}

export const BUILD_547_DISCLAIMER =
  "Build #547 extends Build #546 with durable consumption and live-boundary probes. " +
  "Local filesystem durability is not multi-region production persistence. " +
  "Blocked live holder journeys are not failures of cryptographic verification.";
