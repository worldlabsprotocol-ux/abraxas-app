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
const POOLER_HOST = "aws-0-us-east-1.pooler.supabase.com";

const VALID_DIRECT_URL = `postgresql://postgres:secret@db.${DEMO_REF}.supabase.co:5432/postgres`;
const VALID_POOLER_URL = `postgresql://postgres.${DEMO_REF}:secret@${POOLER_HOST}:5432/postgres`;

describe("demoDatabaseUrl session pooler support", () => {
  it("accepts a valid official session pooler URL without TLS query parameters", () => {
    const parsed = parseDemoDatabaseUrl(VALID_POOLER_URL);
    expect(parsed.transport).toBe("supabase_session_pooler");
    expect(parsed.projectRef).toBe(DEMO_REF);
    expect(parsed.poolerHostname).toBe(POOLER_HOST);
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
        `postgresql://postgres:secret@${POOLER_HOST}:5432/postgres`,
      ),
    ).toThrow(/username postgres\.<demo-project-ref>/i);

    expect(() =>
      assertDatabaseUrlMatchesDemoRef(
        `postgresql://postgres.other-ref:secret@${POOLER_HOST}:5432/postgres`,
        DEMO_REF,
      ),
    ).toThrow(/does not match DEMO_SUPABASE_PROJECT_REF/i);
  });

  it("rejects production ref in username before client construction", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${PROD_REF}:secret@${POOLER_HOST}:5432/postgres`,
      ),
    ).toThrow(DemoProjectGuardError);

    expect(() =>
      assertDatabaseUrlMatchesDemoRef(
        `postgresql://postgres.${PROD_REF}:secret@${POOLER_HOST}:5432/postgres`,
        DEMO_REF,
      ),
    ).toThrow(/production|denied|does not match/i);
  });

  it("rejects transaction pooler port 6543", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@${POOLER_HOST}:6543/postgres`,
      ),
    ).toThrow(/6543|transaction pooler/i);
  });

  it("rejects deceptive pooler hostnames", () => {
    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@pooler.supabase.com.example.com:5432/postgres`,
      ),
    ).toThrow(/official Supabase Session Pooler|db\.<project-ref>/i);

    expect(() =>
      parseDemoDatabaseUrl(
        `postgresql://postgres.${DEMO_REF}:secret@evil.pooler.supabase.com.attacker.net:5432/postgres`,
      ),
    ).toThrow(/official Supabase Session Pooler|db\.<project-ref>/i);
  });

  it("rejects TLS query parameters on session pooler URLs", () => {
    expect(() =>
      parseDemoDatabaseUrl(`${VALID_POOLER_URL}?sslmode=require`),
    ).toThrow(/must not include TLS query parameters/i);

    expect(() =>
      parseDemoDatabaseUrl(`${VALID_POOLER_URL}?sslmode=prefer`),
    ).toThrow(/must not include TLS query parameters/i);

    expect(() =>
      parseDemoDatabaseUrl(`${VALID_POOLER_URL}?ssl=false`),
    ).toThrow(/must not include TLS query parameters/i);

    expect(() =>
      parseDemoDatabaseUrl(`${VALID_POOLER_URL}?sslrootcert=/tmp/evil.pem`),
    ).toThrow(/must not include TLS query parameters/i);
  });

  it("redacts pooler passwords, certificate paths, and full database URLs", () => {
    const redacted = redactDatabaseSecrets(
      `connect failed: ${VALID_POOLER_URL} path=/home/operator/supabase-ca.pem`,
      {
        DEMO_SUPABASE_DATABASE_URL: VALID_POOLER_URL,
        DEMO_SUPABASE_SSL_ROOT_CERT_PATH: "/home/operator/supabase-ca.pem",
      },
    );
    expect(redacted).not.toContain("secret");
    expect(redacted).not.toContain("/home/operator/supabase-ca.pem");
    expect(redacted).toContain("<redacted:DEMO_SUPABASE_DATABASE_URL>");
    expect(redacted).toContain("<redacted:DEMO_SUPABASE_SSL_ROOT_CERT_PATH>");
  });
});

describe("demoDatabaseUrl advisory-lock session compatibility", () => {
  it("identifies session pooler transport for session-scoped advisory locks", () => {
    const parsed = parseDemoDatabaseUrl(VALID_POOLER_URL);
    expect(parsed.transport).toBe("supabase_session_pooler");
    expect(parsed.projectRef).toBe(DEMO_REF);
    expect(parsed.poolerHostname).toBe(POOLER_HOST);
  });
});
