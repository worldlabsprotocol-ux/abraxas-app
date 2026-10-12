import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  InstitutionalPreviewIsolationError,
  assertInstitutionalPreviewBoot,
  evaluateInstitutionalPreviewRuntime,
} from "@/lib/product/institutionalPreviewRuntime";

const KEYS = [
  "VERCEL_ENV",
  "ABRAXAS_RUNTIME_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

describe("institutional preview runtime boot", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("passes for preview with non-production Supabase URL", () => {
    const env = {
      VERCEL_ENV: "preview",
      ABRAXAS_RUNTIME_ENV: "preview",
      NEXT_PUBLIC_APP_URL: "https://branch-preview.vercel.app",
      NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
    };
    expect(evaluateInstitutionalPreviewRuntime(env).ok).toBe(true);
    expect(() => assertInstitutionalPreviewBoot(env)).not.toThrow();
  });

  it("fails closed when preview binds production Supabase", () => {
    const env = {
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_APP_URL: "https://branch-preview.vercel.app",
      NEXT_PUBLIC_SUPABASE_URL: "https://bztwutzprwsdrtqdpymf.supabase.co",
    };
    expect(evaluateInstitutionalPreviewRuntime(env).ok).toBe(false);
    expect(() => assertInstitutionalPreviewBoot(env)).toThrow(InstitutionalPreviewIsolationError);
  });
});
