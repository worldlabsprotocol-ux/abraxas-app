import { Connection, PublicKey, type TransactionInstruction } from "@solana/web3.js";
import { buildSolanaEd25519VerifyInstructionData, bytesToHex, decodeSolanaEligibilityMessage } from "@/lib/partner/chainAttestation/solanaMessage";
import { prepareInstitutionalSolanaDevnetProofPacket } from "@/lib/partner/chainAttestation/solanaDevnetProofPacket";
import { inspectInstitutionalSolanaDevnetProof } from "./solanaDevnetProofObserve";
import { SOLANA_DEVNET_GENESIS_HASH } from "./solanaDevnetChainPrecheck";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function decodeBase58(value: string): Uint8Array {
  if (!value) return new Uint8Array();
  const bytes = [0];
  for (const char of value) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) throw new Error("invalid_base58");
    let carry = digit;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 255;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 255); carry >>= 8; }
  }
  const leading = value.match(/^1*/)?.[0].length ?? 0;
  return Uint8Array.from([...Array(leading).fill(0), ...bytes.reverse().slice(leading === value.length ? 1 : 0)]);
}

type ProofInstruction = { programId: string; accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>; data: Uint8Array };
export type ProofTransaction = {
  signature: string; slot: number; blockTime: number | null; succeeded: boolean;
  payer: string; instructions: ProofInstruction[];
};
type Account = { owner: string; data: Uint8Array } | null;
type PublicProof = { ok: true; network_id: "solana_devnet"; signature: string; slot: number;
  gate_program_id: string; consumer_program_id: string; authorization_pda: string; entitlement_pda: string;
  authorization_consumed: true; valid_until: number; currently_valid: boolean;
  replay_broadcast_proven: false; broadcast: false } | { ok: false; reason: string; broadcast: false };

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));
function matches(actual: ProofInstruction, expected: TransactionInstruction): boolean {
  return actual.programId === expected.programId.toBase58()
    && actual.accounts.length === expected.keys.length
    && actual.accounts.every((key, index) => key.pubkey === expected.keys[index]?.pubkey.toBase58()
      && key.isSigner === expected.keys[index]?.isSigner && key.isWritable === expected.keys[index]?.isWritable)
    && same(actual.data, expected.data);
}

/** Pure proof check; the RPC adapter below supplies finalized public observations. */
export async function verifyInstitutionalSolanaDevnetProof(input: {
  transaction: ProofTransaction;
  readAccount: (key: string) => Promise<Account>;
  now?: number;
}): Promise<PublicProof> {
  const fail = (reason: string): PublicProof => ({ ok: false, reason, broadcast: false });
  const tx = input.transaction;
  if (!tx.succeeded || tx.blockTime === null || !Number.isSafeInteger(tx.blockTime) || tx.instructions.length !== 3) return fail("transaction_not_proven");
  const ed = tx.instructions[0];
  if (ed.programId !== "Ed25519SigVerify111111111111111111111111111" || ed.accounts.length !== 0 || ed.data.length !== 580) return fail("instruction_mismatch");
  const publicKey = ed.data.subarray(16, 48);
  const signature = ed.data.subarray(48, 112);
  const message = ed.data.subarray(112);
  const canonicalEd = buildSolanaEd25519VerifyInstructionData({ publicKey, signature, message });
  if (!same(ed.data, canonicalEd.instructionData)) return fail("instruction_mismatch");
  try {
    const fields = decodeSolanaEligibilityMessage(message);
    if (tx.blockTime < fields.issuedAt || tx.blockTime >= fields.expiresAt) return fail("transaction_time_mismatch");
    const expected = prepareInstitutionalSolanaDevnetProofPacket({
      attestation: { solana_message: bytesToHex(message), solana_signature: bytesToHex(signature) },
      signerPublicKey: bytesToHex(publicKey), payer: tx.payer, now: tx.blockTime,
    });
    if (!tx.instructions.every((ix, index) => matches(ix, expected.instructions[index]))) return fail("instruction_mismatch");
    const [authorization, entitlement] = await Promise.all([
      input.readAccount(expected.authorization), input.readAccount(expected.entitlement),
    ]);
    const observed = inspectInstitutionalSolanaDevnetProof({ authorization, entitlement, message });
    if (!observed.ok) return fail(observed.reason);
    return {
      ok: true, network_id: "solana_devnet", signature: tx.signature, slot: tx.slot,
      gate_program_id: expected.instructions[1].programId.toBase58(),
      consumer_program_id: expected.instructions[2].programId.toBase58(),
      authorization_pda: expected.authorization, entitlement_pda: expected.entitlement,
      authorization_consumed: true, valid_until: observed.valid_until,
      currently_valid: observed.valid_until > (input.now ?? Math.floor(Date.now() / 1000)),
      replay_broadcast_proven: false, broadcast: false,
    };
  } catch {
    return fail("proof_mismatch");
  }
}

/** Read-only RPC adapter; accepts only the legacy transaction form emitted by our runner. */
export async function verifyInstitutionalSolanaDevnetSignature(signature: string, connection: Connection): Promise<PublicProof> {
  const fail = (reason: string): PublicProof => ({ ok: false, reason, broadcast: false });
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature)) return fail("invalid_signature");
  try {
    if (await connection.getGenesisHash() !== SOLANA_DEVNET_GENESIS_HASH) return fail("wrong_cluster");
    const observed = await connection.getTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
    if (!observed || observed.meta?.err || observed.transaction.signatures[0] !== signature) return fail("transaction_not_proven");
    const message = observed.transaction.message;
    if (!("accountKeys" in message)) return fail("transaction_not_proven");
    const keys = message.accountKeys.map((key) => key.toBase58());
    const instructions: ProofInstruction[] = message.instructions.map((ix) => ({
      programId: keys[ix.programIdIndex] ?? "",
      accounts: ix.accounts.map((index) => ({ pubkey: keys[index] ?? "",
        isSigner: message.isAccountSigner(index), isWritable: message.isAccountWritable(index) })),
      data: decodeBase58(ix.data),
    }));
    return verifyInstitutionalSolanaDevnetProof({
      transaction: { signature, slot: observed.slot, blockTime: observed.blockTime ?? null,
        succeeded: observed.meta?.err === null, payer: keys[0] ?? "", instructions },
      readAccount: async (key) => {
        const account = await connection.getAccountInfo(new PublicKey(key), "finalized");
        return account ? { owner: account.owner.toBase58(), data: account.data } : null;
      },
    });
  } catch {
    return fail("rpc_unavailable");
  }
}

