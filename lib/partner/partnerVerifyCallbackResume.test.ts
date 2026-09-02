// FILE: lib/partner/partnerVerifyCallbackResume.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("zklogin callback partner verify resume", () => {
  it("consumes saved partner verify path after OAuth completion", () => {
    const source = readFileSync(
      join(process.cwd(), "app/auth/zklogin/callback/page.tsx"),
      "utf8",
    );
    expect(source).toContain("consumePartnerVerifyResumePath");
    expect(source).toContain("router.replace(resumePath ?? \"/passport?signed_in=1\")");
  });
});
