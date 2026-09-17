// FILE: lib/preview/passportSignInAssertions.ts
// Assertions for signed-out Passport — Google sign-in must not surface document/KYC UI.

export interface PassportSignInSurfaceCheck {
  ok: boolean;
  accountOnlyCopyVisible: boolean;
  documentUiVisible: boolean;
  detail: string;
}

/** Marketing copy that mentions verification but is not a document prompt. */
const ALLOWED_VERIFICATION_CONTEXT = /when a participating service|only when a service|reusable private verification/i;

/**
 * Detect document / KYC capture UI — not generic "verification" marketing copy.
 */
export function pageHtmlShowsDocumentCaptureUi(html: string): boolean {
  const hasFileInput = /<input[^>]+type=["']file["']/i.test(html);
  const hasIdentityCapture = /AbraxasIdentityCapture|identity-capture|upload your id|upload a file|choose a file/i.test(html);
  const hasVeriff = /veriff\.me|createVeriffFrame|start.*id verification/i.test(html);
  const hasExplicitIdPrompt = /add verified information|upload.*document|government id|passport image/i.test(html);

  if (hasFileInput || hasIdentityCapture || hasVeriff || hasExplicitIdPrompt) {
    return true;
  }

  const mentionsVerification = /start.*verification|identity verification required/i.test(html);
  if (mentionsVerification && !ALLOWED_VERIFICATION_CONTEXT.test(html)) {
    return true;
  }

  return false;
}

export function evaluatePassportSignInSurface(html: string): PassportSignInSurfaceCheck {
  const accountOnlyCopyVisible = /Creates your account only/i.test(html)
    && /No documents or ID checks at sign-in/i.test(html);
  const documentUiVisible = pageHtmlShowsDocumentCaptureUi(html);

  if (accountOnlyCopyVisible && !documentUiVisible) {
    return {
      ok: true,
      accountOnlyCopyVisible: true,
      documentUiVisible: false,
      detail: "account-only copy visible; no document/KYC UI on load",
    };
  }

  if (documentUiVisible) {
    return {
      ok: false,
      accountOnlyCopyVisible,
      documentUiVisible: true,
      detail: "document or KYC capture UI visible before Google sign-in",
    };
  }

  return {
    ok: false,
    accountOnlyCopyVisible,
    documentUiVisible: false,
    detail: accountOnlyCopyVisible
      ? "account-only copy present but secondary checks failed"
      : "missing account-only sign-in copy",
  };
}
