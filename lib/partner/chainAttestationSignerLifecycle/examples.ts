export const CHAIN_ATTESTATION_SIGNER_LIFECYCLE_ARCHITECTURE = `
active key -> issue new EVM/Solana attestations
retiring key -> verify existing short-lived attestations only
revoked/unknown/wrong-env/wrong-network/schema -> fail closed
Abraxas never broadcasts a partner signer-update transaction
`.trim();

export function chainAttestationSignerPublicExample(): string {
  return `const evm = await fetch("https://abraxasworld.xyz/api/chain-attestations/verification-keys/evm");
const solana = await fetch("https://abraxasworld.xyz/api/chain-attestations/verification-keys/solana");
const keys = await evm.json();
// keys contain opaque key IDs and public verifier material only.
// Signature verification is not a grant. Abraxas does not update your contract.
`;
}
