// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeGoodTroubleProductionDemoVideo } from "./HomeGoodTroubleProductionDemoVideo";
import {
  GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC,
  HOME_GOOD_TROUBLE_INTEGRATION,
} from "@/lib/home/goodTroubleIntegrationDemo";

describe("HomeGoodTroubleProductionDemoVideo", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("does not render an iframe and uses native video metadata preload", () => {
    render(<HomeGoodTroubleProductionDemoVideo />);
    expect(document.querySelector("iframe")).toBeNull();
    const video = document.querySelector("video");
    expect(video).toHaveAttribute("src", GOOD_TROUBLE_PRODUCTION_DEMO_VIDEO_SRC);
    expect(video).toHaveAttribute("preload", "metadata");
  });

  it("plays after explicit user activation", async () => {
    const user = userEvent.setup();
    render(<HomeGoodTroubleProductionDemoVideo title={HOME_GOOD_TROUBLE_INTEGRATION.videoTitle} />);

    const video = document.querySelector("video") as HTMLVideoElement;
    video.play = vi.fn().mockResolvedValue(undefined);

    await user.click(screen.getByRole("button", { name: /Play Abraxas and Good Trouble/i }));
    expect(video.play).toHaveBeenCalled();
    expect(video.controls).toBe(true);
  });
});
