import { describe, expect, it } from "vitest";
import {
  getInstitutionalIntegrationContract,
  INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION,
} from "@/lib/institutional/integration/institutionalIntegrationContract";

describe("institutional integration contract", () => {
  it("exports versioned contract with consume and status routes", () => {
    const contract = getInstitutionalIntegrationContract();
    expect(contract.version).toBe(INSTITUTIONAL_INTEGRATION_CONTRACT_VERSION);
    expect(contract.routes.consume).toContain("institutional/eligibility/consume");
    expect(contract.routes.receipt_status).toContain("decision-receipts");
    expect(contract.replay_reservation_policy).toBe("permit_path_only");
    expect(contract.errors).toContain("replay_store_unavailable");
  });
});
