import { describe, expect, it } from "vitest";
import { SIGNING_DEPLOYMENT_MODEL } from "./custodyImplementation";
import { assertPermittedWorkerOperations } from "./signingDeploymentBoundary";

describe("signing deployment boundary", () => {
  it("allows only purpose-bound institutional RPC names", () => {
    for (const op of SIGNING_DEPLOYMENT_MODEL.permittedRemoteOperations) {
      expect(() => assertPermittedWorkerOperations([op])).not.toThrow();
    }
    expect(() => assertPermittedWorkerOperations(["signRawDigest"])).toThrow(/forbidden/);
    expect(() => assertPermittedWorkerOperations(["signIssuerAuthorityStatement", "signRawDigest"])).toThrow(/forbidden/);
  });
});
