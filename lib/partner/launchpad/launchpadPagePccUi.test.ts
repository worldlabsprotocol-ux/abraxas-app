import { describe, expect, it, vi, beforeEach } from "vitest";

const availabilityMock = vi.fn();

vi.mock("@/lib/partner/launchpad/policyChangeControlAvailability", () => ({
  resolvePolicyChangeControlUiAvailability: (...args: unknown[]) => availabilityMock(...args),
}));

vi.mock("@/components/partner/launchpad/PartnerLaunchpadClient", () => ({
  PartnerLaunchpadClient: (props: { policyChangeControlAvailable?: boolean }) => ({
    type: "PartnerLaunchpadClient",
    props,
  }),
}));

describe("Launchpad page server availability probe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("checks schema availability before rendering Launchpad and hides PCC on Production-style miss", async () => {
    availabilityMock.mockResolvedValue(false);
    const { default: Page } = await import("@/app/developers/launchpad/page");
    const element = await Page();
    expect(availabilityMock).toHaveBeenCalled();
    expect(element.props.policyChangeControlAvailable).toBe(false);
  });

  it("passes available=true through to Launchpad when DEMO schema is present", async () => {
    availabilityMock.mockResolvedValue(true);
    const { default: Page } = await import("@/app/developers/launchpad/page");
    const element = await Page();
    expect(element.props.policyChangeControlAvailable).toBe(true);
  });
});
