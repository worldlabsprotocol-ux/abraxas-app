// FILE: lib/auth/holderSubject/holderSubject.test.ts

import { describe, expect, it } from "vitest";
import { createHolderSubjectId, isChainNeutralHolderSubjectId } from "./subjectId";
import { caip10Evm, caip10Solana } from "./caip";

describe("holder subject model", () => {
  it("creates abx_hs subject ids", () => {
    const id = createHolderSubjectId();
    expect(isChainNeutralHolderSubjectId(id)).toBe(true);
  });

  it("formats CAIP-10 accounts", () => {
    expect(caip10Evm(1, "0x0000000000000000000000000000000000000001").caip10)
      .toBe("eip155:1:0x0000000000000000000000000000000000000001");
    expect(caip10Solana("devnet", "11111111111111111111111111111111").namespace).toBe("solana");
  });
});
