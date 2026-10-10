#!/usr/bin/env npx tsx
// Process or retry Solana receipt commitment for one receipt id (server-side, devnet).

import { processSolanaReceiptCommitment } from "@/lib/decisionReceipts/solanaCommitment/service";

async function main() {
  const receiptId = process.argv[2]?.trim();
  if (!receiptId || !/^dr_[A-Za-z0-9_-]+$/.test(receiptId)) {
    console.error("usage: npx tsx scripts/solana-receipt-commitment-retry.ts <receipt_id>");
    process.exit(2);
  }
  const row = await processSolanaReceiptCommitment(receiptId);
  if (!row) {
    console.log(JSON.stringify({ ok: false, reason: "no_commitment_row" }));
    process.exit(1);
  }
  console.log(JSON.stringify({
    ok: row.status === "CONFIRMED",
    status: row.status,
    transaction_signature: row.transaction_signature,
    failure_class: row.failure_class,
    failure_detail: row.failure_detail,
  }, null, 2));
  process.exit(row.status === "CONFIRMED" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
