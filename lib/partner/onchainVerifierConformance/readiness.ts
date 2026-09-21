import {
  ONCHAIN_VERIFIER_CONFORMANCE_DOCS,
  ONCHAIN_VERIFIER_CONFORMANCE_SEQUENCE,
  type OnchainVerifierConformanceSafeState,
} from "./contract";

export function onchainVerifierSafeState(input: {
  verifiedSandbox?: boolean;
  vectorsReady?: boolean;
  bindingsFailed?: boolean;
  signerStale?: boolean;
}): OnchainVerifierConformanceSafeState {
  if (input.bindingsFailed) return "bindings_failed";
  if (input.signerStale) return "signer_stale";
  if (input.verifiedSandbox && input.vectorsReady) return "conformant_sandbox";
  if (input.vectorsReady) return "vectors_ready";
  return "not_started";
}

export function onchainVerifierLaunchpadCard(state: OnchainVerifierConformanceSafeState) {
  return {
    docs: ONCHAIN_VERIFIER_CONFORMANCE_DOCS,
    safe_state: state,
    sequence: [...ONCHAIN_VERIFIER_CONFORMANCE_SEQUENCE],
    deploy_button: false,
    browser_register: false,
    browser_approve: false,
    live: false,
  };
}
