// FILE: lib/institutionalCertification/build547/generateReport.ts

import { execSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import type { CertificationCaseResult } from "@/lib/institutionalCertification/build546/contract";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
  BUILD_546_PRIMARY_KEY,
} from "@/lib/institutionalCertification/build546/fixtures";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { FileReceiptConsumptionStore } from "./receiptConsumptionStore";
import {
  BUILD_547_CERTIFICATION_VERSION,
  BUILD_547_DISCLAIMER,
  type Build547CertificationReport,
  type Build547LatencySample,
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

async function measureLatency(env: Record<string, string>, samples = 40): Promise<Build547LatencySample[]> {
  const record = build546SampleRecord();
  const pub = build546PublicPartnerView(record);
  const storeDir = await mkdtemp(join(tmpdir(), "abx-latency-"));
  const rp = new ExternalRelyingPartyHarness({
    partnerId: BUILD_546_PARTNER_ID,
    policyId: BUILD_546_POLICY_ID,
    env,
    consumptionStore: new FileReceiptConsumptionStore(storeDir, "latency"),
  });

  const out: Build547LatencySample[] = [];
  for (let i = 0; i < samples; i++) {
    const requestId = `latency-${i}-${Date.now()}`;
    const uniqueRecord = build546SampleRecord(BUILD_546_PRIMARY_KEY, { id: `dr_lat_${i}` });
    const uniquePub = build546PublicPartnerView(uniqueRecord);
    const t0 = performance.now();
    const verifier = verifyReceiptIndependently({
      signedRecord: uniqueRecord,
      publicReceipt: uniquePub,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    const t1 = performance.now();
    await rp.decide({
      requestId,
      signedRecord: uniqueRecord,
      publicReceipt: uniquePub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    const t2 = performance.now();
    out.push({
      request_id: requestId,
      observed_at: new Date().toISOString(),
      verify_ms: Math.round((t1 - t0) * 100) / 100,
      rp_decide_ms: Math.round((t2 - t1) * 100) / 100,
      cryptographically_authentic: verifier.cryptographically_authentic,
      currently_authorizable: verifier.currently_authorizable,
      verdict: verifier.verdict,
    });
  }
  await rm(storeDir, { recursive: true, force: true });
  return out;
}

export async function runBuild547Certification(): Promise<Build547CertificationReport> {
  const env = build546TrustRegistryEnv();
  Object.assign(process.env, env);
  const cases: CertificationCaseResult[] = [];
  const evidenceRecords: Build547CertificationReport["evidence_records"] = [];
  const generatedAt = new Date().toISOString();

  const storeDir = await mkdtemp(join(tmpdir(), "abx-build547-report-"));
  const store = new FileReceiptConsumptionStore(storeDir, "report-primary");
  const rp = new ExternalRelyingPartyHarness({
    partnerId: BUILD_546_PARTNER_ID,
    policyId: BUILD_546_POLICY_ID,
    env,
    consumptionStore: store,
  });

  const record = build546SampleRecord();
  const pub = build546PublicPartnerView(record);

  const concurrent = await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      rp.decide({
        requestId: `report-concurrent-${i}`,
        signedRecord: record,
        publicReceipt: pub,
        now: BUILD_546_FIXTURE_NOW,
        revocationSource: { available: true, status: "active" },
      }),
    ),
  );
  const grants = concurrent.filter((c) => c.outcome === "granted");
  cases.push(
    caseResult({
      test_id: "durable_concurrent_single_use",
      threat_or_property: "Atomic replay protection under concurrent RP decisions",
      expected_behavior: "exactly one grant, others replay denied",
      observed_behavior: `grants=${grants.length}; replays=${concurrent.filter((c) => c.replay_detected).length}`,
      verification_evidence: concurrent.map((c) => `${c.request_id}:${c.outcome}`),
      verdict: grants.length === 1 && concurrent.filter((c) => c.replay_detected).length === 15 ? "pass" : "fail",
    }),
  );
  evidenceRecords.push({
    test_id: "durable_concurrent_single_use",
    request_ids: concurrent.map((c) => c.request_id),
    consumption_ids: concurrent.map((c) => c.consumption_id).filter(Boolean) as string[],
    observed_at: concurrent.map((c) => c.at),
    outcomes: concurrent.map((c) => c.outcome),
    authorization_verified: concurrent.map((c) => c.authorization_verified),
    durable_consumption_marker: concurrent.map((c) => c.durable_consumption_marker),
    durable_audit_logged: concurrent.map((c) => c.durable_audit_logged),
  });

  const restartRp = new ExternalRelyingPartyHarness({
    partnerId: BUILD_546_PARTNER_ID,
    policyId: BUILD_546_POLICY_ID,
    env,
    consumptionStore: new FileReceiptConsumptionStore(storeDir, "report-restarted"),
  });
  const restartReplay = await restartRp.decide({
    requestId: "report-restart-replay",
    signedRecord: record,
    publicReceipt: pub,
    now: BUILD_546_FIXTURE_NOW,
    revocationSource: { available: true, status: "active" },
  });
  cases.push(
    caseResult({
      test_id: "durable_process_restart_replay",
      threat_or_property: "Consumption survives new RP instance (restart)",
      expected_behavior: "deny replay with replay_detected",
      observed_behavior: `${restartReplay.outcome}; replay=${restartReplay.replay_detected}`,
      verification_evidence: [restartReplay.request_id],
      verdict: restartReplay.replay_detected && restartReplay.outcome === "denied" ? "pass" : "fail",
    }),
  );

  const stale = verifyReceiptIndependently({
    signedRecord: record,
    publicReceipt: pub,
    expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
    now: BUILD_546_FIXTURE_NOW,
    env,
  });
  cases.push(
    caseResult({
      test_id: "supabase_free_verifier_fail_closed",
      threat_or_property: "Verifier without Supabase or revocation feed",
      expected_behavior: "blocked; crypto true; current false",
      observed_behavior: `verdict=${stale.verdict}; crypto=${stale.cryptographically_authentic}; current=${stale.currently_authorizable}`,
      verification_evidence: stale.failure_codes,
      verdict:
        stale.verdict === "blocked"
        && stale.cryptographically_authentic
        && !stale.currently_authorizable
          ? "pass"
          : "fail",
    }),
  );

  const latencySamples = await measureLatency(env, 30);
  const verifyMs = latencySamples.map((s) => s.verify_ms).sort((a, b) => a - b);
  const decideMs = latencySamples.map((s) => s.rp_decide_ms).sort((a, b) => a - b);

  await rm(storeDir, { recursive: true, force: true });

  const pass = cases.filter((c) => c.verdict === "pass").length;
  const fail = cases.filter((c) => c.verdict === "fail").length;
  const blocked = cases.filter((c) => c.verdict === "blocked").length;

  return {
    certification_version: BUILD_547_CERTIFICATION_VERSION,
    build: "547",
    title: "Live partner verification certification",
    generated_at: generatedAt,
    commit_sha: commitSha(),
    extends_build: "546",
    environment: {
      node: process.version,
      observation_default: "local_simulated",
    },
    dependency_limitations: [
      "Filesystem wx consumption markers simulate durable RP state; not HA multi-region storage.",
      "Live holder receipt fetch requires BUILD_547_SYNTHETIC_RECEIPT_ID and authorized staging (not fabricated).",
      "Build #546 adversarial matrix covers issuer rotation, policy, audience, chain vectors.",
    ],
    supabase_independence: {
      verifier_runs_without_supabase: true,
      external_rp_runs_without_supabase: true,
      consumption_store: "filesystem_atomic_wx",
      live_authenticated_holder_journey: "blocked",
      detail: "Independent verifier and durable RP operate on signed artifacts and local consumption store only.",
    },
    latency: {
      samples: latencySamples.length,
      verify_ms: {
        p50: percentile(verifyMs, 50),
        p95: percentile(verifyMs, 95),
        max: verifyMs[verifyMs.length - 1] ?? 0,
      },
      rp_decide_ms: {
        p50: percentile(decideMs, 50),
        p95: percentile(decideMs, 95),
        max: decideMs[decideMs.length - 1] ?? 0,
      },
    },
    cases,
    evidence_records: evidenceRecords,
    durability: {
      verdict: "certification_filesystem_atomic_wx",
      audit_recovery: "reconcile_from_markers_supported",
      production_grade_persistence: false,
      detail:
        "Single-use enforced via wx marker; audit.jsonl is append-only. Marker-without-audit denies permit and replays on retry; reconcileAuditFromMarkers backfills audit for certification recovery drills.",
    },
    summary: {
      pass,
      fail,
      blocked,
      ready_for_institutional_merge_review: fail === 0,
    },
    disclaimer: BUILD_547_DISCLAIMER,
  };
}
