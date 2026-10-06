// FILE: lib/partner/webhooks/webhookDeadLetterOperational.test.ts

import { describe, expect, it } from "vitest";
import { WEBHOOK_MAX_ATTEMPTS } from "@/lib/partner/webhooks/types";
import { failedDeliveryOperationalState } from "@/lib/partner/webhooks/webhookDeadLetter";

describe("failed delivery operational state", () => {
  it("maps max attempts to dead-lettered", () => {
    expect(failedDeliveryOperationalState(WEBHOOK_MAX_ATTEMPTS)).toBe("dead-lettered");
  });

  it("maps below-max failed attempts to failing", () => {
    expect(failedDeliveryOperationalState(WEBHOOK_MAX_ATTEMPTS - 1)).toBe("failing");
  });
});
