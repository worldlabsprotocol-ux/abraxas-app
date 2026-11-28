import { describe, expect, it, vi } from "vitest";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { BEFORE_SHA256, CANDIDATE_LENGTH, closeBuffer, createBuffer, DEVNET_GENESIS,
  enforceBudget, FOUNDER, hash, inspectBuffer, inspectCandidate, inspectProgram, LOADER, MAX_ACTIONS, MAX_FEE_PER_ACTION, MAX_LAMPORTS,
  programDataAddress, PROOF_PROGRAM, upgrade, writeBatch, writeBuffer, WRITE_BATCH, WRITE_CHUNK,
  LEGACY_TRANSACTION_LIMIT } from "./devnetProofUpgrade";

const buffer = Keypair.generate().publicKey;

describe("founder-signed upgradeable-loader instructions", () => {
  it("atomically creates and initializes a founder-controlled buffer", () => {
    const [create, initialize] = createBuffer(buffer, 2_329_916_600);
    expect(create.programId.equals(SystemProgram.programId)).toBe(true);
    expect(create.keys[0].pubkey.equals(FOUNDER)).toBe(true);
    expect(create.keys[1].pubkey.equals(buffer) && create.keys[1].isSigner).toBe(true);
    expect(initialize.programId.equals(LOADER)).toBe(true);
    expect(initialize.data.readUInt32LE(0)).toBe(0);
    expect(initialize.keys[1].pubkey.equals(FOUNDER)).toBe(true);
  });

  it("bounds writes and requires founder authorization", () => {
    const ix = writeBuffer(buffer, 800, new Uint8Array(WRITE_CHUNK));
    expect(ix.data.readUInt32LE(0)).toBe(1);
    expect(ix.data.readUInt32LE(4)).toBe(800);
    expect(ix.keys[1].pubkey.equals(FOUNDER) && ix.keys[1].isSigner).toBe(true);
    expect(() => writeBuffer(buffer, CANDIDATE_LENGTH, new Uint8Array(1))).toThrow();
    expect(() => writeBuffer(buffer, 0, new Uint8Array(WRITE_CHUNK + 1))).toThrow();
  });

  it("packs each full write below the legacy limit and bounds the reviewed batch", () => {
    const elf = new Uint8Array(CANDIDATE_LENGTH);
    const batch = writeBatch(buffer, elf, 0);
    expect(batch).toHaveLength(WRITE_BATCH);
    expect(batch.map(x => x.offset)).toEqual(Array.from({ length: WRITE_BATCH }, (_, n) => n * WRITE_CHUNK));
    for (const { instruction } of batch) {
      const tx = new Transaction({ feePayer: FOUNDER, recentBlockhash: Keypair.generate().publicKey.toBase58() })
        .add(instruction);
      expect(tx.serialize({ requireAllSignatures: false, verifySignatures: false }).length)
        .toBeLessThanOrEqual(LEGACY_TRANSACTION_LIMIT);
    }
    const tail = writeBatch(buffer, elf, Math.floor((elf.length - 1) / WRITE_CHUNK) * WRITE_CHUNK);
    expect(tail).toHaveLength(1);
    expect(() => writeBatch(buffer, elf, 1)).toThrow("Invalid batch start");
  });

  it("requires separate founder signatures for upgrade or recovery close", () => {
    const u = upgrade(buffer); const c = closeBuffer(buffer);
    expect(u.data.readUInt32LE(0)).toBe(3);
    expect(u.keys[0].pubkey.equals(programDataAddress())).toBe(true);
    expect(u.keys.at(-1)?.pubkey.equals(FOUNDER)).toBe(true);
    expect(u.keys.at(-1)?.isSigner).toBe(true);
    expect(c.data.readUInt32LE(0)).toBe(5);
    expect(c.keys.at(-1)?.isSigner).toBe(true);
  });

  it("fails closed above the full 2.5 SOL debit ceiling", () => {
    expect(() => enforceBudget(100_000_000, 2_329_916_600, 10_000)).not.toThrow();
    expect(() => enforceBudget(200_000_000, 2_329_916_600, 10_000)).toThrow();
    expect(() => enforceBudget(-1, 0, 0)).toThrow();
    expect(() => enforceBudget(0, 0, MAX_FEE_PER_ACTION + 1)).toThrow();
    expect(MAX_ACTIONS).toBeGreaterThan(Math.ceil(CANDIDATE_LENGTH / WRITE_CHUNK) + 1);
    expect(2_310_409_400 + MAX_ACTIONS * MAX_FEE_PER_ACTION).toBeLessThan(MAX_LAMPORTS);
    expect(MAX_LAMPORTS).toBe(2_500_000_000);
  });
});

describe("finalized upgrade preflight", () => {
  it("checks genesis, owner, ProgramData PDA, authority, and exact ELF hash", async () => {
    const program = Buffer.alloc(36); program.writeUInt32LE(2, 0);
    programDataAddress().toBuffer().copy(program, 4);
    const elf = new Uint8Array([1, 2, 3, 4]);
    const data = Buffer.alloc(45 + elf.length); data.writeUInt32LE(3, 0);
    data[12] = 1; FOUNDER.toBuffer().copy(data, 13); data.set(elf, 45);
    const rpc = { getGenesisHash: vi.fn(async () => DEVNET_GENESIS),
      getAccountInfo: vi.fn(async (key: PublicKey) => key.equals(PROOF_PROGRAM)
        ? { executable: true, owner: LOADER, data: program }
        : { owner: LOADER, data }) };
    const expected = await hash(elf);
    expect((await inspectProgram(rpc as never, expected, elf.length)).hash).toBe(expected);
    await expect(inspectProgram(rpc as never, BEFORE_SHA256, elf.length)).rejects.toThrow("hash mismatch");
    data.set(Keypair.generate().publicKey.toBytes(), 13);
    await expect(inspectProgram(rpc as never, expected, elf.length)).rejects.toThrow("authority");
    rpc.getGenesisHash.mockResolvedValue("wrong cluster");
    await expect(inspectProgram(rpc as never, expected, elf.length)).rejects.toThrow("genesis");
  });

  it("rejects a different candidate binary even at the correct length", async () => {
    await expect(inspectCandidate(new Uint8Array(CANDIDATE_LENGTH), CANDIDATE_LENGTH + 1)).rejects.toThrow("ELF");
    await expect(inspectCandidate(new Uint8Array(8), CANDIDATE_LENGTH + 1)).rejects.toThrow("ELF");
  });

  it("will not repeat a conflicting or foreign-authorized buffer write", async () => {
    const elf = new Uint8Array(CANDIDATE_LENGTH).fill(1);
    const data = Buffer.alloc(37 + elf.length);
    data.writeUInt32LE(1, 0); data[4] = 1; FOUNDER.toBuffer().copy(data, 5);
    const rpc = { getAccountInfo: vi.fn(async () => ({ owner: LOADER, data, lamports: 2_310_409_400 })) };
    expect((await inspectBuffer(rpc as never, buffer, elf)).nextOffset).toBe(0);
    data[37] = 2;
    await expect(inspectBuffer(rpc as never, buffer, elf)).rejects.toThrow("Conflicting buffer bytes");
    data[37] = 0; Keypair.generate().publicKey.toBuffer().copy(data, 5);
    await expect(inspectBuffer(rpc as never, buffer, elf)).rejects.toThrow("authority mismatch");
  });
});
