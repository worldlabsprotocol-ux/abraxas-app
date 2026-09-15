// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { HomePrivacyVideoPlayer } from "./HomePrivacyVideoPlayer";
import {
  GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN,
  GOOD_TROUBLE_INTEGRATION_VIDEO_ID,
} from "@/lib/home/goodTroubleIntegrationDemo";

describe("HomePrivacyVideoPlayer", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render an iframe before play", () => {
    render(<HomePrivacyVideoPlayer title="Good Trouble integration powered by Abraxas" />);
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("loads youtube-nocookie embed after play", async () => {
    const user = userEvent.setup();
    render(<HomePrivacyVideoPlayer title="Good Trouble integration powered by Abraxas" />);

    await user.click(screen.getByRole("button", { name: /Play Good Trouble integration/i }));

    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toMatch(
      new RegExp(`^${GOOD_TROUBLE_INTEGRATION_EMBED_ORIGIN}/embed/${GOOD_TROUBLE_INTEGRATION_VIDEO_ID}`),
    );
    expect(iframe).toHaveAttribute("title", "Good Trouble integration powered by Abraxas");
  });
});
