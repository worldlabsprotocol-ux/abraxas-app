import { describe, expect, it } from "vitest";
import { runSolanaNativeDemoPreflight } from "@/lib/integration/solanaNativeDemoPreflight";

describe("solanaNativeDemoPreflight", () => {
  it("flags missing supabase config", async () => {
    const result = await runSolanaNativeDemoPreflight({ env: {} });
    const supa = result.checks.find(c => c.id === "supabase_config");
    expect(supa?.status).toBe("fail");
  });

  it("recognizes demo project ref", async () => {
    const result = await runSolanaNativeDemoPreflight({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "x",
        ABRAXAS_SOLANA_NATIVE: "true",
      },
    });
    const demo = result.checks.find(c => c.id === "demo_supabase_project");
    expect(demo?.status).toBe("pass");
  });
});
