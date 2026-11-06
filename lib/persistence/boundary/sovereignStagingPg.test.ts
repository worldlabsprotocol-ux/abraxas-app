import { describe, expect, it } from "vitest";
import { resolveSovereignStagingDatabaseUrl } from "./sovereignStagingPg";

describe("sovereign trust execution PostgreSQL binding", () => {
  it("accepts an explicit institutional binding", () => {
    expect(resolveSovereignStagingDatabaseUrl({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional",
      ABRAXAS_DATABASE_URL: "postgresql://abraxas:secret@postgres.internal:5432/abraxas",
    })).toContain("postgres.internal");
  });

  it("fails closed without an approved environment class or binding", () => {
    expect(resolveSovereignStagingDatabaseUrl({ NODE_ENV: "production", ABRAXAS_DATABASE_URL: "postgresql://ignored" })).toBeNull();
    expect(resolveSovereignStagingDatabaseUrl({ ABRAXAS_SOVEREIGN_ENV_CLASS: "institutional" })).toBeNull();
  });
});
