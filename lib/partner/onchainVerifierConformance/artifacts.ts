import {
  EIP712_ATTESTATION_TYPE,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_TYPE,
  EIP712_DOMAIN_VERSION,
  EIP712_PRIMARY_TYPE,
  SOLANA_ATTESTATION_MESSAGE_LEN,
  SOLANA_ATTESTATION_MESSAGE_PREFIX,
} from "@/lib/partner/chainAttestation/contract";
import { SOLANA_GATE_ERROR_MAP, LOCAL_SOLANA_GATE_PROGRAM_ID } from "@/lib/partner/chainAttestation/solanaGate";
import { INSTITUTIONAL_V2_TYPESTRING, institutionalTypehash } from "@/lib/partner/testnetGateDeploymentKit/institutional";
import { CONFORMANCE_VECTOR_PACKAGE } from "./vectors";

export const EVM_VERIFIER_ARTIFACT = {
  schema_versions: ["1", "2"] as const,
  current_schema: "2" as const,
  eip712: {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    primary_type: EIP712_PRIMARY_TYPE,
    domain_type: EIP712_DOMAIN_TYPE,
    attestation_type: EIP712_ATTESTATION_TYPE,
    typehash: institutionalTypehash(),
    typestring: INSTITUTIONAL_V2_TYPESTRING,
  },
  errors: [
    "SchemaMismatch",
    "Expired",
    "Replayed",
    "UnknownSigner",
    "InstitutionalRequired",
    "BindingMismatch",
  ] as const,
  events: ["AuthorizationConsumed", "TrustedSignerAdded", "TrustedSignerRetired", "TrustedSignerRevoked"] as const,
  payable: false,
  token_calls: false,
  transfers: false,
  approvals: false,
  abi: [
    { type: "function", name: "consumeEligibility", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "bool" }] },
    { type: "function", name: "ATTESTATION_TYPEHASH", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  ],
  vectors: CONFORMANCE_VECTOR_PACKAGE.evm,
};

export const SOLANA_VERIFIER_ARTIFACT = {
  schema_versions: ["1", "2"] as const,
  current_schema: "2" as const,
  prefix: SOLANA_ATTESTATION_MESSAGE_PREFIX,
  message_len: SOLANA_ATTESTATION_MESSAGE_LEN,
  legacy_v1_len: 372,
  program_id_local: LOCAL_SOLANA_GATE_PROGRAM_ID,
  pdas: {
    gate_config: ["gate_config", "admin"],
    authorization: ["authorization", "config", "attestation_id"],
    protocol_access: ["protocol_access", "protocol", "subject_hash", "organization_commitment"],
  },
  errors: SOLANA_GATE_ERROR_MAP,
  payable: false,
  token_calls: false,
  arbitrary_cpi: false,
  vectors: CONFORMANCE_VECTOR_PACKAGE.solana_v2,
};

export const PUBLIC_VERIFIER_PACKAGE = {
  version: "1.0.0",
  live: false as const,
  secrets: false as const,
  evm: EVM_VERIFIER_ARTIFACT,
  solana: SOLANA_VERIFIER_ARTIFACT,
  docs: "/docs/onchain-verifier-conformance",
};
