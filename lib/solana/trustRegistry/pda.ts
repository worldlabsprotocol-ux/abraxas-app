import { PublicKey } from "@solana/web3.js";
import {
  ABRAXAS_TRUST_REGISTRY_PROGRAM_ID,
  TRUST_COMMITMENT_SEED,
  TRUST_POLICY_SEED,
  TRUST_REGISTRY_SEED,
} from "@/lib/solana/trustRegistry/constants";

export function deriveTrustRegistryPda(registryDomain: Uint8Array, programId = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID)) {
  return PublicKey.findProgramAddressSync([Buffer.from(TRUST_REGISTRY_SEED), registryDomain], programId);
}

export function deriveTrustPolicyPda(
  registry: PublicKey,
  policyCommitment: Uint8Array,
  programId = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TRUST_POLICY_SEED), registry.toBuffer(), policyCommitment],
    programId,
  );
}

export function deriveCommitmentStatePda(
  registry: PublicKey,
  commitmentDigest: Uint8Array,
  programId = new PublicKey(ABRAXAS_TRUST_REGISTRY_PROGRAM_ID),
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TRUST_COMMITMENT_SEED), registry.toBuffer(), commitmentDigest],
    programId,
  );
}
