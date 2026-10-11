import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  evaluateSandboxSupabaseTarget,
  parseInstitutionalSandboxAllowlistRefs,
} from "@/lib/institutional/sandbox/sandboxProjectAllowlist";

describe("sandboxProjectAllowlist", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("blocks without explicit environment id", () => {
    delete process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID;
    const r = evaluateSandboxSupabaseTarget({
      supabaseUrl: "https://ocntwbxarpjeixdnzide.supabase.co",
    });
    expect(r.verdict).toBe("BLOCKED");
  });

  it("rejects production ref", () => {
    process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID = "test-sandbox";
    const r = evaluateSandboxSupabaseTarget({
      supabaseUrl: "https://bztwutzprwsdrtqdpymf.supabase.co",
    });
    expect(r.verdict).toBe("FAIL");
    expect(r.is_production_ref).toBe(true);
  });

  it("passes allowlisted demo ref", () => {
    process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID = "demo-sandbox";
    const r = evaluateSandboxSupabaseTarget({
      supabaseUrl: "https://ocntwbxarpjeixdnzide.supabase.co",
    });
    expect(r.verdict).toBe("PASS");
  });

  it("parses custom allowlist", () => {
    process.env.INSTITUTIONAL_SANDBOX_ALLOWED_PROJECT_REFS = "aaa,bbb";
    expect(parseInstitutionalSandboxAllowlistRefs()).toEqual(["aaa", "bbb"]);
  });
});
