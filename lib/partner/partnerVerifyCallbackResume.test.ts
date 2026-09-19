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
    expect(callbackPage).not.toContain("searchParams");
  });

  it("activates server continuation only after browser session is ready", () => {
    const orchestration = readFileSync(
      join(process.cwd(), "lib/partner/partnerVerifyOAuthCallback.ts"),
      "utf8",
    );
    expect(orchestration).toContain("ensureBrowserSessionReady");
    expect(orchestration).toContain("/api/v1/partner-verify/resume/activate");
    expect(orchestration.indexOf("ensureBrowserSessionReady")).toBeLessThan(
      orchestration.indexOf("resume/activate"),
    );
    expect(orchestration).toContain("/passport?signed_in=1");
    expect(orchestration).not.toContain("consumePartnerVerifyResumePath");
    expect(orchestration).toContain("issuedReceipt");
  });

  it("Passport stranded-user copy offers a server-backed return action", () => {
    const cta = readFileSync(
      join(process.cwd(), "components/passport/PartnerVerificationResumeCta.tsx"),
      "utf8",
    );
    expect(cta).toContain("Return to partner verification");
    expect(cta).toContain("/api/v1/partner-verify/resume/activate");
    expect(cta).not.toContain("window.location.href =");
    const passport = readFileSync(join(process.cwd(), "app/passport/page.tsx"), "utf8");
    expect(passport).toContain("PartnerVerificationResumeCta");
  });
});
