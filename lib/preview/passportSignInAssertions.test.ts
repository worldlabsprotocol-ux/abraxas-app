// FILE: lib/preview/passportSignInAssertions.test.ts

import { describe, expect, it } from "vitest";
import { evaluatePassportSignInSurface, pageHtmlShowsDocumentCaptureUi } from "./passportSignInAssertions";
import { ZKLOGIN_SIGN_IN_COPY } from "@/lib/sui/zklogin/signInCopy";

describe("passportSignInAssertions", () => {
  it("does not treat marketing verification copy as document UI", () => {
    const html = `
      <p>Keep and reuse private proof with participating services.</p>
      <p>${ZKLOGIN_SIGN_IN_COPY.canonicalHelper}</p>
      <button>Continue with Google</button>
    `;
    expect(pageHtmlShowsDocumentCaptureUi(html)).toBe(false);
    expect(evaluatePassportSignInSurface(html).ok).toBe(true);
  });

  it("flags file upload and identity capture as document UI", () => {
    expect(pageHtmlShowsDocumentCaptureUi('<input type="file" />')).toBe(true);
    expect(pageHtmlShowsDocumentCaptureUi("Upload your ID for manual review")).toBe(true);
  });

  it("PASS detail is unambiguous when account-only copy is shown", () => {
    const result = evaluatePassportSignInSurface(
      `<p>${ZKLOGIN_SIGN_IN_COPY.canonicalHelper}</p><button>Continue with Google</button>`,
    );
    expect(result.ok).toBe(true);
    expect(result.detail).toContain("no document/KYC UI");
    expect(result.detail).not.toContain("document prompt on load");
  });
});
