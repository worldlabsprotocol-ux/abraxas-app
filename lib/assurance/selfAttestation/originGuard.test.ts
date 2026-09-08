// FILE: lib/assurance/selfAttestation/originGuard.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertSelfAttestOrigin } from "./originGuard";
import { SITE_URL } from "@/lib/siteUrl";

const PREVIEW_ORIGIN =
  "https://abraxas-app-git-cursor-ti-871cb8-worldlabsprotocol-uxs-projects.vercel.app";
const PREVIEW_HOST = "abraxas-app-git-cursor-ti-871cb8-worldlabsprotocol-uxs-projects.vercel.app";
const VERCEL_URL_ALIAS = "abraxas-app-abc123-worldlabsprotocol-uxs-projects.vercel.app";

function selfAttestRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("https://example.test/api/age-assurance/self-attest", {
    method: "POST",
    headers,
  });
}

describe("assertSelfAttestOrigin", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows Vercel Preview with NODE_ENV=production and forwarded host alias", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", VERCEL_URL_ALIAS);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        origin: PREVIEW_ORIGIN,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects Vercel Production with the same Preview Origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        origin: PREVIEW_ORIGIN,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("allows exact Preview same-origin request", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        origin: PREVIEW_ORIGIN,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("allows canonical Production origin", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: "abraxasworld.xyz",
        origin: SITE_URL,
      }),
    );

    expect(result).toEqual({ ok: true });
  });

  it("rejects attacker.vercel.app", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
        origin: "https://attacker.vercel.app",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("rejects abraxasworld.xyz.attacker.com", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: "abraxasworld.xyz",
        origin: "https://abraxasworld.xyz.attacker.com",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("rejects null origin", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        origin: "null",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("requires origin outside development when Origin and Referer are missing", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);
    vi.stubEnv("NODE_ENV", "production");

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_required" });
  });

  it("rejects forwarded-host spoof against trusted production host", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: "abraxasworld.xyz",
        "x-forwarded-host": "attacker.vercel.app",
        origin: "https://attacker.vercel.app",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("rejects cross-origin request on preview deployment", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
        origin: SITE_URL,
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("rejects malformed origin", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", PREVIEW_HOST);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        host: PREVIEW_HOST,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
        origin: "not-a-valid-origin",
      }),
    );

    expect(result).toEqual({ ok: false, code: "origin_not_allowed" });
  });

  it("does not treat NODE_ENV=production alone as Vercel Production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", SITE_URL);

    const result = assertSelfAttestOrigin(
      selfAttestRequest({
        origin: PREVIEW_ORIGIN,
        "x-forwarded-host": PREVIEW_HOST,
        "x-forwarded-proto": "https",
      }),
    );

    expect(result).toEqual({ ok: true });
  });
});
