import { describe, expect, it } from "vitest";
import { auditRuntimeSupabaseBinding } from "@/lib/supabase/runtimeSupabaseBinding";

const DEMO = "ocntwbxarpjeixdnzide";
const MAIN = "bztwutzprwsdrtqdpymf";

function demoJwt(ref: string, role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ ref, role })).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("auditRuntimeSupabaseBinding", () => {
  it("reports all DEMO refs when env matches demo project", () => {
    const audit = auditRuntimeSupabaseBinding({
      url: `https://${DEMO}.supabase.co`,
      anonKey: demoJwt(DEMO, "anon"),
      serviceRoleKey: demoJwt(DEMO, "service_role"),
    });
    expect(audit.all_match_demo).toBe(true);
    expect(audit.production_ref_detected).toBe(false);
    expect(audit.url_project_ref).toBe(DEMO);
    expect(audit.anon_key_project_ref).toBe(DEMO);
    expect(audit.service_role_key_project_ref).toBe(DEMO);
  });

  it("flags production ref on URL", () => {
    const audit = auditRuntimeSupabaseBinding({
      url: `https://${MAIN}.supabase.co`,
      anonKey: demoJwt(DEMO, "anon"),
      serviceRoleKey: demoJwt(DEMO, "service_role"),
    });
    expect(audit.all_match_demo).toBe(false);
    expect(audit.production_ref_detected).toBe(true);
    expect(audit.url_matches_demo).toBe(false);
  });
});
