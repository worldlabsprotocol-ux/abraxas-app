import { Connection, PublicKey } from "@solana/web3.js";
import { describe, expect, it, vi } from "vitest";
import { encodeProgramDataAccount, encodeUpgradeableProgramAccount } from "@/lib/partner/onchainGateDeployments/solanaObserve";
import { solanaProgramElfSha256 } from "@/lib/partner/onchainGateDeployments/solanaElfDigest";
import { SOLANA_UPGRADEABLE_LOADER } from "@/lib/partner/onchainGateDeployments/solanaArtifacts";
import { verifyDeployedProgramBytecode } from "./verifyDeployedProgramIdentity";

const admin = PublicKey.unique().toBase58();
const programId = PublicKey.unique().toBase58();
const correctElf = new TextEncoder().encode("proof-continuity-elf-v983");
const wrongElf = new TextEncoder().encode("unexpected-upgrade");

function mockConnection(elf: Uint8Array) {
  const programData = PublicKey.unique().toBase58();
  const accounts = new Map<string, { owner: PublicKey; executable?: boolean; data: Buffer }>([
    [
      programId,
      {
        owner: new PublicKey(SOLANA_UPGRADEABLE_LOADER),
        executable: true,
        data: Buffer.from(encodeUpgradeableProgramAccount(programData)),
      },
    ],
    [
      programData,
      {
        owner: new PublicKey(SOLANA_UPGRADEABLE_LOADER),
        data: Buffer.from(encodeProgramDataAccount(elf, admin)),
      },
    ],
  ]);
  return {
    getAccountInfo: vi.fn(async (pk: PublicKey) => {
      const hit = accounts.get(pk.toBase58());
      if (!hit) return null;
      return hit;
    }),
  } as unknown as Connection;
}

describe("verifyDeployedProgramBytecode", () => {
  it("matches operator-pinned SHA-256", async () => {
    const connection = mockConnection(correctElf);
    const expected = solanaProgramElfSha256(correctElf).slice(2).toLowerCase();
    const result = await verifyDeployedProgramBytecode(connection, programId, expected);
    expect(result).toEqual({ ok: true, sha256_hex: expected });
  });

  it("rejects unexpected program upgrade bytecode", async () => {
    const connection = mockConnection(wrongElf);
    const expected = solanaProgramElfSha256(correctElf).slice(2).toLowerCase();
    const result = await verifyDeployedProgramBytecode(connection, programId, expected);
    expect(result).toMatchObject({ ok: false, code: "program_bytecode_mismatch" });
  });

  it("rejects non-upgradeable loader owner", async () => {
    const connection = {
      getAccountInfo: vi.fn(async () => ({
        owner: PublicKey.unique(),
        executable: true,
        data: Buffer.alloc(36),
      })),
    } as unknown as Connection;
    const result = await verifyDeployedProgramBytecode(connection, programId, "a".repeat(64));
    expect(result).toMatchObject({ ok: false, code: "program_loader_untrusted" });
  });
});