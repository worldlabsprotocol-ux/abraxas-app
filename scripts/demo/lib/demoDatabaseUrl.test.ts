import { describe, expect, it } from "vitest";
import {
  DemoDatabaseUrlError,
  maskDatabaseTarget,
  maskDatabaseUrl,
  parseDemoDatabaseUrl,
  redactDatabaseSecrets,
  assertDatabaseUrlMatchesDemoRef,
} from "./demoDatabaseUrl";
import { KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS } from "./knownProductionSupabaseProjectRefs";
import { DemoProjectGuardError } from "./demoProjectGuard";

const DEMO_REF = "ocntwbxarpjeixdnzide";
const PROD_REF = KNOWN_PRODUCTION_SUPABASE_PROJECT_REFS[0];

const VALID_DIRECT_URL = `postgresql://postgres:secret@db.${DEMO_REF}.supabase.co:5432/postgres`;
const VALID_POOLER_URL = `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;

describe("demoDatabaseUrl session pooler support", () => {
  it("accepts a valid official session pooler URL", () => {
    const parsed = parseDemoDatabaseUrl(VALID_POOLER_URL);
    expect(parsed.transport).toBe("supabase_session_pooler");
    expect(parsed.projectRef).toBe(DEMO_REF);
    expect(maskDatabaseTarget(parsed)).toBe(
      `transport=supabase_session_pooler project=ocnt…zide`,
    );
  });

  it("accepts the existing direct database URL form", () => {
    const parsed = parseDemoDatabaseUrl(VALID_DIRECT_URL);
    expect(parsed.transport).toBe("direct");
    expect(parsed.projectRef).toBe(DEMO_REF);
    expect(maskDatabaseUrl(VALID_DIRECT_URL)).toBe(`transport=direct project=ocnt…zide`);
  });

  it("requires exact username and demo ref binding on session pooler URLs", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      ),
    ).toThrow(/username postgres\.<demo-project-ref>/i);

    expect(() =>
      assertDatabaseUrlMatchesDemoRef(
        `postgresql://postgres.other-ref:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
        DEMO_REF,
      ),
    ).toThrow(/does not match DEMO_SUPABASE_PROJECT_REF/i);
  });

  it("rejects production ref in username before client construction", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${PROD_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      ),
    ).toThrow(DemoProjectGuardError);

    expect(() =>
      assertDatabaseUrlMatchesDemoRef(
        `postgresql://postgres.${PROD_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
        DEMO_REF,
      ),
    ).toThrow(/production|denied|does not match/i);
  });

  it("rejects transaction pooler port 6543", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`,
      ),
    ).toThrow(/6543|transaction pooler/i);
  });

  it("rejects deceptive pooler hostnames", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@pooler.supabase.com.example.com:5432/postgres?sslmode=require`,
      ),
    ).toThrow(/official Supabase Session Pooler|db\.<project-ref>/i);

    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@evil.pooler.supabase.com.attacker.net:5432/postgres?sslmode=require`,
      ),
    ).toThrow(/official Supabase Session Pooler|db\.<project-ref>/i);
  });

  it("rejects missing or weakened SSL on session pooler URLs", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      ),
    ).toThrow(/must enable SSL/i);

    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=prefer`,
      ),
    ).toThrow(/weakens TLS/i);

    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?ssl=false`,
      ),
    ).toThrow(/must not disable SSL/i);
  });

  it("redacts pooler passwords and full database URLs", () => {
    const redacted = redactDatabaseSecrets(`connect failed: ${VALID_POOLER_URL}`, {
      DEMO_SUPABASE_DATABASE_URL: VALID_POOLER_URL,
    });
    expect(redacted).not.toContain("secret");
    expect(redacted).toContain("<redacted:DEMO_SUPABASE_DATABASE_URL>");
  });
});

describe("demoDatabaseUrl advisory-lock session compatibility", () => {
  it("identifies session pooler transport for session-scoped advisory locks", () => {
    const parsed = parseDemoDatabaseUrl(VALID_POOLER_URL);
    expect(parsed.transport).toBe("supabase_session_pooler");
    expect(parsed.projectRef).toBe(DEMO_REF);
  });
});
