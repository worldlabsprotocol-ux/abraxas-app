// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeGoodTroubleIntegration } from "./HomeGoodTroubleIntegration";
import {
  GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC,
  HOME_GOOD_TROUBLE_INTEGRATION,
} from "@/lib/home/goodTroubleIntegrationDemo";
import { scanStringForCopyViolations } from "@/lib/design/userFacingCopyGuard";

describe("HomeGoodTroubleIntegration", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the production demo section with required copy", () => {
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

  it("uses the native repository-hosted production demo video", () => {
    render(<HomeGoodTroubleIntegration />);

    expect(document.querySelector("iframe")).toBeNull();
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("src", GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("autoplay");
  });

  it("shows native controls only after intentional play", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    const video = document.querySelector("video") as HTMLVideoElement;
    expect(video.controls).toBe(false);

    const playButton = screen.getByRole("button", {
      name: `Play ${HOME_GOOD_TROUBLE_INTEGRATION.videoTitle}`,
    });
    video.play = vi.fn().mockResolvedValue(undefined);
    await user.click(playButton);

    expect(video.play).toHaveBeenCalled();
    expect(video.controls).toBe(true);
  });

  it("supports keyboard activation on the play control", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    const video = document.querySelector("video") as HTMLVideoElement;
    video.play = vi.fn().mockResolvedValue(undefined);

    const playButton = screen.getByRole("button", {
      name: `Play ${HOME_GOOD_TROUBLE_INTEGRATION.videoTitle}`,
    });
    playButton.focus();
    await user.keyboard("{Enter}");

    expect(video.play).toHaveBeenCalled();
  });

  it("starts playback when the watch CTA is clicked", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleIntegration />);

    const video = document.querySelector("video") as HTMLVideoElement;
    video.play = vi.fn().mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: HOME_GOOD_TROUBLE_INTEGRATION.secondaryCta }));
    expect(video.play).toHaveBeenCalled();
  });

  it("passes visible copy guard rules and avoids forbidden assurance claims", () => {
    const strings = [
      HOME_GOOD_TROUBLE_INTEGRATION.eyebrow,
      HOME_GOOD_TROUBLE_INTEGRATION.headline,
      HOME_GOOD_TROUBLE_INTEGRATION.body,
      HOME_GOOD_TROUBLE_INTEGRATION.primaryCta,
      HOME_GOOD_TROUBLE_INTEGRATION.secondaryCta,
      HOME_GOOD_TROUBLE_INTEGRATION.mediaFootnote,
      ...HOME_GOOD_TROUBLE_INTEGRATION.proofSteps.map((step) => step.label),
    ];

    for (const text of strings) {
      expect(scanStringForCopyViolations(text)).toBeNull();
    }

    const corpus = strings.join("\n");
    expect(corpus).not.toMatch(/government-ID|identity verification|no ID required|L2/i);
  });
});
