// FILE: lib/auth/webauthn/passkeyLifecycle.vitest.test.ts

import { beforeEach, describe, expect, it } from "vitest";
import { resetNativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  insertNativeAccount,
  insertWebAuthnChallenge,
  consumeWebAuthnChallengeAtomic,
} from "@/lib/auth/nativeAccount/store";

describe("passkey challenge lifecycle (store)", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "true";
    process.env.VITEST = "true";
  });

  it("rejects second atomic consume (replay)", async () => {
    const accountId = createNativeAccountId();
    await insertNativeAccount(accountId);
    const id = await insertWebAuthnChallenge({
      purpose: "register",
      accountId,
      challenge: "challenge-bytes",
      origin: "http://localhost:3025",
      rpId: "localhost",
      ttlSec: 60,
    });
    const first = await consumeWebAuthnChallengeAtomic(id);
    expect(first?.challenge).toBe("challenge-bytes");
    const second = await consumeWebAuthnChallengeAtomic(id);
    expect(second).toBeNull();
  });
});
