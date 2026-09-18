import { describe, expect, it } from "vitest";
import {
  assertPreviewAuditOrigin,
  extractRedirectUriFromGoogleOAuthUrl,
  isForbiddenProductionAuditOrigin,
  PreviewAuditOriginViolation,
  redactOAuthUrlForTrace,
} from "./previewAuditOrigin";

const PREVIEW = "https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app";

describe("previewAuditOrigin", () => {
  it("flags production origins", () => {
    expect(isForbiddenProductionAuditOrigin("https://abraxasworld.xyz")).toBe(true);
    expect(isForbiddenProductionAuditOrigin("https://abraxas-app.vercel.app")).toBe(true);
    expect(isForbiddenProductionAuditOrigin(PREVIEW)).toBe(false);
  });

  it("allows preview, Google, and Vercel SSO during handoff", () => {
    expect(() => assertPreviewAuditOrigin(`${PREVIEW}/partner/verify`, PREVIEW, "entry")).not.toThrow();
    expect(() => assertPreviewAuditOrigin("https://accounts.google.com/v3/signin/identifier", PREVIEW, "google")).not.toThrow();
    expect(() => assertPreviewAuditOrigin("https://vercel.com/login", PREVIEW, "sso")).not.toThrow();
  });

  it("throws when landing on production passport", () => {
    expect(() => assertPreviewAuditOrigin(
      "https://abraxasworld.xyz/passport?sign_in_error=Failed%20to%20save%20identity",
      PREVIEW,
      "passport",
    )).toThrow(PreviewAuditOriginViolation);
  });

  it("redacts OAuth secrets from trace URLs", () => {
    const redacted = redactOAuthUrlForTrace(
      "https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https%3A%2F%2Fpreview.example%2Fauth%2Fzklogin%2Fcallback&state=secret&nonce=secret",
    );
    expect(redacted).toContain("redirect_uri=");
    expect(redacted).not.toContain("state=secret");
    expect(redacted).toContain("state=%5BREDACTED%5D");
  });

  it("extracts redirect_uri from Google OAuth URL", () => {
    const uri = extractRedirectUriFromGoogleOAuthUrl(
      "https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https%3A%2F%2Fpreview.example%2Fauth%2Fzklogin%2Fcallback&client_id=x",
    );
    expect(uri).toBe("https://preview.example/auth/zklogin/callback");
  });
});
