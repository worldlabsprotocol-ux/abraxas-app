export {
  CHAIN_ATTESTATION_SCHEMA_VERSION,
  CHAIN_ATTESTATION_VERSION,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  EIP712_DOMAIN_TYPE,
  EIP712_ATTESTATION_TYPE,
  EIP712_PRIMARY_TYPE,
  CHAIN_ATTESTATION_NOT_EXECUTION,
  CHAIN_ATTESTATION_BOUNDARY,
  CHAIN_ATTESTATION_FLOW,
  CHAIN_ATTESTATION_PRIVACY,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
  type ChainEligibilityAttestationFields,
  type Eip712Domain,
} from "./contract";

export { issueChainEligibilityAttestation, hasChainAttestationClientOverride } from "./issue";
export { eip712Domain, eip712TypedData, hashChainAttestationTypedData } from "./eip712";
export { loadEvmAttestationSigner } from "./signer";
export { loadSolanaAttestationSigner } from "./solanaSigner";
export {
  encodeSolanaEligibilityMessage,
  buildSolanaEd25519VerifyInstructionData,
  SOLANA_ED25519_PROGRAM_ID,
  SOLANA_PARTNER_PROGRAM_INTERFACE,
} from "./solanaMessage";
export {
  deriveGateConfigPda,
  deriveAuthorizationPda,
  deriveConsumerAuthorityPda,
  buildAuthorizeAccountKeys,
  buildEd25519VerifyInstruction,
  mapSolanaGateError,
  LOCAL_SOLANA_GATE_PROGRAM_ID,
  LOCAL_SOLANA_CONSUMER_PROGRAM_ID,
  SOLANA_GATE_DEPLOYMENT_NOTICE,
  SOLANA_ONCHAIN_GATE_FLOW,
} from "./solanaGate";
export { assertAttestationBindings } from "./bindings";
export { verifyEvmEligibilityOffchain } from "./evmKit";
export { projectChainAttestationClient } from "./project";
