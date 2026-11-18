import { PublicKey } from "@solana/web3.js";
import { PROOF_CONTINUITY_PROGRAM_ID } from "./constants";

export const REGISTRY_SEED = Buffer.from("proof_registry");
export const COMMITMENT_SEED = Buffer.from("receipt_commitment");
export const SANDBOX_BINDING_SEED = Buffer.from("sandbox_binding");
export const EXECUTION_LEDGER_SEED = Buffer.from("execution_ledger");

export function proofContinuityProgramId(): PublicKey {
  return new PublicKey(PROOF_CONTINUITY_PROGRAM_ID);
}

export function findProofRegistryPda(admin: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [REGISTRY_SEED, admin.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findReceiptCommitmentPda(
  registry: PublicKey,
  receiptIdHash: Buffer,
): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [COMMITMENT_SEED, registry.toBuffer(), receiptIdHash],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findSandboxBindingPda(registry: PublicKey, holder: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [SANDBOX_BINDING_SEED, registry.toBuffer(), holder.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}

export function findExecutionLedgerPda(sandbox: PublicKey): { address: PublicKey; bump: number } {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [EXECUTION_LEDGER_SEED, sandbox.toBuffer()],
    proofContinuityProgramId(),
  );
  return { address, bump };
}