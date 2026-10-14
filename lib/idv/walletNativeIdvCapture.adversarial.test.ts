// FILE: lib/idv/walletNativeIdvCapture.adversarial.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { createIdentityReviewSession, findActivePendingReviewSession } from "./identityReviewSession";
import { idvDocumentSubjectColumns } from "./holderSubjectIdv";
import { normalizeHolderSubjectKey } from "./holderIdentityRef";

const HS = "abx_hs_aabbccddeeff00112233445566778899";
const SUI = "0x00000000000000000000000000000000000000000000000000000000000000aa";

function mockSupabaseForReviewSession() {
  const rows: Record<string, unknown>[] = [];
  const chain = (): {
    eq: () => ReturnType<typeof chain>;
    maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
  } => ({
    eq: () => chain(),
    maybeSingle: async () => ({
      data: rows.find(r => r.review_status === "pending") ?? null,
    }),
  });
  return {
    from: (table: string) => {
      if (table !== "identity_review_sessions") throw new Error(`unexpected table ${table}`);
      return {
        select: () => chain(),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              rows.push(row);
              return { data: row, error: null };
            },
          }),
        }),
      };
    },
  };
}

describe("wallet-native Abraxas Verify persistence anchors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("stores EVM/Solana holder in holder_subject_id, not sui_address", () => {
    const cols = idvDocumentSubjectColumns(HS);
    expect(cols.holder_subject_id).toBe(HS);
    expect(cols.sui_address).toBeNull();
    expect(normalizeHolderSubjectKey(HS)).toBe(HS);
  });

  it("creates review session with holder_subject_id for chain-neutral capture", async () => {
    const sb = mockSupabaseForReviewSession() as unknown as Parameters<typeof createIdentityReviewSession>[1];
    const result = await createIdentityReviewSession({
      captureSessionId: "cap_test_1",
      suiAddress: HS,
      partnerId: "example-merchant",
    }, sb);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.holder_subject_id).toBe(HS);
      expect(result.session.sui_address).toBeNull();
    }
  });

  it("finds pending review by holder_subject_id", async () => {
    const sb = mockSupabaseForReviewSession() as unknown as Parameters<typeof findActivePendingReviewSession>[0];
    await createIdentityReviewSession({ captureSessionId: "cap_test_2", suiAddress: HS }, sb);
    const pending = await findActivePendingReviewSession(sb, { suiAddress: HS });
    expect(pending?.holder_subject_id).toBe(HS);
  });

  it("legacy Sui capture still uses sui_address column", () => {
    const cols = idvDocumentSubjectColumns(SUI);
    expect(cols.sui_address).toBe(SUI);
    expect(cols.holder_subject_id).toBeNull();
  });
});
