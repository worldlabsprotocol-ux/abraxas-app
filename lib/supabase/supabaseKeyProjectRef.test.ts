import { describe, expect, it } from "vitest";
import {
  classifySupabaseServiceRoleKeyShape,
  supabaseJwtProjectRef,
  supabaseJwtRole,
} from "./supabaseKeyProjectRef";

const SERVICE_ROLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6dHd1dHpwcndzZHJ0cWRweW1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU0NTQxOSwiZXhwIjoyMDk0MTIxNDE5fQ.test";

describe("supabaseKeyProjectRef", () => {
  it("derives project ref and role without logging key material", () => {
    expect(supabaseJwtProjectRef(SERVICE_ROLE_JWT)).toBe("bztwutzprwsdrtqdpymf");
    expect(supabaseJwtRole(SERVICE_ROLE_JWT)).toBe("service_role");
    expect(classifySupabaseServiceRoleKeyShape(SERVICE_ROLE_JWT)).toBe("jwt");
  });

  it("classifies bracket-wrapped keys for forensic boundary checks", () => {
    expect(classifySupabaseServiceRoleKeyShape(`[${SERVICE_ROLE_JWT}]`)).toBe("bracket_wrapped");
    expect(supabaseJwtProjectRef(`[${SERVICE_ROLE_JWT}]`)).toBe("bztwutzprwsdrtqdpymf");
  });
});
