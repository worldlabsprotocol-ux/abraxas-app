import { Keypair, PublicKey, type VersionedTransactionResponse } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import {
  buildConsumeVerifiedEntitlementInstruction,
  buildMintVerifiedEntitlementInstruction,
} from "./buildEntitlementInstructions";
import {
  decodeEntitlementConsumption,
  verifyConsumeEntitlementTransaction,
  verifyMintEntitlementTransaction,
} from "./verifyEntitlementTransaction";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const admin = Keypair.generate().publicKey;
const relying = Keypair.generate().publicKey;
const holder = Keypair.generate().publicKey;
const receipt = Buffer.alloc(32, 9);

function mintFixture() {
  const ix = buildMintVerifiedEntitlementInstruction({
    registryAdmin: admin,
    holder,
    payer: holder,
    receiptIdHash: receipt,
  });
  const accountKeys = [holder];
  for (const key of ix.keys) {
    if (!accountKeys.some((pk) => pk.equals(key.pubkey))) accountKeys.push(key.pubkey);
  }
  if (!accountKeys.some((pk) => pk.equals(ix.programId))) accountKeys.push(ix.programId);
  const programIdIndex = accountKeys.findIndex((pk) => pk.equals(ix.programId));
  const accountKeyIndexes = ix.keys.map((k) => accountKeys.findIndex((pk) => pk.equals(k.pubkey)));
  const message = {
    header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
    staticAccountKeys: accountKeys,
    compiledInstructions: [{ programIdIndex, accountKeyIndexes, data: ix.data }],
  };
  const tx = {
    slot: 42,
    transaction: {
      signatures: [Buffer.alloc(64, 7).toString("base64")],
      message: {
        ...message,
        getAccountKeys: () => ({
          staticAccountKeys: accountKeys,
          keySegments: () => [accountKeys],
        }),
        compiledInstructions: message.compiledInstructions,
        header: message.header,
      },
    },
    meta: { err: null },
  } as unknown as VersionedTransactionResponse;
  return { ix, tx, registry: ix.keys[2]!.pubkey };
}

function encodeIssuanceLedger(registry: PublicKey, recipient: PublicKey): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 32 + 1);
  registry.toBuffer().copy(buf, 8);
  receipt.copy(buf, 40);
  recipient.toBuffer().copy(buf, 72);
  return buf;
}

function encodeConsumptionAccount(registry: PublicKey, consumed: boolean): Buffer {
  const buf = Buffer.alloc(8 + 32 + 32 + 32 + 1 + 8 + 8 + 1);
  registry.toBuffer().copy(buf, 8);
  receipt.copy(buf, 40);
  holder.toBuffer().copy(buf, 72);
  buf[104] = consumed ? 1 : 0;
  return buf;
}

describe("verify entitlement transactions", () => {
  it("decodes consumption and rejects not-consumed state", () => {
    const decoded = decodeEntitlementConsumption(encodeConsumptionAccount(admin, false));
    expect(decoded?.consumed).toBe(false);
  });

  it("rejects unrelated successful signature without mint instruction", async () => {
    const connection = {
      getSignatureStatus: vi.fn(async () => ({
        value: { err: null, confirmationStatus: "finalized", slot: 1 },
        context: { slot: 1 },
      })),
      getTransaction: vi.fn(async () => ({
        slot: 1,
        transaction: {
          signatures: [Buffer.alloc(64, 1).toString("base64")],
          message: {
            getAccountKeys: () => ({
              staticAccountKeys: [holder],
              keySegments: () => [[holder]],
            }),
            compiledInstructions: [],
            header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
          },
        },
        meta: { err: null },
      })),
    } as never;
    const result = await verifyMintEntitlementTransaction(connection, "unrelated-sig", {
      holder: holder.toBase58(),
      registryAdmin: admin.toBase58(),
      relyingPartyAdmin: relying.toBase58(),
      receiptIdHash: receipt,
    });
    expect(result).toMatchObject({ ok: false, reason: "chain_transaction_missing_mint_instruction" });
  });

  it("rejects correct signature when holder did not sign", async () => {
    const { tx } = mintFixture();
    const connection = {
      getSignatureStatus: vi.fn(async () => ({
        value: { err: null, confirmationStatus: "finalized" },
        context: { slot: 9 },
      })),
      getTransaction: vi.fn(async () => ({
        ...tx,
        transaction: {
          ...tx.transaction,
          signatures: [Buffer.alloc(64, 0).toString("base64")],
        },
      })),
    } as never;
    const result = await verifyMintEntitlementTransaction(connection, "sig", {
      holder: holder.toBase58(),
      registryAdmin: admin.toBase58(),
      relyingPartyAdmin: relying.toBase58(),
      receiptIdHash: receipt,
    });
    expect(result).toMatchObject({ ok: false, reason: "chain_transaction_holder_not_signer" });
  });

  it("rejects a historical mint under a different Devnet program identity", async () => {
    const { tx } = mintFixture();
    const connection = {
      getSignatureStatus: vi.fn(async () => ({
        value: { err: null, confirmationStatus: "finalized" },
        context: { slot: 12 },
      })),
      getTransaction: vi.fn(async () => tx),
    } as never;
    const result = await verifyMintEntitlementTransaction(connection, "historical-sig", {
      holder: holder.toBase58(),
      registryAdmin: admin.toBase58(),
      relyingPartyAdmin: relying.toBase58(),
      receiptIdHash: receipt,
      programIds: {
        proofContinuity: PublicKey.unique(),
        entitlementConsumer: PublicKey.unique(),
      },
    });
    expect(result).toMatchObject({ ok: false, reason: "chain_transaction_missing_mint_instruction" });
  });

  it("verifies mint when instruction, accounts and post-state match", async () => {
    const { ix, tx, registry } = mintFixture();
    const mintPk = ix.keys[6]!.pubkey;
    const ledgerPk = ix.keys[9]!.pubkey;
    const ata = getAssociatedTokenAddressSync(mintPk, holder, false, TOKEN_2022_PROGRAM_ID);

    const connection = {
      getSignatureStatus: vi.fn(async () => ({
        value: { err: null, confirmationStatus: "finalized" },
        context: { slot: 12 },
      })),
      getTransaction: vi.fn(async () => tx),
      getAccountInfo: vi.fn(async (pk: PublicKey) => {
        if (pk.equals(ledgerPk)) {
          return { data: encodeIssuanceLedger(registry, holder), owner: ix.programId };
        }
        if (pk.equals(ata)) {
          const account = Buffer.alloc(165);
          mintPk.toBuffer().copy(account, 0);
          holder.toBuffer().copy(account, 32);
          account.writeBigUInt64LE(BigInt(1), 64);
          return { data: account, owner: TOKEN_2022_PROGRAM_ID };
        }
        return null;
      }),
    } as never;

    const result = await verifyMintEntitlementTransaction(connection, "mint-sig", {
      holder: holder.toBase58(),
      registryAdmin: admin.toBase58(),
      relyingPartyAdmin: relying.toBase58(),
      receiptIdHash: receipt,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects consumption when account exists but is not consumed", async () => {
    const ix = buildConsumeVerifiedEntitlementInstruction({
      registryAdmin: admin,
      relyingPartyAdmin: relying,
      holder,
      payer: holder,
      receiptIdHash: receipt,
    });
    const consumptionPk = ix.keys[11]!.pubkey;
    const registryPk = ix.keys[5]!.pubkey;
    const messageKeys = [holder];
    for (const key of ix.keys) {
      if (!messageKeys.some((pk) => pk.equals(key.pubkey))) messageKeys.push(key.pubkey);
    }
    if (!messageKeys.some((pk) => pk.equals(ix.programId))) messageKeys.push(ix.programId);
    const programIdIndex = messageKeys.findIndex((pk) => pk.equals(ix.programId));
    const connection = {
      getSignatureStatus: vi.fn(async () => ({
        value: { err: null, confirmationStatus: "finalized" },
        context: { slot: 3 },
      })),
      getTransaction: vi.fn(async () => ({
        transaction: {
          signatures: [Buffer.alloc(64, 2).toString("base64")],
          message: {
            getAccountKeys: () => ({
              staticAccountKeys: messageKeys,
              keySegments: () => [messageKeys],
            }),
            compiledInstructions: [
              {
                programIdIndex,
                accountKeyIndexes: ix.keys.map((k) => messageKeys.findIndex((pk) => pk.equals(k.pubkey))),
                data: ix.data,
              },
            ],
            header: { numRequiredSignatures: 1, numReadonlySignedAccounts: 0, numReadonlyUnsignedAccounts: 0 },
          },
        },
        meta: { err: null },
      })),
      getAccountInfo: vi.fn(async (pk: PublicKey) =>
        pk.equals(consumptionPk)
          ? { data: encodeConsumptionAccount(registryPk, false), owner: ix.programId }
          : null,
      ),
    } as never;

    const result = await verifyConsumeEntitlementTransaction(connection, "consume-sig", {
      holder: holder.toBase58(),
      registryAdmin: admin.toBase58(),
      relyingPartyAdmin: relying.toBase58(),
      receiptIdHash: receipt,
    });
    expect(result).toMatchObject({ ok: false, reason: "chain_state_not_consumed" });
  });
});
