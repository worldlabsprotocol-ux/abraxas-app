// FILE: lib/partner/launchpad/publicErrorMessages.test.ts

import { describe, expect, it } from "vitest";
import {
  formatLaunchpadPublicError,
  launchpadErrorFromResponse,
  launchpadPublicErrorBody,
} from "./publicErrorMessages";

describe("launchpad public error messages", () => {
  it("maps launchpad_rate_limited to human copy without exposing the raw code", () => {
    const message = formatLaunchpadPublicError("launchpad_rate_limited");
    expect(message).toMatch(/Too many sandbox requests/i);
    expect(message).not.toBe("launchpad_rate_limited");
  });

  it("includes retry guidance when retry_after_sec is provided", () => {
    const message = formatLaunchpadPublicError("launchpad_rate_limited", undefined, {
      retryAfterSec: 42,
    });
    expect(message).toMatch(/retry in about 42 seconds/i);
  });

  it("builds API bodies with stable code and safe error text", () => {
    const body = launchpadPublicErrorBody("launchpad_rate_limited", { retryAfterSec: 15 });
    expect(body.code).toBe("launchpad_rate_limited");
    expect(body.error).toMatch(/Too many sandbox requests/i);
    expect(body.retry_after_sec).toBe(15);
    expect(body.error).not.toContain("launchpad_rate_limited");
  });

  it("prefers server-provided safe error over raw code in client helper", () => {
    const message = launchpadErrorFromResponse({
      code: "launchpad_rate_limited",
      error: "Too many sandbox requests were created recently. Wait a little and try again.",
      retry_after_sec: 30,
    });
    expect(message).toMatch(/Too many sandbox requests/i);
    expect(message).not.toBe("launchpad_rate_limited");
  });
});
