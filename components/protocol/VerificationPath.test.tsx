// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  GOOD_TROUBLE_PURCHASE_PATH_STEPS,
  VerificationPath,
  resolveVerificationPathStep,
} from "./VerificationPath";

describe("VerificationPath Good Trouble purchase steps", () => {
  it("orders verify before consent for canonical purchase progress", () => {
    expect(GOOD_TROUBLE_PURCHASE_PATH_STEPS.map((step) => step.label)).toEqual([
      "Age",
      "Verify",
      "Share",
      "Done",
    ]);
  });

  it("marks only request complete while holder is verifying age", () => {
    render(
      <VerificationPath
        active="verify"
        completedThrough={null}
        steps={GOOD_TROUBLE_PURCHASE_PATH_STEPS}
        compact
      />,
    );

    expect(screen.getByText("Age").closest("li")?.className).toContain("--done");
    expect(screen.getByText("Verify").closest("li")?.className).toContain("--current");
    expect(screen.getByText("Share").closest("li")?.className).not.toContain("--done");
    expect(screen.getByText("Done").closest("li")?.className).not.toContain("--done");
  });

  it("does not mark share result complete before consent is shown", () => {
    const active = resolveVerificationPathStep({
      showConsent: false,
      verifying: true,
      ready: false,
    });
    expect(active).toBe("verify");
  });
});
