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

  return {
    schema_version: BUILD_762_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    commit_sha: commitSha(),
    journey_id: "ephemeral_developer_workspace_institutional_trust",
    journey_label: "Developer Workspace: request verification, present evidence, evaluate policy, verify decision",
    trust_context: "sandbox_only",
    status: {
      implemented: true,
      cryptographically_tested: negativesPass && happy.independent.signature_authentic,
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
      signature_authentic: happy.independent.signature_authentic,
      currently_acceptable: happy.independent.currently_acceptable,
      without_wallet_session: true,
    },
    solana_contribution: {
      wallet_sign_message_scope_proof: true,
      onchain_program_enforcement: false,
      note:
        "Solana wallet signMessage establishes scoped authorization for the verification request. "
        + "Issuer evidence and policy evaluation occur off-chain. Partner-owned on-chain gates are optional for composable enforcement and are not required for independent receipt verification.",
    },
    negative_cases,
    limitations: [
      "Sandbox test issuer credentials demonstrate protocol execution only; they are not production age eligibility evidence.",
      "Independent POST /api/auth/wallet/sandbox/validate validates presented sandbox test receipts against the server-held copy while the receipt remains in ephemeral storage; it does not upgrade sandbox labels to production authorization.",
      "This runner executes local HTTP route handlers; it is not a substitute for Preview environment configuration (Redis, test issuer env flag).",
      "Institutional Passport bundle verification (build-569 CLI) is a separate relying-party path for issuer-backed presentation bundles.",
    ],
    reproduction_command: "npm run certify:build-762",
  };
}
