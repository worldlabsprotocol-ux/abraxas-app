// FILE: lib/persistence/boundary/verticalSlice/supersessionRead.ts

import { querySovereignStagingPg } from "../sovereignStagingPg";

type SupersessionRow = {
  superseded_receipt_id: string;
  superseding_receipt_id: string;
  scope: string;
  superseded_at: string;
};

export async function isReceiptSupersededOnSovereignPg(
  receiptId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<
  | { superseded: false }
  | { superseded: true; superseding_receipt_id: string; scope: string; superseded_at: string }
  | { superseded: false; store_unavailable: true }
> {
  const result = await querySovereignStagingPg<SupersessionRow>(
    `select superseded_receipt_id, superseding_receipt_id, scope, superseded_at
       from public.decision_receipt_supersessions
      where superseded_receipt_id = $1
      limit 1`,
    [receiptId],
    env,
  );
  if ("error" in result) return { superseded: false, store_unavailable: true };
  const row = result.rows[0];
  if (!row) return { superseded: false };
  return {
    superseded: true,
    superseding_receipt_id: row.superseding_receipt_id,
    scope: row.scope,
    superseded_at: row.superseded_at,
  };
}
