// FILE: components/protocol/VerificationPath.test.tsx

import { describe, expect, it } from "vitest";
import { resolveProvenancePathStep } from "./VerificationPath";

describe("resolveProvenancePathStep", () => {
  it("progresses artifact → attest → disclose → integrity", () => {
    expect(
      resolveProvenancePathStep({
        hasFingerprint: false,
        creatorAttested: false,
        submitting: false,
      }),
    ).toBe("artifact");

    expect(
      resolveProvenancePathStep({
        hasFingerprint: true,
        creatorAttested: false,
        submitting: false,
      }),
    ).toBe("attest");

    expect(
      resolveProvenancePathStep({
        hasFingerprint: true,
        creatorAttested: true,
        submitting: false,
      }),
    ).toBe("disclose");

    expect(
      resolveProvenancePathStep({
        hasFingerprint: true,
        creatorAttested: true,
        submitting: true,
      }),
    ).toBe("integrity");
  });
});
