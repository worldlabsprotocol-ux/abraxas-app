import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getSupabaseAdmin,
  requireSupabaseAdmin,
  SupabaseAdminConfigurationError,
} from "./admin";

describe("supabase admin client", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("returns null when service role key is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-should-not-be-used";
    expect(getSupabaseAdmin()).toBeNull();
  });

  it("throws typed configuration error from requireSupabaseAdmin", () => {
    expect(() => requireSupabaseAdmin()).toThrow(SupabaseAdminConfigurationError);
    try {
      requireSupabaseAdmin();
    } catch (err) {
      expect(err).toMatchObject({ code: "supabase_admin_not_configured" });
      expect(String(err)).not.toContain("anon");
    }
  });

  it("creates admin client only with service role key", () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    expect(getSupabaseAdmin()).not.toBeNull();
  });
});
