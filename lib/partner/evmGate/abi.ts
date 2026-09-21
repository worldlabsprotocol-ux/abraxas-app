// Partner-owned EVM eligibility gate ABI. Consume-only. No transfer/approve/execute.

export const ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI = [
  {
    type: "function",
    name: "consumeEligibility",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "att",
        type: "tuple",
        components: [
          { name: "schemaVersion", type: "uint256" },
          { name: "networkId", type: "bytes32" },
          { name: "partnerHash", type: "bytes32" },
          { name: "policyHash", type: "bytes32" },
          { name: "actionHash", type: "bytes32" },
          { name: "subjectHash", type: "bytes32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "nonce", type: "bytes32" },
          { name: "attestationId", type: "bytes32" },
          { name: "environment", type: "bytes32" },
          { name: "signerKeyId", type: "bytes32" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "authorized", type: "bool" }],
  },
  {
    type: "function",
    name: "setTrustedSigner",
    stateMutability: "nonpayable",
    inputs: [{ name: "signer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "domainSeparator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "consumedNonces",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "AuthorizationConsumed",
    inputs: [
      { name: "nonce", type: "bytes32", indexed: true },
      { name: "attestationId", type: "bytes32", indexed: true },
      { name: "partnerHash", type: "bytes32", indexed: false },
      { name: "policyHash", type: "bytes32", indexed: false },
      { name: "actionHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

export const ABRAXAS_PARTNER_ELIGIBILITY_CONSUMER_ABI = [
  {
    type: "function",
    name: "recordNamedAction",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "att",
        type: "tuple",
        components: ABRAXAS_PARTNER_ELIGIBILITY_GATE_ABI[0].inputs[0].components,
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "accepted", type: "bool" }],
  },
] as const;

export const EVM_GATE_ENTRY_POINTS = [
  "consumeEligibility",
  "setTrustedSigner",
  "domainSeparator",
  "consumedNonces",
] as const;

export const EVM_GATE_FORBIDDEN_METHODS = [
  "transfer",
  "transferFrom",
  "approve",
  "execute",
  "multicall",
  "swap",
  "mint",
] as const;
