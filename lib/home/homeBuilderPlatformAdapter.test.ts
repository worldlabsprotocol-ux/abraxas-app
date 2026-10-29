import { describe, expect, it } from "vitest";
import {
  defaultStudioPathForHomePlatform,
  mapHomeBuilderPlatformToStarterKit,
} from "@/lib/home/homeBuilderPlatformAdapter";
import { resolveStarterKitPlatform } from "@/lib/home/homeBuilderIntegrationStack";

describe("homeBuilderPlatformAdapter", () => {
  it("does not map website to Next.js without an explicit stack", () => {
    expect(mapHomeBuilderPlatformToStarterKit("website")).toBeNull();
    expect(mapHomeBuilderPlatformToStarterKit("website", null)).toBeNull();
    expect(resolveStarterKitPlatform({ platform: "website", integrationStack: null })).toBeNull();
  });

  it("maps website to the chosen stack only", () => {
    expect(mapHomeBuilderPlatformToStarterKit("website", "wix_velo")).toBe("wix_velo");
    expect(mapHomeBuilderPlatformToStarterKit("website", "nextjs")).toBe("nextjs");
  });

  it("maps application platform to nextjs starter kit", () => {
    expect(mapHomeBuilderPlatformToStarterKit("application")).toBe("nextjs");
    expect(defaultStudioPathForHomePlatform("application")).toBe("hosted_partner_flow");
  });

  it("maps api platform to express starter kit", () => {
    expect(mapHomeBuilderPlatformToStarterKit("api")).toBe("express");
    expect(defaultStudioPathForHomePlatform("api")).toBe("server_receipt_verify");
  });
});
