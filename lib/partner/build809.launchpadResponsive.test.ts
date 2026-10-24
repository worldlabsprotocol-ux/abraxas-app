// FILE: lib/partner/build809.launchpadResponsive.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

describe("Build #809 Launchpad responsive integrity", () => {
  it("avoids clipping the institutional workspace shell horizontally", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.institutional-workspace.css"), "utf8");
    expect(css).toContain("overflow-x: clip");
    expect(css).not.toMatch(/\.abx-inst-workspace-shell\s*\{[^}]*overflow:\s*hidden/s);
  });

  it("defers Launchpad three-column layout until wide desktop", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.institutional-workspace.css"), "utf8");
    expect(css).toContain("@media (min-width: 1280px)");
    expect(css).toContain(".abx-launchpad-handoff-controls");
  });

  it("uses living-sphere-derived site icons in metadata", () => {
    const meta = readFileSync(resolve(process.cwd(), "lib/seo/metadata.ts"), "utf8");
    expect(meta).toContain("/icon-512.png");
    expect(meta).not.toContain("abraxas-emblem-protocol.png");
  });
});
