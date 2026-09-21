import { getNetworkCapability } from "@/lib/partner/networkCapability/registry";
import { NETWORK_RECEIPT_REQUIREMENT, NETWORK_REPLAY_REQUIREMENT } from "@/lib/partner/networkCapability/types";
import type { OnchainGateDeploymentRecord } from "@/lib/partner/onchainGateDeployments/types";
import { TESTNET_GATE_SAFE_STATES, type TestnetGateSafeState } from "./contract";
import type { TestnetReadinessReport } from "./types";

export function testnetKitSafeState(input: {
  planned?: boolean;
  verified?: boolean;
  record?: OnchainGateDeploymentRecord | null;
}): TestnetGateSafeState {
  if (input.verified || input.record?.status === "verified_sandbox") return "verified_sandbox";
  if (input.record && input.record.status !== "verified_sandbox") return "deployment_pending_verification";
  if (input.planned) return "ready_to_plan";
  return "not_planned";
}

export function testnetReadinessReport(input: {
  record?: OnchainGateDeploymentRecord | null;
  expectedPartnerHash?: string;
  expectedPolicyHash?: string;
  expectedActionHash?: string;
  expectedSignerKeyId?: string;
}): TestnetReadinessReport {
  const record = input.record ?? null;
  const entry = record ? getNetworkCapability(record.network_id) : null;
  const production = Boolean(
    record?.environment === "production"
      || record?.network_id.endsWith("_mainnet")
      || entry?.environment === "mainnet"
      || entry?.status === "production_review_required",
  );
  const reasons: string[] = [];
  const deploymentVerified = record?.status === "verified_sandbox";
  if (!deploymentVerified) reasons.push("deployment_not_verified");
  const signerOk = Boolean(record?.signer_key_id) && (
    !input.expectedSignerKeyId || record?.signer_key_id === input.expectedSignerKeyId
  );
  if (!signerOk) reasons.push("signer_mismatch");
  const bindingsOk = Boolean(record)
    && (!input.expectedPartnerHash || record?.partner_hash === input.expectedPartnerHash)
    && (!input.expectedPolicyHash || record?.policy_hash === input.expectedPolicyHash)
    && (!input.expectedActionHash || record?.action_hash === input.expectedActionHash);
  if (!bindingsOk) reasons.push("binding_mismatch");
  const replay = entry?.replay_requirement === NETWORK_REPLAY_REQUIREMENT;
  if (!replay) reasons.push("replay_missing");
  const receipt = entry?.receipt_requirement === NETWORK_RECEIPT_REQUIREMENT;
  if (!receipt) reasons.push("receipt_requirement_missing");
  if (production) reasons.push("production_mainnet_posture");
  return {
    deployment_verified: deploymentVerified,
    signer_lifecycle_matches: signerOk,
    partner_policy_action_match: bindingsOk,
    replay_protection: Boolean(replay),
    current_receipt_requirement: Boolean(receipt),
    production_mainnet_posture: false,
    issuance_unblocked: deploymentVerified && signerOk && bindingsOk && replay && receipt && !production,
    safe_state: testnetKitSafeState({ planned: true, record }),
    live: false,
    reasons,
  };
}

export function testnetKitLaunchpadCard(state: TestnetGateSafeState) {
  return {
    docs: "/docs/testnet-gate-deployment",
    states: [...TESTNET_GATE_SAFE_STATES],
    safe_state: state,
    deploy_button: false as const,
    live: false as const,
    browser_deploy: false as const,
  };
}
