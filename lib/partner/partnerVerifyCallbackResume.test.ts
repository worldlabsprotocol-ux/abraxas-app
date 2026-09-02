// FILE: lib/partner/partnerVerifyCallbackResume.test.ts

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("zklogin callback partner verify resume", () => {
  it("delegates OAuth completion to partner verify callback orchestration", () => {
    const callbackPage = readFileSync(
      join(process.cwd(), "app/auth/zklogin/callback/page.tsx"),
      "utf8",
    );
    expect(callbackPage).toContain("completePartnerVerifyOAuthCallback");
    expect(callbackPage).toContain("router.replace(redirectPath)");
  });

  it("consumes saved partner verify path only after browser session is ready", () => {
    const orchestration = readFileSync(
      join(process.cwd(), "lib/partner/partnerVerifyOAuthCallback.ts"),
      "utf8",
    );
    expect(orchestration).toContain("ensureBrowserSessionReady");
    expect(orchestration).toContain("consumePartnerVerifyResumePath");
    expect(orchestration.indexOf("ensureBrowserSessionReady")).toBeLessThan(
      orchestration.indexOf("consumePartnerVerifyResumePath"),
    );
    expect(orchestration).toContain("appendPartnerAuthReadyQuery");
  });
});
