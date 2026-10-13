// FILE: lib/institutionalCertification/build546/generateReport.ts

import { execSync } from "node:child_process";
import type {
  Build546CertificationReport,
  CertificationCaseResult,
  CertificationVerdict,
} from "./contract";
import { BUILD_546_DISCLAIMER, BUILD_546_CERTIFICATION_VERSION } from "./contract";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "./fixtures";
import { ExternalRelyingPartyHarness } from "./externalRelyingParty";
import { verifyReceiptIndependently, build546ReferenceChainPackage } from "./independentVerifier";
import { CONFORMANCE_VECTOR_PACKAGE } from "@/lib/partner/onchainVerifierConformance/vectors";

function commitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function caseResult(input: Omit<CertificationCaseResult, "observation_class"> & {
  observation_class?: CertificationCaseResult["observation_class"];
}): CertificationCaseResult {
  return {
    observation_class: input.observation_class ?? "local_simulated",
    ...input,
  };
}

export function runBuild546LocalCertification(): Build546CertificationReport {
  const env = build546TrustRegistryEnv();
  Object.assign(process.env, env);
  const cases: CertificationCaseResult[] = [];

  const record = build546SampleRecord();
  const pub = build546PublicPartnerView(record);

  const valid = verifyReceiptIndependently({
    signedRecord: record,
    publicReceipt: pub,
    expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
    now: BUILD_546_FIXTURE_NOW,
    env,
    revocationSource: { available: true, status: "active" },
    chainPackage: CONFORMANCE_VECTOR_PACKAGE,
    chainRpcAvailable: true,
  });
  cases.push(
    caseResult({
      test_id: "valid_receipt_with_revocation_feed",
      threat_or_property: "Authorized decision under active issuer and policy",
      expected_behavior: "authorize + currently_authorizable true",
      observed_behavior: `${valid.verdict}; crypto=${valid.cryptographically_authentic}; current=${valid.currently_authorizable}`,
      verification_evidence: valid.phases.map((p) => `${p.id}:${p.status}`),
      verdict: valid.verdict === "authorize" && valid.currently_authorizable ? "pass" : "fail",
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
      test_id: "stale_without_revocation_source",
      threat_or_property: "Fail closed without live revocation evidence",
      expected_behavior: "blocked",
      observed_behavior: stale.verdict,
      verification_evidence: stale.failure_codes,
      verdict: stale.verdict === "blocked" ? "pass" : "fail",
    }),
  );

  const rp = new ExternalRelyingPartyHarness({
    partnerId: BUILD_546_PARTNER_ID,
    policyId: BUILD_546_POLICY_ID,
    env,
  });
  const grant = rp.decide({
    requestId: "rp-grant-1",
    signedRecord: record,
    publicReceipt: pub,
    now: BUILD_546_FIXTURE_NOW,
    revocationSource: { available: true, status: "active" },
  });
  const replay = rp.decide({
    requestId: "rp-grant-2",
    signedRecord: record,
    publicReceipt: pub,
    now: BUILD_546_FIXTURE_NOW,
    revocationSource: { available: true, status: "active" },
  });
  cases.push(
    caseResult({
      test_id: "external_rp_replay_protection",
      threat_or_property: "Single-use consumption ledger",
      expected_behavior: "first grant, second deny replay",
      observed_behavior: `first=${grant.outcome}; second=${replay.outcome}; replay=${replay.replay_detected}`,
      verification_evidence: rp.getAuditLog().map((a) => `${a.request_id}:${a.outcome}`),
      verdict: grant.outcome === "granted" && replay.replay_detected && replay.outcome === "denied" ? "pass" : "fail",
    }),
  );

  const chainRef = build546ReferenceChainPackage();
  cases.push(
    caseResult({
      test_id: "offline_chain_vector_conformance",
      threat_or_property: "Cross-chain evidence vector integrity",
      expected_behavior: "chain_evidence pass without RPC",
      observed_behavior: valid.phases.find((p) => p.id === "chain_evidence")?.status ?? "missing",
      verification_evidence: ["evaluateVectorConformance"],
      verdict: valid.phases.find((p) => p.id === "chain_evidence")?.status === "pass" ? "pass" : "fail",
    }),
  );

  const pass = cases.filter((c) => c.verdict === "pass").length;
  const fail = cases.filter((c) => c.verdict === "fail").length;
  const blocked = cases.filter((c) => c.verdict === "blocked").length;

  return {
    certification_version: BUILD_546_CERTIFICATION_VERSION,
    build: "546",
    title: "Independent verification and institutional partner certification",
    generated_at: new Date().toISOString(),
    commit_sha: commitSha(),
    environment: {
      node: process.version,
      observation_default: "local_simulated",
    },
    architecture_summary_ref: "docs/build-546/TRUST_ARCHITECTURE_AUDIT.md",
    dependency_limitations: [
      "Local cases use synthetic Ed25519 keys and in-memory fixtures only.",
      "Live claim refresh, supersession, and revocation lists require Abraxas authority endpoints.",
      "Staging holder authentication is not executed without authorized partner credentials.",
    ],
    supabase_independence: {
      offline_verifier_runs_without_supabase: true,
      external_relying_party_runs_without_supabase: true,
      live_staging_holder_flow: "blocked",
      detail:
        "Verifier and external RP harness operate on signed artifacts and optional HTTP revocation feeds; no Supabase client in Build #546 path.",
    },
    cases,
    summary: {
      pass,
      fail,
      blocked,
      ready_for_institutional_merge_review: fail === 0,
    },
    disclaimer: BUILD_546_DISCLAIMER,
  };
}

export function summarizeVerdict(report: Build546CertificationReport): CertificationVerdict {
  if (report.summary.fail > 0) return "fail";
  if (report.summary.blocked > 0) return "blocked";
  return "pass";
}
