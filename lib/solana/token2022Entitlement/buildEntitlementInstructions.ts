import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { anchorGlobalDiscriminator } from "@/lib/solana/proofContinuity/instructionDiscriminator";
import {
  findProofRegistryPda,
  findReceiptCommitmentPda,
  findSandboxBindingPda,
  proofContinuityProgramId,
} from "@/lib/solana/proofContinuity/pda";
import {
  entitlementConsumerProgramId,
  findEntitlementConsumptionPda,
  findEntitlementIssuanceLedgerPda,
  findEntitlementMintAuthorityPda,
  findEntitlementMintConfigPda,
  findEntitlementMintPda,
  findTrustedRelyingPartyConfigPda,
} from "./pda";

const MINT_VERIFIED_ENTITLEMENT = anchorGlobalDiscriminator("mint_verified_entitlement");
const CONSUME_VERIFIED_ENTITLEMENT = anchorGlobalDiscriminator("consume_verified_entitlement");

export function buildMintVerifiedEntitlementInstruction(input: {
  registryAdmin: PublicKey;
  holder: PublicKey;
  payer: PublicKey;
  receiptIdHash: Buffer;
}): TransactionInstruction {
  if (input.receiptIdHash.length !== 32) throw new Error("receipt_id_hash_invalid");
  const registry = findProofRegistryPda(input.registryAdmin);
  const sandbox = findSandboxBindingPda(registry.address, input.holder);
  const commitment = findReceiptCommitmentPda(registry.address, input.receiptIdHash);
  const mintConfig = findEntitlementMintConfigPda(registry.address);
  const mint = findEntitlementMintPda(registry.address);
  const mintAuthority = findEntitlementMintAuthorityPda(registry.address);
  const issuanceLedger = findEntitlementIssuanceLedgerPda(registry.address, input.receiptIdHash);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    mint.address,
    input.holder,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const data = Buffer.alloc(8 + 32);
  MINT_VERIFIED_ENTITLEMENT.copy(data, 0);
  input.receiptIdHash.copy(data, 8);

  return new TransactionInstruction({
    programId: proofContinuityProgramId(),
    keys: [
      { pubkey: input.payer, isSigner: true, isWritable: true },
      { pubkey: input.holder, isSigner: true, isWritable: false },
      { pubkey: registry.address, isSigner: false, isWritable: false },
      { pubkey: sandbox.address, isSigner: false, isWritable: false },
      { pubkey: commitment.address, isSigner: false, isWritable: false },
      { pubkey: mintConfig.address, isSigner: false, isWritable: false },
      { pubkey: mint.address, isSigner: false, isWritable: true },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
      { pubkey: issuanceLedger.address, isSigner: false, isWritable: true },
      { pubkey: mintAuthority.address, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildConsumeVerifiedEntitlementInstruction(input: {
  registryAdmin: PublicKey;
  relyingPartyAdmin: PublicKey;
  holder: PublicKey;
  payer: PublicKey;
  receiptIdHash: Buffer;
}): TransactionInstruction {
  if (input.receiptIdHash.length !== 32) throw new Error("receipt_id_hash_invalid");
  const registry = findProofRegistryPda(input.registryAdmin);
  const commitment = findReceiptCommitmentPda(registry.address, input.receiptIdHash);
  const mintConfig = findEntitlementMintConfigPda(registry.address);
  const mint = findEntitlementMintPda(registry.address);
  const issuanceLedger = findEntitlementIssuanceLedgerPda(registry.address, input.receiptIdHash);
  const consumption = findEntitlementConsumptionPda(registry.address, input.receiptIdHash);
  const trustedConfig = findTrustedRelyingPartyConfigPda(input.relyingPartyAdmin);
  const recipientTokenAccount = getAssociatedTokenAddressSync(
    mint.address,
    input.holder,
    false,
    TOKEN_2022_PROGRAM_ID,
  );

  const data = Buffer.alloc(8 + 32);
  CONSUME_VERIFIED_ENTITLEMENT.copy(data, 0);
  input.receiptIdHash.copy(data, 8);

  return new TransactionInstruction({
    programId: entitlementConsumerProgramId(),
    keys: [
      { pubkey: input.payer, isSigner: true, isWritable: true },
      { pubkey: input.holder, isSigner: true, isWritable: false },
      { pubkey: proofContinuityProgramId(), isSigner: false, isWritable: false },
      { pubkey: trustedConfig.address, isSigner: false, isWritable: false },
      { pubkey: input.registryAdmin, isSigner: false, isWritable: false },
      { pubkey: registry.address, isSigner: false, isWritable: false },
      { pubkey: commitment.address, isSigner: false, isWritable: false },
      { pubkey: mintConfig.address, isSigner: false, isWritable: false },
      { pubkey: mint.address, isSigner: false, isWritable: false },
      { pubkey: recipientTokenAccount, isSigner: false, isWritable: false },
      { pubkey: issuanceLedger.address, isSigner: false, isWritable: false },
      { pubkey: consumption.address, isSigner: false, isWritable: true },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function resolveEntitlementPublicAccounts(input: {
  registryAdmin: PublicKey;
  relyingPartyAdmin: PublicKey;
  holder: PublicKey;
  receiptIdHash: Buffer;
}) {
  const registry = findProofRegistryPda(input.registryAdmin);
  const commitment = findReceiptCommitmentPda(registry.address, input.receiptIdHash);
  const mint = findEntitlementMintPda(registry.address);
  const trustedConfig = findTrustedRelyingPartyConfigPda(input.relyingPartyAdmin);
  const issuanceLedger = findEntitlementIssuanceLedgerPda(registry.address, input.receiptIdHash);
  const consumption = findEntitlementConsumptionPda(registry.address, input.receiptIdHash);
  const ata = getAssociatedTokenAddressSync(mint.address, input.holder, false, TOKEN_2022_PROGRAM_ID);
  return {
    registry: registry.address.toBase58(),
    commitment: commitment.address.toBase58(),
    entitlement_mint: mint.address.toBase58(),
    trusted_config: trustedConfig.address.toBase58(),
    issuance_ledger: issuanceLedger.address.toBase58(),
    consumption: consumption.address.toBase58(),
    holder_token_account: ata.toBase58(),
  };
}