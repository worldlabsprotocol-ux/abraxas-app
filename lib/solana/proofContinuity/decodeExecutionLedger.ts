import { anchorAccountDiscriminator } from "./anchorDiscriminator";

const LEDGER_DISCRIMINATOR = anchorAccountDiscriminator("ExecutionLedger");

export function decodeLastExecutionNonce(data: Buffer): bigint | null {
  if (data.length < 8 + 32 + 8) return null;
  if (!data.subarray(0, 8).equals(LEDGER_DISCRIMINATOR)) {
    if (data.length < 40) return BigInt(0);
    return BigInt(0);
  }
  return data.readBigUInt64LE(8 + 32);
}