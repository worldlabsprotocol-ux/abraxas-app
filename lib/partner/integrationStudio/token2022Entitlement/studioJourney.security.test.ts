import { describe, expect, it } from "vitest";
import { buildToken2022StudioJourney } from "./studioJourney.server";

describe("token2022 studio journey binding", () => {
  it("binds trusted scope to launchpad application record", async () => {
    const journey = await buildToken2022StudioJourney({
      app: {
        id: "app-982",
        partner_id: "partner-982",
        policy_id: "policy-982",
        policy_version: 2,
        policy_template_id: "wallet_control",
      } as never,
    });
    expect(journey.trusted_scope.application_id).toBe("app-982");
    expect(journey.trusted_scope.policy_id).toBe("policy-982");
    expect(journey.trusted_scope.scope_source).toBe("launchpad_application_record");
    expect(journey.environment.mint_and_consume_actionable).toBe(false);
  });
});