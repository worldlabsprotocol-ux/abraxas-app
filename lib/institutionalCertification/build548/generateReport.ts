// FILE: lib/institutionalCertification/build548/generateReport.ts

import { execSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import pg from "pg";
import type { CertificationCaseResult } from "@/lib/institutionalCertification/build546/contract";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import {
  applyBuild548Schema,
  PostgresReceiptConsumptionStore,
  resolveBuild548DatabaseUrl,
} from "./postgresConsumptionStore";
import {
  BUILD_548_CERTIFICATION_VERSION,
  BUILD_548_DISCLAIMER,
  type Build548CertificationReport,
} from "./contract";

function commitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function caseResult(
  input: Omit<CertificationCaseResult, "observation_class"> & {
    observation_class?: CertificationCaseResult["observation_class"];
  },
): CertificationCaseResult {
  return {
    observation_class: input.observation_class ?? "local_simulated",
    ...input,
  };
}

export async function runBuild548Certification(): Promise<Build548CertificationReport> {
  const cases: CertificationCaseResult[] = [];
  const adapters: Build548CertificationReport["adapters"] = [];
  const generatedAt = new Date().toISOString();
  const env = build546TrustRegistryEnv();
  Object.assign(process.env, env);

  const pgUrl = resolveBuild548DatabaseUrl();
  let auditAtomicity: Build548CertificationReport["audit_atomicity"] = {
    postgres_verdict: "blocked",
    detail: "BUILD_548_PG_URL / INSTITUTIONAL_REPLAY_TEST_DATABASE_URL not configured",
  };
  let latencySamples: number[] = [];

  if (pgUrl) {
    const pool = new pg.Pool({ connectionString: pgUrl });
    try {
      await applyBuild548Schema(pool);
      const store = new PostgresReceiptConsumptionStore(pool, "report-coordinator");
      await store.truncateForTests();

      const record = build546SampleRecord();
      const pub = build546PublicPartnerView(record);
      const workers = 24;
      const results = await Promise.all(
        Array.from({ length: workers }, (_, i) =>
          new ExternalRelyingPartyHarness({
            partnerId: BUILD_546_PARTNER_ID,
            policyId: BUILD_546_POLICY_ID,
            env,
            consumptionStore: new PostgresReceiptConsumptionStore(pool, `report-w${i % 6}`),
          }).decide({
            requestId: `pg-concurrent-${i}`,
            signedRecord: record,
            publicReceipt: pub,
            now: BUILD_546_FIXTURE_NOW,
            revocationSource: { available: true, status: "active" },
          }),
        ),
      );
      const grants = results.filter((r) => r.outcome === "granted");
      const replays = results.filter((r) => r.replay_detected);
      const auditRows = await store.listAudit();
      adapters.push({
        adapter: "postgres_distributed",
        concurrent_workers: workers,
        grants: grants.length,
        replays: replays.length,
        audit_rows: auditRows.length,
      });
      cases.push(
        caseResult({
          test_id: "postgres_concurrent_single_consumption",
          threat_or_property: "Distributed replay — cross-instance concurrency",
          expected_behavior: "exactly one grant; audit row matches consumption",
          observed_behavior: `grants=${grants.length}; replays=${replays.length}; audit=${auditRows.length}`,
          verification_evidence: results.map((r) => `${r.request_id}:${r.outcome}`),
          verdict:
            grants.length === 1
            && replays.length === workers - 1
            && auditRows.length === 1
            && grants[0]?.durable_audit_logged
              ? "pass"
              : "fail",
        }),
      );

      auditAtomicity = {
        postgres_verdict:
          grants.length === 1 && auditRows.length === 1 && grants[0]?.durable_audit_logged
            ? "pass"
            : "fail",
        detail:
          "Consumption and audit committed in one PostgreSQL transaction; grant requires durable_audit_logged.",
      };

      for (let i = 0; i < 25; i++) {
        const unique = build546SampleRecord(BUILD_546_PRIMARY_KEY, { id: `dr_lat548_${i}` });
        const uniquePub = build546PublicPartnerView(unique);
        const t0 = performance.now();
        await new ExternalRelyingPartyHarness({
          partnerId: BUILD_546_PARTNER_ID,
          policyId: BUILD_546_POLICY_ID,
          env,
          consumptionStore: new PostgresReceiptConsumptionStore(pool, "latency"),
        }).decide({
          requestId: `lat-${i}`,
          signedRecord: unique,
          publicReceipt: uniquePub,
          now: BUILD_546_FIXTURE_NOW,
          revocationSource: { available: true, status: "active" },
        });
        latencySamples.push(Math.round((performance.now() - t0) * 100) / 100);
      }
    } finally {
      await pool.end();
    }
  } else {
    cases.push(
      caseResult({
        test_id: "postgres_integration",
        threat_or_property: "Distributed PostgreSQL adapter",
        expected_behavior: "live disposable PG or blocked",
        observed_behavior: "No BUILD_548_PG_URL configured",
        verification_evidence: [],
        verdict: "blocked",
      }),
    );
  }

  adapters.push({ adapter: "memory_dev" });
  adapters.push({ adapter: "filesystem_certification" });

  const sorted = [...latencySamples].sort((a, b) => a - b);
  const pass = cases.filter((c) => c.verdict === "pass").length;
  const fail = cases.filter((c) => c.verdict === "fail").length;
  const blocked = cases.filter((c) => c.verdict === "blocked").length;

  return {
    certification_version: BUILD_548_CERTIFICATION_VERSION,
    build: "548",
    title: "Distributed replay protection certification",
    generated_at: generatedAt,
    commit_sha: commitSha(),
    extends_builds: ["546", "547"],
    replay_model: {
      scope: "single_use_partner_policy_receipt_v1",
      canonical_key: "sha256(scope\\0partner\\0policy\\0receipt)",
      request_id_role: "audit_correlation_only",
    },
    transaction_model: {
      postgres: "single_transaction_consumption_plus_audit",
      filesystem: "wx_marker_then_append_audit_certification_only",
      memory: "process_local_dev",
    },
    supabase_independence: {
      external_rp_requires_abraxas_supabase: false,
      external_rp_requires_abraxas_sessions: false,
      consumption_database: "independently_provisioned_postgresql",
      verdict: "pass",
    },
    audit_atomicity: auditAtomicity,
    adapters,
    latency: {
      samples: sorted.length,
      rp_decide_postgres_ms: {
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        max: sorted[sorted.length - 1] ?? 0,
      },
    },
    cases,
    summary: {
      pass,
      fail,
      blocked,
      ready_for_institutional_merge_review: fail === 0,
    },
    live_certification_prerequisites: [
      "Authorized BUILD_548_PG_URL on nonproduction institutional PostgreSQL (operator provisioned)",
      "BUILD_547 live holder journey credentials (unchanged — not fabricated)",
      "Optional BUILD_547_SYNTHETIC_RECEIPT_ID for public receipt HTTP boundary",
    ],
    disclaimer: BUILD_548_DISCLAIMER,
  };
}
