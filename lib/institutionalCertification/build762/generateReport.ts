// FILE: lib/institutionalCertification/build762/generateReport.ts

import { execSync } from "node:child_process";
import type { Build762InstitutionalTrustReport } from "./contract";
import { BUILD_762_SCHEMA_VERSION } from "./contract";
import {
  EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
  POLICY_ID,
  runBuild762NegativeCases,
  runEphemeralSandboxTrustHappyPath,
} from "./ephemeralSandboxTrustJourney";
import { EPHEMERAL_SANDBOX_RESULT_LABEL } from "@/lib/auth/ephemeralWallet/sandboxTestVerification";

function commitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export async function generateBuild762InstitutionalTrustReport(): Promise<Build762InstitutionalTrustReport> {
  const happy = await runEphemeralSandboxTrustHappyPath();
  const negative_cases = await runBuild762NegativeCases();
  const negativesPass = negative_cases.every((c) => c.verdict === "pass");

  const sessionIndependentOk =
    happy.independent.session_independent === true
    && happy.independent.server_record_integrity_verified === true
    && happy.independent.currently_acceptable === true;

  return {
    schema_version: BUILD_762_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    commit_sha: commitSha(),
    execution_mode: "local_imported_http_route_handlers",
    deployment_environment: "vitest_process",
    journey_id: "ephemeral_developer_workspace_institutional_trust",
    journey_label: "Developer Workspace: request verification, present evidence, evaluate policy, verify decision",
    trust_context: "sandbox_only",
    status: {
      implemented: true,
      session_independent_verification_demonstrated: sessionIndependentOk,
      fail_closed_integrity_verified: negativesPass,
      standalone_cryptographic_verification: false,
      issuer_operational: false,
      production_authorized: false,
    },
    institution: {
      partner_id: EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
      policy_id: POLICY_ID,
      policy_version: 1,
      requested_attribute: "Age 21 demonstration (sandbox test issuer)",
    },
    holder_authorization: {
      wallet_sign_in: true,
      presentation_authorization: true,
      wallet_proof_method: "test_wallet_ed25519_sign_message",
      interactive_browser_wallet: false,
      scoped_wallet_action: {
        operation: "sandbox:verification:test",
        resource_pattern: `abraxas:sandbox:{workspace_id}:policy:${POLICY_ID}`,
      },
    },
    evidence: {
      kind: "passport_reusable_credential",
      sandbox_test_issuer: true,
      production_eligibility: false,
    },
    execution: {
      workspace_id: happy.workspace_id,
      presentation_commit_id: happy.presentation_commit_id,
      action_challenge_id: happy.action_challenge_id,
      receipt_id: String(happy.receipt.receipt_id ?? ""),
      decision: happy.decision,
      result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    },
    independent_verification: {
      source: "presented_receipt",
      session_independent: true,
      server_record_integrity_verified: happy.independent.server_record_integrity_verified,
      standalone_cryptographic_verification: false,
      currently_acceptable: happy.independent.currently_acceptable,
      without_wallet_session: true,
    },
    solana_contribution: {
      wallet_sign_message_scope_proof: true,
      wallet_proof_method: "test_wallet_ed25519_sign_message",
      onchain_program_enforcement: false,
      note:
        "Automated certification uses a programmatic Solana keypair signing real challenge bytes through route handlers "
        + "(not an interactive browser wallet). Issuer evidence and policy evaluation occur off-chain. "
        + "Presented-receipt validation matches the submission to Abraxas ephemeral server storage; it does not verify "
        + "Ed25519 signatures against the public verification-key registry.",
    },
    negative_cases,
    limitations: [
      "Sandbox test issuer credentials demonstrate protocol execution only; they are not production age eligibility evidence.",
      "Session-independent POST /api/auth/wallet/sandbox/validate requires a matching server-held ephemeral record; it is not standalone cryptographic verification.",
      "Ephemeral sandbox receipts use per-issuance test signing keys that are not published in the Abraxas verification-key registry.",
      "This runner executes local imported HTTP route handlers in Vitest; it is not a deployed-network or Preview Redis certification.",
      "Institutional Passport bundle verification (build-569 CLI) is a separate relying-party path for issuer-backed presentation bundles.",
    ],
    reproduction_command: "npm run certify:build-762",
  };
}
