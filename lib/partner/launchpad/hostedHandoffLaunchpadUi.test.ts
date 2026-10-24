import { describe, expect, it } from "vitest";
import {
  buildPartnerCallbackResultPath,
  hostedHandoffLaunchpadHeading,
  hostedHandoffLaunchpadPrimaryActionLabel,
  hostedHandoffLaunchpadStatusLine,
  resolveHostedHandoffLaunchpadPhase,
} from "./hostedHandoffLaunchpadUi";

describe("hostedHandoffLaunchpadUi", () => {
  it("maps server statuses to launchpad phases", () => {
    expect(resolveHostedHandoffLaunchpadPhase("")).toBe("none");
    expect(resolveHostedHandoffLaunchpadPhase("created")).toBe("pending");
    expect(resolveHostedHandoffLaunchpadPhase("completed")).toBe("completed");
    expect(resolveHostedHandoffLaunchpadPhase("consumed")).toBe("completed");
    expect(resolveHostedHandoffLaunchpadPhase("expired")).toBe("expired");
  });

  it("uses completed headings and explains reopen vs new verification", () => {
    expect(hostedHandoffLaunchpadHeading("completed")).toBe("Verification completed");
    expect(hostedHandoffLaunchpadStatusLine({
      phase: "completed",
      handoffRef: "hpf_d1eb26131d8a65fc",
    })).toContain("not a new verification");
  });

  it("maps phases to primary operator actions", () => {
    expect(hostedHandoffLaunchpadPrimaryActionLabel("pending")).toBe("Continue verification");
    expect(hostedHandoffLaunchpadPrimaryActionLabel("completed")).toBe("View completed result");
  });

  it("builds callback result paths without leaking secrets", () => {
    const path = buildPartnerCallbackResultPath({
      receiptId: "dr_test",
      partnerId: "studio-test",
      policyId: "p-wallet_control-v1",
    });
    expect(path).toContain("receipt_id=dr_test");
    expect(path).toContain("partner_id=studio-test");
    expect(path).not.toContain("abx_test");
  });
});
