import { Connection, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

export const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const PROOF_PROGRAM = new PublicKey("CpTXbbnM6crXj1b6WKwuk87bBTYjJWeGRePcJGXS526F");
export const FOUNDER = new PublicKey("3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd");
export const LOADER = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
export const BEFORE_LENGTH = 421_384;
export const BEFORE_SHA256 = "3ffa7393ab712290d4cb1b0eab34d40fa209c67d8718de208d11da689215e368";
export const CANDIDATE_LENGTH = 454_640;
export const CANDIDATE_SHA256 = "a7cde22bc6bbcd6f702af89c75491958c619fe763b1df889026e2bf14d0822be";
export const MAX_LAMPORTS = 2_500_000_000;
export const MAX_ACTIONS = 600;
export const MAX_FEE_PER_ACTION = 100_000;
export const BUFFER_METADATA_LENGTH = 37;
export const PROGRAM_DATA_METADATA_LENGTH = 45;
export const WRITE_CHUNK = 960;
// Keep each legacy transaction below 1,232 bytes. Phantom signs at most this many
// independent writes in one reviewed request; the loader still executes each separately.
export const WRITE_BATCH = 8;
export const LEGACY_TRANSACTION_LIMIT = 1_232;

const account = (pubkey: PublicKey, isWritable = false, isSigner = false) => ({ pubkey, isWritable, isSigner });
const bytes4 = (n: number) => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; };
const bytes8 = (n: number) => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt(n), true); return b; };
const concat = (...parts: Uint8Array[]) => { const b = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0;
  for (const p of parts) { b.set(p, o); o += p.length; } return b; };
const ix = (variant: number, keys: ReturnType<typeof account>[], data = new Uint8Array()) =>
  new TransactionInstruction({ programId: LOADER, keys, data: Buffer.from(concat(bytes4(variant), data)) });
const matches = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
export const hex = (b: Uint8Array) => Array.from(b, v => v.toString(16).padStart(2, "0")).join("");
export async function hash(b: Uint8Array) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", Uint8Array.from(b)))); }
export const programDataAddress = () => PublicKey.findProgramAddressSync([PROOF_PROGRAM.toBuffer()], LOADER)[0];

export async function inspectProgram(rpc: Connection, expectedHash = BEFORE_SHA256, expectedLength = BEFORE_LENGTH) {
  if (await rpc.getGenesisHash() !== DEVNET_GENESIS) throw Error("Wrong Devnet genesis");
  const info = await rpc.getAccountInfo(PROOF_PROGRAM, "finalized");
  if (!info?.executable || !info.owner.equals(LOADER) || info.data.length !== 36 || info.data.readUInt32LE(0) !== 2 ||
      !new PublicKey(info.data.subarray(4)).equals(programDataAddress())) throw Error("Proof program identity mismatch");
  const data = await rpc.getAccountInfo(programDataAddress(), "finalized");
  if (!data?.owner.equals(LOADER) || data.data.length < PROGRAM_DATA_METADATA_LENGTH + expectedLength ||
      data.data.readUInt32LE(0) !== 3 || data.data[12] !== 1 ||
      !new PublicKey(data.data.subarray(13, 45)).equals(FOUNDER)) throw Error("ProgramData authority or allocation mismatch");
  if (await hash(data.data.subarray(PROGRAM_DATA_METADATA_LENGTH, PROGRAM_DATA_METADATA_LENGTH + expectedLength)) !== expectedHash)
    throw Error("Deployed program hash mismatch");
  return { programData: programDataAddress(), allocation: data.data.length - PROGRAM_DATA_METADATA_LENGTH,
    authority: FOUNDER.toBase58(), hash: expectedHash };
}

export async function inspectCandidate(file: Uint8Array, allocation: number) {
  if (file.length !== CANDIDATE_LENGTH || await hash(file) !== CANDIDATE_SHA256 || allocation < file.length)
    throw Error("Candidate ELF or program allocation differs from approved build");
}

export function createBuffer(buffer: PublicKey, rent: number, size = CANDIDATE_LENGTH) {
  if (!Number.isSafeInteger(rent) || rent <= 0 || size !== CANDIDATE_LENGTH) throw Error("Invalid buffer rent or size");
  return [SystemProgram.createAccount({ fromPubkey: FOUNDER, newAccountPubkey: buffer, lamports: rent,
    space: BUFFER_METADATA_LENGTH + size, programId: LOADER }),
    ix(0, [account(buffer, true), account(FOUNDER)])]; // Atomic creation and initialization only.
}

export function writeBuffer(buffer: PublicKey, offset: number, chunk: Uint8Array) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset + chunk.length > CANDIDATE_LENGTH ||
      chunk.length < 1 || chunk.length > WRITE_CHUNK) throw Error("Invalid bounded buffer write");
  return ix(1, [account(buffer, true), account(FOUNDER, false, true)],
    concat(bytes4(offset), bytes8(chunk.length), chunk));
}

export function writeBatch(buffer: PublicKey, elf: Uint8Array, offset: number) {
  if (elf.length !== CANDIDATE_LENGTH || !Number.isSafeInteger(offset) || offset < 0 ||
      offset >= elf.length || offset % WRITE_CHUNK !== 0) throw Error("Invalid batch start");
  const writes = [];
  for (let at = offset; at < elf.length && writes.length < WRITE_BATCH; at += WRITE_CHUNK)
    writes.push({ offset: at, instruction: writeBuffer(buffer, at, elf.subarray(at, at + WRITE_CHUNK)) });
  return writes;
}

export function upgrade(buffer: PublicKey) {
  return ix(3, [account(programDataAddress(), true), account(PROOF_PROGRAM, true), account(buffer, true),
    account(FOUNDER, true), account(SYSVAR_RENT_PUBKEY), account(SYSVAR_CLOCK_PUBKEY), account(FOUNDER, false, true)]);
}

export function closeBuffer(buffer: PublicKey) {
  return ix(5, [account(buffer, true), account(FOUNDER, true), account(FOUNDER, false, true)]);
}

export async function inspectBuffer(rpc: Connection, buffer: PublicKey, elf: Uint8Array) {
  const info = await rpc.getAccountInfo(buffer, "finalized");
  if (!info?.owner.equals(LOADER) || info.data.length !== BUFFER_METADATA_LENGTH + elf.length ||
      info.data.readUInt32LE(0) !== 1 || info.data[4] !== 1 ||
      !new PublicKey(info.data.subarray(5, 37)).equals(FOUNDER)) throw Error("Buffer identity or authority mismatch");
  const data = info.data.subarray(BUFFER_METADATA_LENGTH);
  for (let offset = 0; offset < elf.length; offset += WRITE_CHUNK) {
    const actual = data.subarray(offset, Math.min(offset + WRITE_CHUNK, elf.length));
    const expected = elf.subarray(offset, offset + actual.length);
    if (matches(actual, expected)) continue;
    if (actual.some(byte => byte !== 0)) throw Error(`Conflicting buffer bytes at ${offset}`);
    return { nextOffset: offset, complete: false, lamports: info.lamports };
  }
  if (await hash(data) !== CANDIDATE_SHA256) throw Error("Uploaded buffer hash mismatch");
  return { nextOffset: elf.length, complete: true, lamports: info.lamports };
}

export function enforceBudget(spent: number, debit: number, fee: number) {
  if (![spent, debit, fee].every(Number.isSafeInteger) || spent < 0 || debit < 0 || fee < 0 ||
      fee > MAX_FEE_PER_ACTION || spent + debit + fee > MAX_LAMPORTS)
    throw Error("2.5 Devnet SOL total authorization ceiling exceeded");
}
