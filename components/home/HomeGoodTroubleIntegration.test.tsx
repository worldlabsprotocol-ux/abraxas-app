// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HomeGoodTroubleIntegration } from "./HomeGoodTroubleIntegration";
import {
  GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN,
  GOOD_TROUBLE_INTEGRATION_VIDEO_ID,
  HOME_GOOD_TROUBLE_INTEGRATION,
} from "@/lib/home/goodTroubleIntegrationDemo";
import { scanStringForCopyViolations } from "@/lib/design/userFacingCopyGuard";

describe("HomeGoodTroubleIntegration", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the sandbox example section with required copy", () => {
    render(<HomeGoodTroubleIntegration />);

    expect(screen.getByText(HOME_GOOD_TROUBLE_INTEGRATION.eyebrow)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: HOME_GOOD_TROUBLE_INTEGRATION.headline })).toBeInTheDocument();
    expect(screen.getByText(HOME_GOOD_TROUBLE_INTEGRATION.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: HOME_GOOD_TROUBLE_INTEGRATION.primaryCta })).toHaveAttribute(
      "href",
      HOME_GOOD_TROUBLE_INTEGRATION.secondaryHref,
    );
    expect(screen.getByRole("button", { name: HOME_GOOD_TROUBLE_INTEGRATION.secondaryCta })).toBeInTheDocument();
  });

  it("uses the correct YouTube video id and defers iframe until play", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    expect(document.querySelector("iframe")).toBeNull();

    const playButton = screen.getByRole("button", {
      name: `Play ${HOME_GOOD_TROUBLE_INTEGRATION.videoTitle}`,
    });
    await user.click(playButton);

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe).toHaveAttribute("src", expect.stringContaining(GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN));
    expect(iframe?.getAttribute("src")).toContain(GOOD_TROUBLE_INTEGRATION_VIDEO_ID);
    expect(iframe).toHaveAttribute("title", HOME_GOOD_TROUBLE_INTEGRATION.videoTitle);
  });

  it("supports keyboard activation on the poster play control", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    const playButton = screen.getByRole("button", {
      name: `Play ${HOME_GOOD_TROUBLE_INTEGRATION.videoTitle}`,
    });
    playButton.focus();
    await user.keyboard("{Enter}");

    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("starts playback when the watch CTA is clicked", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    await user.click(screen.getByRole("button", { name: HOME_GOOD_TROUBLE_INTEGRATION.secondaryCta }));
    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("passes visible copy guard rules", () => {
    const strings = [
      HOME_GOOD_TROUBLE_INTEGRATION.eyebrow,
      HOME_GOOD_TROUBLE_INTEGRATION.headline,
      HOME_GOOD_TROUBLE_INTEGRATION.body,
      HOME_GOOD_TROUBLE_INTEGRATION.primaryCta,
      HOME_GOOD_TROUBLE_INTEGRATION.secondaryCta,
      ...HOME_GOOD_TROUBLE_INTEGRATION.proofSteps.map((step) => step.label),
    ];

    for (const text of strings) {
      expect(scanStringForCopyViolations(text)).toBeNull();
    }
  });
});
