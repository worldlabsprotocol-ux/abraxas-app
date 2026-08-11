import { describe, expect, it } from "vitest";
import {
  DemoProjectGuardError,
  collectProductionDeniedRefs,
  maskProjectRef,
  maskSubjectId,
  maskSupabaseUrl,
  parseSupabaseProjectRef,
  redactSecrets,
  validateReadOnlyDemoConfig,
} from "./demoProjectGuard";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";

const KNOWN_PRODUCTION_REFS = ["known-production-ref"] as const;
const PRODUCTION_REF = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS[0];
const DEMO_REF = "isolated-demo-project-ref";

describe("immutable production denylist", () => {
  const validDemoEnv = {
    DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
    PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
    NEXT_PUBLIC_SUPABASE_URL: `https://${DEMO_REF}.supabase.co`,
  };

  it("always rejects targeting the repository production ref", () => {
    expect(() =>
      validateReadOnlyDemoConfig({
        DEMO_SUPABASE_PROJECT_REF: PRODUCTION_REF,
        PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      }),
    ).toThrowError(expect.objectContaining({ code: "demo_equals_production" }));

    expect(() =>
      validateReadOnlyDemoConfig({
        DEMO_SUPABASE_PROJECT_REF: DEMO_REF,
        PRODUCTION_SUPABASE_PROJECT_REF: PRODUCTION_REF,
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      }),
    ).toThrowError(expect.objectContaining({ code: "target_is_production" }));
  });

  it("does not allow a fake PRODUCTION_SUPABASE_PROJECT_REF to bypass the immutable denylist", () => {
    expect(() =>
      validateReadOnlyDemoConfig({
        DEMO_SUPABASE_PROJECT_REF: PRODUCTION_REF,
        PRODUCTION_SUPABASE_PROJECT_REF: "fake-production-ref",
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_REF}.supabase.co`,
      }),
    ).toThrowError(expect.objectContaining({ code: "production_ref_unknown" }));
  });

  it("accepts the correct production safety input only when it matches the immutable denylist", () => {
    const config = validateReadOnlyDemoConfig(validDemoEnv);
    expect(config.productionProjectRef).toBe(PRODUCTION_REF);
    expect(config.demoProjectRef).toBe(DEMO_REF);

    expect(() =>
      validateReadOnlyDemoConfig({
        ...validDemoEnv,
        PRODUCTION_SUPABASE_PROJECT_REF: "not-the-production-ref",
      }),
    ).toThrowError(expect.objectContaining({ code: "production_ref_unknown" }));
  });

  it("allows a separate demo project ref to pass", () => {
    const config = validateReadOnlyDemoConfig(validDemoEnv);
    expect(config.demoProjectRef).toBe(DEMO_REF);
    expect(config.demoProjectRef).not.toBe(PRODUCTION_REF);
  });

  it("masks the full production ref in formatted output", () => {
    const masked = maskProjectRef(PRODUCTION_REF);
    expect(masked).not.toBe(PRODUCTION_REF);
    expect(masked).not.toContain(PRODUCTION_REF);
    expect(maskSupabaseUrl(`https://${PRODUCTION_REF}.supabase.co`)).not.toContain(PRODUCTION_REF);
  });

  it("cannot be overridden or removed through environment variables", () => {
    const denied = collectProductionDeniedRefs(
      {
        PRODUCTION_SUPABASE_PROJECT_REF: "fake-production-ref",
        DEMO_DENIED_SUPABASE_PROJECT_REFS: "",
        KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS: "attempted-override-ref",
      } as Record<string, string>,
    );

    expect(denied.has(PRODUCTION_REF)).toBe(true);
    expect(denied.has("attempted-override-ref")).toBe(false);
    expect(KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS).toEqual([PRODUCTION_REF]);
  });
});

describe("demoProjectGuard", () => {
  const baseEnv = {
    DEMO_SUPABASE_PROJECT_REF: "demo-project-ref",
    PRODUCTION_SUPABASE_PROJECT_REF: "known-production-ref",
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-project-ref.supabase.co",
  };

  it("accepts matching demo ref when production ref is known", () => {
    const config = validateReadOnlyDemoConfig(baseEnv, {
      knownProductionRefs: KNOWN_PRODUCTION_REFS,
    });
    expect(config.demoProjectRef).toBe("demo-project-ref");
    expect(config.productionProjectRef).toBe("known-production-ref");
    expect(config.maskedSupabaseUrl).toContain("demo");
    expect(config.maskedSupabaseUrl).not.toContain("demo-project-ref");
  });

  it("rejects targeting a known production ref even when env production ref is fake", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          DEMO_SUPABASE_PROJECT_REF: "known-production-ref",
          PRODUCTION_SUPABASE_PROJECT_REF: "fake-production-ref",
          NEXT_PUBLIC_SUPABASE_URL: "https://known-production-ref.supabase.co",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrowError(expect.objectContaining({ code: "production_ref_unknown" }));
  });

  it("rejects URL target that points at a denied production ref", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          DEMO_SUPABASE_PROJECT_REF: "demo-project-ref",
          PRODUCTION_SUPABASE_PROJECT_REF: "known-production-ref",
          NEXT_PUBLIC_SUPABASE_URL: "https://known-production-ref.supabase.co",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrowError(expect.objectContaining({ code: "target_is_production" }));
  });

  it("rejects ref mismatch", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          ...baseEnv,
          NEXT_PUBLIC_SUPABASE_URL: "https://other-ref.supabase.co",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrow(DemoProjectGuardError);
  });

  it("rejects missing production ref", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          ...baseEnv,
          PRODUCTION_SUPABASE_PROJECT_REF: "",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrowError(expect.objectContaining({ code: "production_ref_missing" }));
  });

  it("rejects unknown production ref", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          ...baseEnv,
          PRODUCTION_SUPABASE_PROJECT_REF: "not-in-known-list",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrowError(expect.objectContaining({ code: "production_ref_unknown" }));
  });

  it("rejects demo equals production", () => {
    expect(() =>
      validateReadOnlyDemoConfig(
        {
          DEMO_SUPABASE_PROJECT_REF: "known-production-ref",
          PRODUCTION_SUPABASE_PROJECT_REF: "known-production-ref",
          NEXT_PUBLIC_SUPABASE_URL: "https://demo-project-ref.supabase.co",
        },
        { knownProductionRefs: KNOWN_PRODUCTION_REFS },
      ),
    ).toThrowError(expect.objectContaining({ code: "demo_equals_production" }));
  });

  it("includes additional operator denylist refs", () => {
    const denied = collectProductionDeniedRefs(
      {
        PRODUCTION_SUPABASE_PROJECT_REF: "known-production-ref",
        DEMO_DENIED_SUPABASE_PROJECT_REFS: "extra-ref,another-ref",
      },
      KNOWN_PRODUCTION_REFS,
    );
    expect(denied.has("known-production-ref")).toBe(true);
    expect(denied.has("extra-ref")).toBe(true);
    expect(denied.has("another-ref")).toBe(true);
  });

  it("rejects malformed supabase URL", () => {
    expect(() => parseSupabaseProjectRef("not-a-url")).toThrow(DemoProjectGuardError);
    expect(() => parseSupabaseProjectRef("http://demo-project-ref.supabase.co")).toThrow(
      DemoProjectGuardError,
    );
    expect(() => parseSupabaseProjectRef("https://example.com")).toThrow(DemoProjectGuardError);
  });

  it("never prints secrets or full production refs in redactSecrets output", () => {
    const env = {
      SUPABASE_SERVICE_ROLE_KEY: "super-secret-service-role",
      ADMIN_PIN: "1234",
      PRODUCTION_SUPABASE_PROJECT_REF: "known-production-ref",
    };
    const output = redactSecrets(
      `key=${env.SUPABASE_SERVICE_ROLE_KEY} pin=${env.ADMIN_PIN} prod=${env.PRODUCTION_SUPABASE_PROJECT_REF}`,
      env,
    );
    expect(output).not.toContain("super-secret-service-role");
    expect(output).not.toContain("1234");
    expect(output).not.toContain("known-production-ref");
    expect(output).toContain("<redacted:SUPABASE_SERVICE_ROLE_KEY>");
  });

  it("masks URLs and subject ids", () => {
    expect(maskSupabaseUrl("https://abcdefghijklmnop.supabase.co")).toContain("abcd…mnop");
    expect(maskProjectRef("abcdefghijklmnop")).toBe("abcd…mnop");
    expect(maskSubjectId("0x" + "a".repeat(64))).toMatch(/^0x[a-f0-9]{6}…[a-f0-9]{6}$/);
  });
});
