// FILE: lib/passport/portableTrust/holderReceiptAccess.ts

import {
  getReceiptOwnedBySubject,
  listApprovedReceiptsForSubject,
} from "@/lib/decisionReceipts/service";
import { summarizeHolderPortableCredential } from "./presentationBundle";
import type { HolderPortableCredentialSummary } from "./contract";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

export async function listHolderPortableCredentials(input: {
  subjectId: string;
  limit?: number;
}): Promise<HolderPortableCredentialSummary[]> {
  const receipts = await listApprovedReceiptsForSubject(input.subjectId, input.limit ?? 25);
  return receipts.map(summarizeHolderPortableCredential);
}

export async function getHolderReceiptIfOwned(input: {
  subjectId: string;
  receiptId: string;
}): Promise<DecisionReceiptRecord | null> {
  return getReceiptOwnedBySubject(input);
}
