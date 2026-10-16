// FILE: lib/home/homeTrustPipelineIntegrity.test.ts

import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { TRUST_PIPELINE_STAGE_DETAIL } from "@/lib/home/defiVisualHomeCopy";

describe("homepage trust pipeline integrity", () => {
  it("uses functional tab controls with a detail panel", () => {
    const src = readFileSync(
      resolve(process.cwd(), "components/home/defi/HomeTrustPipelineStrip.tsx"),
      "utf8",
    );
    expect(src).toMatch(/role="tab"/);
    expect(src).toMatch(/role="tabpanel"/);
    expect(src).toContain("TRUST_PIPELINE_STAGE_DETAIL");
  });

  it("does not claim a live receipt was issued in stage copy", () => {
    for (const detail of Object.values(TRUST_PIPELINE_STAGE_DETAIL)) {
      expect(detail.body.toLowerCase()).not.toContain("receipt issued");
      expect(detail.body.toLowerCase()).not.toContain("verification succeeded");
    }
  });
});
