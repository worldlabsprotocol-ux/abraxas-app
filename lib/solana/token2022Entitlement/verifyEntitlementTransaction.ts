import {
  Connection,
  PublicKey,
  type VersionedTransactionResponse,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from "@solana/spl-token";
import { anchorGlobalDiscriminator } from "@/lib/solana/proofContinuity/instructionDiscriminator";
import { proofContinuityProgramId } from "@/lib/solana/proofContinuity/pda";
import { entitlementConsumerProgramId } from "./pda";
import {
  buildConsumeVerifiedEntitlementInstruction,
  buildMintVerifiedEntitlementInstruction,
} from "./buildEntitlementInstructions";

const MINT_VERIFIED_ENTITLEMENT = anchorGlobalDiscriminator("mint_verified_entitlement");
const CONSUME_VERIFIED_ENTITLEMENT = anchorGlobalDiscriminator("consume_verified_entitlement");

export type EntitlementMintTxExpectations = {
  holder: string;
  registryAdmin: string;
  relyingPartyAdmin: string;
  receiptIdHash: Buffer;
};

export type EntitlementConsumeTxExpectations = EntitlementMintTxExpectations;

function buffersEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && a.equals(b);
}

function collectInstructions(tx: VersionedTransactionResponse): Array<{ programId: PublicKey; data: Buffer; accountKeyIndexes: number[] }> {
  const message = tx.transaction.message;
  const keys = message.getAccountKeys().keySegments().flat();
  return message.compiledInstructions.map((ix) => ({
    programId: keys[ix.programIdIndex]!,
    data: Buffer.from(ix.data),
    accountKeyIndexes: [...ix.accountKeyIndexes],
  }));
}

function holderSignedTransaction(tx: VersionedTransactionResponse, holderPk: PublicKey): boolean {
  const message = tx.transaction.message;
  const keys = message.getAccountKeys().staticAccountKeys.slice(0, message.header.numRequiredSignatures);
  const holderIndex = keys.findIndex((pk) => pk.equals(holderPk));
  if (holderIndex < 0) return false;
  const signature = tx.transaction.signatures[holderIndex];
  if (!signature) return false;
  const bytes = typeof signature === "string"
    ? Buffer.from(signature, "base64")
    : Buffer.from(signature);
  return bytes.length > 0 && bytes.some((byte) => byte !== 0);
}

function instructionAccountPubkeys(tx: VersionedTransactionResponse, accountKeyIndexes: number[]): PublicKey[] {
  const keys = tx.transaction.message.getAccountKeys().keySegments().flat();
  return accountKeyIndexes.map((i) => keys[i]!);
}

function decodeIssuanceLedger(data: Buffer): { registry: string; receiptIdHash: Buffer; recipient: string } | null {
  if (data.length < 8 + 32 + 32 + 32 + 1) return null;
  const off = 8;
  const registry = new PublicKey(data.subarray(off, off + 32)).toBase58();
  const receiptIdHash = data.subarray(off + 32, off + 64);
  const recipient = new PublicKey(data.subarray(off + 64, off + 96)).toBase58();
  return { registry, receiptIdHash, recipient };
}

export function decodeEntitlementConsumption(data: Buffer): {
  registry: string;
  receiptIdHash: Buffer;
  holder: string;
  consumed: boolean;
} | null {
  if (data.length < 8 + 32 + 32 + 32 + 1) return null;
  const off = 8;
  const registry = new PublicKey(data.subarray(off, off + 32)).toBase58();
  const receiptIdHash = data.subarray(off + 32, off + 64);
  const holder = new PublicKey(data.subarray(off + 64, off + 96)).toBase58();
  const consumed = data[off + 96] === 1;
  return { registry, receiptIdHash, holder, consumed };
}

export async function loadFinalizedTransaction(
  connection: Connection,
  signature: string,
): Promise<
  | { ok: true; tx: VersionedTransactionResponse; confirmationStatus: "finalized" | "confirmed"; slot: number }
  | { ok: false; reason: string }
> {
  const status = await connection.getSignatureStatus(signature, { searchTransactionHistory: true });
  const value = status?.value;
  if (!value) return { ok: false, reason: "chain_transaction_not_found" };
  if (value.err) return { ok: false, reason: "chain_transaction_failed" };
  if (value.confirmationStatus !== "finalized" && value.confirmationStatus !== "confirmed") {
    return { ok: false, reason: "chain_transaction_not_finalized" };
  }

  const tx = await connection.getTransaction(signature, {
    commitment: "finalized",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "chain_transaction_not_found" };
  if (tx.meta?.err) return { ok: false, reason: "chain_transaction_failed" };

  return {
    ok: true,
    tx,
    confirmationStatus: value.confirmationStatus,
    slot: status.context.slot,
  };
}

function expectedMintAccountPubkeys(expected: EntitlementMintTxExpectations): PublicKey[] {
  const ix = buildMintVerifiedEntitlementInstruction({
    registryAdmin: new PublicKey(expected.registryAdmin),
    holder: new PublicKey(expected.holder),
    payer: new PublicKey(expected.holder),
    receiptIdHash: expected.receiptIdHash,
  });
  return ix.keys.map((k) => k.pubkey);
}

function expectedConsumeAccountPubkeys(expected: EntitlementConsumeTxExpectations): PublicKey[] {
  const ix = buildConsumeVerifiedEntitlementInstruction({
    registryAdmin: new PublicKey(expected.registryAdmin),
    relyingPartyAdmin: new PublicKey(expected.relyingPartyAdmin),
    holder: new PublicKey(expected.holder),
    payer: new PublicKey(expected.holder),
    receiptIdHash: expected.receiptIdHash,
  });
  return ix.keys.map((k) => k.pubkey);
}

function accountMetasMatch(actual: PublicKey[], expected: PublicKey[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((pk, i) => pk.equals(expected[i]!));
}

export async function verifyMintEntitlementTransaction(
  connection: Connection,
  signature: string,
  expected: EntitlementMintTxExpectations,
): Promise<
  | { ok: true; slot: number; confirmation_status: "finalized" | "confirmed"; token_balance: string }
  | { ok: false; reason: string }
> {
  const loaded = await loadFinalizedTransaction(connection, signature);
  if (!loaded.ok) return loaded;

  const holderPk = new PublicKey(expected.holder);
  if (!holderSignedTransaction(loaded.tx, holderPk)) {
    return { ok: false, reason: "chain_transaction_holder_not_signer" };
  }

  const programId = proofContinuityProgramId();
  const instructions = collectInstructions(loaded.tx);
  const mintIndex = instructions.findIndex(
    (ix) =>
      ix.programId.equals(programId)
      && ix.data.length >= 8 + 32
      && ix.data.subarray(0, 8).equals(MINT_VERIFIED_ENTITLEMENT)
      && buffersEqual(ix.data.subarray(8, 40), expected.receiptIdHash),
  );
  if (mintIndex < 0) return { ok: false, reason: "chain_transaction_missing_mint_instruction" };

  const mintIx = instructions[mintIndex]!;
  const actualAccounts = instructionAccountPubkeys(loaded.tx, mintIx.accountKeyIndexes);
  const expectedAccounts = expectedMintAccountPubkeys(expected);
  if (!accountMetasMatch(actualAccounts, expectedAccounts)) {
    return { ok: false, reason: "chain_transaction_account_mismatch" };
  }

  const mintPk = expectedAccounts[6]!;
  const ata = getAssociatedTokenAddressSync(mintPk, holderPk, false, TOKEN_2022_PROGRAM_ID);
  const issuanceLedger = expectedAccounts[9]!;

  const [ledgerInfo, tokenInfo] = await Promise.all([
    connection.getAccountInfo(issuanceLedger, "finalized"),
    connection.getAccountInfo(ata, "finalized"),
  ]);

  if (!ledgerInfo?.data) return { ok: false, reason: "chain_state_issuance_ledger_missing" };
  const ledger = decodeIssuanceLedger(Buffer.from(ledgerInfo.data));
  if (!ledger) return { ok: false, reason: "chain_state_issuance_ledger_decode_failed" };
  const expectedRegistry = expectedAccounts[2]!.toBase58();
  if (ledger.registry !== expectedRegistry) return { ok: false, reason: "chain_state_registry_mismatch" };
  if (!buffersEqual(ledger.receiptIdHash, expected.receiptIdHash)) {
    return { ok: false, reason: "chain_state_receipt_mismatch" };
  }
  if (ledger.recipient !== expected.holder) return { ok: false, reason: "chain_state_holder_mismatch" };

  if (!tokenInfo?.data) return { ok: false, reason: "chain_state_token_account_missing" };
  const unpacked = unpackAccount(ata, tokenInfo, TOKEN_2022_PROGRAM_ID);
  if (unpacked.mint.toBase58() !== mintPk.toBase58()) return { ok: false, reason: "chain_state_mint_mismatch" };
  if (unpacked.amount <= BigInt(0)) return { ok: false, reason: "chain_state_token_balance_zero" };

  return {
    ok: true,
    slot: loaded.slot,
    confirmation_status: loaded.confirmationStatus,
    token_balance: unpacked.amount.toString(),
  };
}

export async function verifyConsumeEntitlementTransaction(
  connection: Connection,
  signature: string,
  expected: EntitlementConsumeTxExpectations,
): Promise<
  | { ok: true; slot: number; confirmation_status: "finalized" | "confirmed" }
  | { ok: false; reason: string }
> {
  const loaded = await loadFinalizedTransaction(connection, signature);
  if (!loaded.ok) return loaded;

  const holderPk = new PublicKey(expected.holder);
  if (!holderSignedTransaction(loaded.tx, holderPk)) {
    return { ok: false, reason: "chain_transaction_holder_not_signer" };
  }

  const programId = entitlementConsumerProgramId();
  const instructions = collectInstructions(loaded.tx);
  const consumeIndex = instructions.findIndex(
    (ix) =>
      ix.programId.equals(programId)
      && ix.data.length >= 8 + 32
      && ix.data.subarray(0, 8).equals(CONSUME_VERIFIED_ENTITLEMENT)
      && buffersEqual(ix.data.subarray(8, 40), expected.receiptIdHash),
  );
  if (consumeIndex < 0) return { ok: false, reason: "chain_transaction_missing_consume_instruction" };

  const consumeIx = instructions[consumeIndex]!;
  const actualAccounts = instructionAccountPubkeys(loaded.tx, consumeIx.accountKeyIndexes);
  const expectedAccounts = expectedConsumeAccountPubkeys(expected);
  if (!accountMetasMatch(actualAccounts, expectedAccounts)) {
    return { ok: false, reason: "chain_transaction_account_mismatch" };
  }

  const consumptionPk = expectedAccounts[11]!;
  const consumptionInfo = await connection.getAccountInfo(consumptionPk, "finalized");
  if (!consumptionInfo?.data) return { ok: false, reason: "chain_state_consumption_missing" };

  const consumption = decodeEntitlementConsumption(Buffer.from(consumptionInfo.data));
  if (!consumption) return { ok: false, reason: "chain_state_consumption_decode_failed" };
  if (!consumption.consumed) return { ok: false, reason: "chain_state_not_consumed" };
  if (consumption.holder !== expected.holder) return { ok: false, reason: "chain_state_holder_mismatch" };
  if (!buffersEqual(consumption.receiptIdHash, expected.receiptIdHash)) {
    return { ok: false, reason: "chain_state_receipt_mismatch" };
  }
  const expectedRegistry = expectedAccounts[5]!.toBase58();
  if (consumption.registry !== expectedRegistry) return { ok: false, reason: "chain_state_registry_mismatch" };

  return {
    ok: true,
    slot: loaded.slot,
    confirmation_status: loaded.confirmationStatus,
  };
}