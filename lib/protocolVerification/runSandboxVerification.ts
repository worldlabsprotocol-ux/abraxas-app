// FILE: lib/protocolVerification/runSandboxVerification.ts

import { randomBytes } from "crypto";
import { resolveEphemeralSandboxTestPolicy } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";
import {
  storeEphemeralSandboxTestResult,
  type EphemeralSandboxTestResult,
} from "@/lib/auth/ephemeralWallet/sandboxTestVerification";
import { EphemeralStateUnavailableError } from "@/lib/auth/ephemeralWallet/errors";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { bindVerificationRequest, executeProtocolVerification } from "./executeVerification";
import type { EvidencePresentation, ProtocolVerificationOutcome } from "./types";

export async function runEphemeralProtocolSandboxVerification(input: {
  workspaceId: string;
  walletAddress: string;
  policyId: string;
  evidence?: EvidencePresentation[];
  now?: Date;
}): Promise<
  | { ok: true; decision: "approved" | "denied"; result: EphemeralSandboxTestResult; validate_path: string }
  | { ok: false; code: string; unsupported?: boolean }
> {
  const sandboxPolicy = resolveEphemeralSandboxTestPolicy(input.policyId);
  if (!sandboxPolicy) return { ok: false, code: "unknown_policy" };

  if (!inferPolicyPackFromPolicyId(input.policyId)) {
    return { ok: false, code: "policy_not_found" };
  }
  const policyVersion = sandboxPolicy.policy_version;

  const evidence: EvidencePresentation[] =
    input.evidence ??
    (input.policyId === "wallet_control"
      ? [{ kind: "wallet_session_binding", wallet_address: input.walletAddress }]
      : [{ kind: "wallet_session_binding", wallet_address: input.walletAddress }]);

  const request = bindVerificationRequest({
    requestId: `req_esbx_${randomBytes(6).toString("hex")}`,
    partnerId: "ephemeral_wallet_sandbox",
    policyId: input.policyId,
    policyVersion,
    operation: "sandbox:verification:test",
    resource: `abraxas:sandbox:${input.workspaceId}:policy:${input.policyId}`,
    walletAddress: input.walletAddress,
  });

  const outcome: ProtocolVerificationOutcome = await executeProtocolVerification({
    context: "sandbox_only",
    request,
    evidence,
    now: input.now,
  });

  if (!outcome.ok) {
    return { ok: false, code: outcome.code, unsupported: outcome.unsupported };
  }

  const result: EphemeralSandboxTestResult = {
    ...(outcome.receipt as EphemeralSandboxTestResult),
    workspace_id: input.workspaceId,
    notice:
      outcome.decision === "approved"
        ? "Ephemeral sandbox protocol verification (test keys only). Not Production eligibility."
        : "Ephemeral sandbox denial — cryptographically signed for independent verification. Not Production eligibility.",
    test_only: true,
    production_usable: false,
    result_label: "ephemeral_sandbox_test_only",
    currently_valid: outcome.decision === "approved",
    validity: outcome.decision === "approved" ? "active" : "denied",
    invalidation_reasons:
      outcome.decision === "approved" ? [] : [`decision_not_approved:${outcome.decision}`],
    status: outcome.decision === "approved" ? "active" : "denied",
    artifact_type: "eligibility_decision_receipt",
    anchor_reference: null,
    schema_version: (outcome.receipt.schema_version as string) ?? "v1",
  };

  try {
    await storeEphemeralSandboxTestResult(result);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }

  return {
    ok: true,
    decision: outcome.decision,
    result,
    validate_path: outcome.validate_path,
  };
}
