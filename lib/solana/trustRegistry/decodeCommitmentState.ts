import {
  COMMITMENT_STATUS_ACTIVE,
  COMMITMENT_STATUS_REVOKED,
  COMMITMENT_STATUS_SUPERSEDED,
} from "@/lib/solana/trustRegistry/constants";

export type DecodedCommitmentState = {
  commitment_digest: string;
  policy_commitment: string;
  sequence: bigint;
  status: "ACTIVE" | "REVOKED" | "SUPERSEDED" | "UNKNOWN";
  updated_slot: bigint;
};

function readHex32(data: Buffer, offset: number): string {
  return data.subarray(offset, offset + 32).toString("hex");
}

/** Anchor account layout for CommitmentState (after 8-byte discriminator). */
export function decodeCommitmentStateAccount(data: Buffer): DecodedCommitmentState | null {
  if (data.length < 8 + 32 + 32 + 32 + 32 + 8 + 1 + 32 + 32 + 8 + 1) return null;
  const body = data.subarray(8);
  const commitmentDigest = readHex32(body, 64);
  const policyCommitment = readHex32(body, 96);
  const sequence = body.readBigUInt64LE(128);
  const statusByte = body.readUInt8(136);
  const updatedSlot = body.readBigUInt64LE(201);
  const status =
    statusByte === COMMITMENT_STATUS_ACTIVE ? "ACTIVE"
      : statusByte === COMMITMENT_STATUS_REVOKED ? "REVOKED"
        : statusByte === COMMITMENT_STATUS_SUPERSEDED ? "SUPERSEDED"
          : "UNKNOWN";
  return {
    commitment_digest: commitmentDigest,
    policy_commitment: policyCommitment,
    sequence,
    status,
    updated_slot: updatedSlot,
  };
}
