// FILE: app/manifest.test.ts

import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("Abraxas Passport web app manifest", () => {
  it("opens installed sessions in the holder Passport", () => {
    const value = manifest();

    expect(value.name).toBe("Abraxas Passport");
    expect(value.start_url).toBe("/passport");
    expect(value.display).toBe("standalone");
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
    ]));
  });

  it("does not claim an offline data experience", () => {
    const value = manifest();

    expect(value.description).toContain("share only the eligibility result");
    expect(value.scope).toBe("/");
  });
});
