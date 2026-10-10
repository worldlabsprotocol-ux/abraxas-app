import { describe, expect, it } from "vitest";
import { assertDemoSupabaseNotProduction } from "@/lib/release/demoEnvironmentSafety";

describe("demoEnvironmentSafety", () => {
  it("rejects production Supabase ref", () => {
    const r = assertDemoSupabaseNotProduction({
      supabaseUrl: "https://bztwutzprwsdrtqdpymf.supabase.co",
    });
    expect(r.verdict).toBe("fail");
    expect(r.isProductionRef).toBe(true);
  });

  it("accepts canonical demo ref", () => {
    const r = assertDemoSupabaseNotProduction({
      supabaseUrl: "https://ocntwbxarpjeixdnzide.supabase.co",
    });
    expect(r.verdict).toBe("pass");
  });
});
