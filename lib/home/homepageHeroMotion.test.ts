import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

describe("homepage hero motion (living sphere)", () => {
  it("does not ship sweep, orbit, or pointer parallax on the hero centerpiece", () => {
    const centerpiece = readFileSync(
      resolve(ROOT, "components/home/defi/AbraxasHeroCenterpiece.tsx"),
      "utf8",
    );
    expect(centerpiece).toContain("abx-hero-emblem-env--living-sphere");
    expect(centerpiece).toContain("abx-hero-emblem-env--static");
    expect(centerpiece).not.toContain("abx-hero-emblem-env__sheen");
    expect(centerpiece).not.toContain("abx-hero-emblem-env__orbit");
    expect(centerpiece).not.toContain("onPointerMove");
    expect(centerpiece).not.toContain("abx-hero-sheen-travel");
  });

  it("disables timed hero emblem animations for living sphere in CSS", () => {
    const css = readFileSync(resolve(ROOT, "app/globals.defi-cinematic.css"), "utf8");
    expect(css).toContain(".abx-hero-emblem-env--living-sphere .abx-hero-emblem-env__sheen");
    expect(css).toMatch(
      /\.abx-hero-emblem-env--living-sphere[\s\S]*animation:\s*none\s*!important/,
    );
  });
});
