import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import {
  decodeUpgradeableProgramDataAuthority,
  preflightUpgradeAuthorityMatch,
} from "@/lib/solana/trustRegistry/governance/upgradeAuthorityPreflight";

describe("upgrade authority preflight (Build #537)", () => {
  it("decodes ProgramData upgrade authority option", () => {
    const authority = Keypair.generate().publicKey;
    const buf = Buffer.alloc(64);
    buf.writeUInt32LE(3, 0);
    buf.writeBigUInt64LE(BigInt(100), 4);
    buf.writeUInt32LE(1, 12);
    authority.toBuffer().copy(buf, 16);
    expect(decodeUpgradeableProgramDataAuthority(buf)?.equals(authority)).toBe(true);
    expect(preflightUpgradeAuthorityMatch(authority, authority.toBase58())).toBe(true);
  });
});
