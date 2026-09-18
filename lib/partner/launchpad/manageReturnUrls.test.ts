import { describe, expect, it } from "vitest";
import { addLaunchpadReturnUrl, removeLaunchpadReturnUrl } from "./manageReturnUrls";

describe("Launchpad return URL management", () => {
  it("adds a callback once", () => {
    expect(addLaunchpadReturnUrl(["https://app.example/callback"], "https://preview.example/callback")).toEqual([
      "https://app.example/callback",
      "https://preview.example/callback",
    ]);
    expect(addLaunchpadReturnUrl(["https://app.example/callback"], "https://app.example/callback")).toEqual([
      "https://app.example/callback",
    ]);
  });

  it("keeps one callback configured while replacing an old callback", () => {
    expect(removeLaunchpadReturnUrl(["https://app.example/callback"], "https://app.example/callback")).toEqual({
      ok: false,
      code: "return_url_last_remaining",
    });
    expect(removeLaunchpadReturnUrl([
      "https://app.example/callback",
      "https://preview.example/callback",
    ], "https://app.example/callback")).toEqual({
      ok: true,
      allowedUrls: ["https://preview.example/callback"],
    });
  });
});
