import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RECEIPT_COMMITMENT_STATUS } from "./constants";
import { decodeReceiptCommitmentAccount } from "./decodeCommitment";

/** Bytes from `blockchain_native_journey` ProgramTest (`DUMP_PROOF_CONTINUITY_COMMITMENT_HEX=1`). */
const FIXTURE_HEX = readFileSync(
  join(__dirname, "fixtures/programtest-commitment-account.hex"),
  "utf8",
).trim();

describe("decodeReceiptCommitmentAccount rust parity", () => {
  it("decodes ProgramTest-serialized commitment with little-endian numerics", () => {
    const data = Buffer.from(FIXTURE_HEX, "hex");
    const decoded = decodeReceiptCommitmentAccount(data);
    expect(decoded).not.toBeNull();
    expect(decoded!.receipt_id_hash).toBe(Buffer.alloc(32, 0x15).toString("hex"));
    expect(decoded!.payload_hash).toBe(Buffer.alloc(32, 0x0f).toString("hex"));
    expect(decoded!.expires_at).toBe(9_000_000_000);
    expect(decoded!.status).toBe(RECEIPT_COMMITMENT_STATUS.active);
    expect(decoded!.status_version).toBe(BigInt(1));
  });
});