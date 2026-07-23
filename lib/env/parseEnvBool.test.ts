import { describe, expect, it } from "vitest";
import { parseEnvBool } from "./parseEnvBool";

describe("parseEnvBool", () => {
  it("parses common truthy values", () => {
    expect(parseEnvBool("true")).toBe(true);
    expect(parseEnvBool("True")).toBe(true);
    expect(parseEnvBool("1")).toBe(true);
    expect(parseEnvBool("yes")).toBe(true);
    expect(parseEnvBool("on")).toBe(true);
  });

  it("parses falsy values", () => {
    expect(parseEnvBool("false")).toBe(false);
    expect(parseEnvBool("0")).toBe(false);
    expect(parseEnvBool(undefined)).toBe(false);
    expect(parseEnvBool("")).toBe(false);
  });
});
