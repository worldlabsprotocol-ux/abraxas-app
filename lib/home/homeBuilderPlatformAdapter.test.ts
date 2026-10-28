import { describe, expect, it } from "vitest";
import {
  defaultStudioPathForHomePlatform,
  mapHomeBuilderPlatformToStarterKit,
} from "@/lib/home/homeBuilderPlatformAdapter";

describe("homeBuilderPlatformAdapter", () => {
  it("maps application platform to nextjs starter kit", () => {
    expect(mapHomeBuilderPlatformToStarterKit("application")).toBe("nextjs");
    expect(defaultStudioPathForHomePlatform("application")).toBe("hosted_partner_flow");
  });

  it("maps api platform to express starter kit", () => {
    expect(mapHomeBuilderPlatformToStarterKit("api")).toBe("express");
    expect(defaultStudioPathForHomePlatform("api")).toBe("server_receipt_verify");
  });
});
