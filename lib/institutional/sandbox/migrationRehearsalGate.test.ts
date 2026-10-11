import { describe, expect, it, afterEach } from "vitest";
import { evaluateMigrationRehearsalGate } from "@/lib/institutional/sandbox/migrationRehearsalGate";

describe("migrationRehearsalGate", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("dry-run includes migration checksums", () => {
    process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID = "local";
    process.env.INSTITUTIONAL_SANDBOX_DATABASE_URL = "postgresql://u:p@localhost:5432/abraxas524_replay";
    process.env.INSTITUTIONAL_REPLAY_DISPOSABLE_REHEARSAL_VERDICT = "PASS";
    const report = evaluateMigrationRehearsalGate({ dryRun: true });
    expect(report.checksums["139_institutional_eligibility_consume_nonces.sql"]).toMatch(/^[a-f0-9]{64}$/);
    expect(report.mode).toBe("dry_run");
  });

  it("fails on production ref in database url host", () => {
    process.env.INSTITUTIONAL_SANDBOX_ENVIRONMENT_ID = "bad";
    process.env.INSTITUTIONAL_SANDBOX_DATABASE_URL =
      "postgresql://postgres:pass@db.bztwutzprwsdrtqdpymf.supabase.co:5432/postgres";
    const report = evaluateMigrationRehearsalGate({ dryRun: true });
    expect(report.checks.find(c => c.id === "not_production")?.verdict).toBe("FAIL");
  });
});
