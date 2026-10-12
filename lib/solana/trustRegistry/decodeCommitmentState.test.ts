import { describe, expect, it } from "vitest";
import { decodeCommitmentStateAccount } from "@/lib/solana/trustRegistry/decodeCommitmentState";
import { COMMITMENT_STATUS_REVOKED } from "@/lib/solana/trustRegistry/constants";

describe("decodeCommitmentStateAccount", () => {
  it("decodes revoked status from anchor layout bytes", () => {
    const body = Buffer.alloc(210);
    const digest = Buffer.from("a".repeat(64), "hex");
    const policy = Buffer.from("b".repeat(64), "hex");
    digest.copy(body, 64);
    policy.copy(body, 96);
    body.writeBigUInt64LE(BigInt(2), 128);
    body.writeUInt8(COMMITMENT_STATUS_REVOKED, 136);
    body.writeBigUInt64LE(BigInt(999), 201);
    const data = Buffer.concat([Buffer.alloc(8, 1), body]);
    const decoded = decodeCommitmentStateAccount(data);
    expect(decoded?.status).toBe("REVOKED");
    expect(decoded?.sequence).toBe(BigInt(2));
  });
});
