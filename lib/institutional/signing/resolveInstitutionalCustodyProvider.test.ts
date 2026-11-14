import { describe, expect, it } from "vitest";
import { resolveInstitutionalCustodyProvider } from "./resolveInstitutionalCustodyProvider";

describe("resolveInstitutionalCustodyProvider", () => {
  it("selects demo-memory when flag set", () => {
    expect(
      resolveInstitutionalCustodyProvider({ ABRAXAS_INSTITUTIONAL_WORKER_DEMO_MEMORY: "1" }),
    ).toEqual({ provider: "demo-memory" });
  });

  it("selects self-hosted when explicit and paths provided", () => {
    expect(
      resolveInstitutionalCustodyProvider({
        ABRAXAS_INSTITUTIONAL_CUSTODY_PROVIDER: "self-hosted-file",
        ABRAXAS_SELF_HOSTED_ISSUER_SEED_PATH: "/secure/issuer.seed",
        ABRAXAS_SELF_HOSTED_STATUS_SEED_PATH: "/secure/status.seed",
      }),
    ).toEqual({
      provider: "self-hosted-file",
      issuerSeedPath: "/secure/issuer.seed",
      statusSeedPath: "/secure/status.seed",
    });
  });

  it("defaults to aws-kms without self-hosted paths", () => {
    expect(resolveInstitutionalCustodyProvider({})).toEqual({ provider: "aws-kms" });
  });
});