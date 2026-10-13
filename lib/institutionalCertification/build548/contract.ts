// FILE: lib/institutionalCertification/build548/contract.ts

import type { CertificationCaseResult } from "@/lib/institutionalCertification/build546/contract";
import type { ConsumptionAssuranceLevel } from "./consumptionContract";

export const BUILD_548_CERTIFICATION_VERSION = "1.0.0" as const;

export interface Build548AdapterEvidence {
  adapter: ConsumptionAssuranceLevel;
  concurrent_workers?: number;
  grants?: number;
  replays?: number;
  audit_rows?: number;
}

export interface Build548CertificationReport {
  certification_version: typeof BUILD_548_CERTIFICATION_VERSION;
  build: "548";
  title: "Distributed replay protection certification";
  generated_at: string;
  commit_sha: string;
  extends_builds: ["546", "547"];
  replay_model: {
    scope: "single_use_partner_policy_receipt_v1";
    canonical_key: "sha256(scope\\0partner\\0policy\\0receipt)";
    request_id_role: "audit_correlation_only";
  };
  transaction_model: {
    postgres: "single_transaction_consumption_plus_audit";
    filesystem: "wx_marker_then_append_audit_certification_only";
    memory: "process_local_dev";
  };
  supabase_independence: {
    external_rp_requires_abraxas_supabase: false;
    external_rp_requires_abraxas_sessions: false;
    consumption_database: "independently_provisioned_postgresql";
    verdict: "pass";
  };
  audit_atomicity: {
    postgres_verdict: "pass" | "blocked" | "fail";
    detail: string;
  };
  adapters: Build548AdapterEvidence[];
  latency: {
    samples: number;
    rp_decide_postgres_ms: { p50: number; p95: number; max: number };
  };
  cases: CertificationCaseResult[];
  summary: {
    pass: number;
    fail: number;
    blocked: number;
    ready_for_institutional_merge_review: boolean;
  };
  live_certification_prerequisites: string[];
  disclaimer: string;
}

export const BUILD_548_DISCLAIMER =
  "Build #548 adds distributed PostgreSQL replay protection for external relying parties. " +
  "Memory and filesystem adapters remain for dev/certification assurance tiers only. " +
  "Do not point BUILD_548_PG_URL at Abraxas production or historical demo Supabase.";
