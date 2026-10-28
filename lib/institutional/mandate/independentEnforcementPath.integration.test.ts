// FILE: lib/institutional/mandate/independentEnforcementPath.integration.test.ts

import { describe, expect, it } from "vitest";
import {
  BASE_TRANSACTION,
  buildControlledMandateIssuerFixture,
  buildControlledSignedMandate,
} from "./controlledIssuerFixture";
import { invokeProtectedEnforcement } from "./testEnforcementInvoke";

describe("Build 885 independent enforcement path", () => {
  it("permits only when mandate, receipt binding, and transaction scope align", () => {
    const fixture = buildControlledMandateIssuerFixture();
    const signed = buildControlledSignedMandate({ fixture });
    const now = new Date("2026-06-15T12:00:00.000Z");

    const permit = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: BASE_TRANSACTION,
      now,
      mode: "mandate_and_abraxas_receipt",
      receipt: "auto_binding",
    });
    expect(permit.enforcement_action).toBe("permit");
    expect(permit.mandate_outcome).toBe("permit");

    const deny = invokeProtectedEnforcement({
      fixture,
      signed,
      transaction: { ...BASE_TRANSACTION, amount_usd: signed.payload.max_amount_usd + 1 },
      now,
      mode: "mandate_and_abraxas_receipt",
      receipt: "auto_binding",
    });
    expect(deny.enforcement_action).toBe("deny");
  });
});
