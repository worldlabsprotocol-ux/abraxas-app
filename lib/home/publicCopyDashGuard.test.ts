// FILE: lib/home/publicCopyDashGuard.test.ts
// Build #566: public homepage and passport reusable UI must not use em/en dash punctuation.

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

const PUBLIC_COPY_FILES = [
  "lib/home/homepageAlignment565Copy.ts",
  "lib/home/cinematicHomeCopy.ts",
  "lib/home/institutionalHomeCopy.ts",
  "lib/home/v2HomeCopy.ts",
  "app/page.tsx",
  "components/redesign/RedesignHome.tsx",
  "components/home/premium/PremiumHomeHero.tsx",
  "components/home/premium/HomeTrustNetwork.tsx",
  "components/home/HomeVerifyProtectReuse.tsx",
  "components/home/HomeProblemChapter.tsx",
  "components/home/HomeProtocolInAction.tsx",
  "components/home/HomeTwoAppReferenceProof.tsx",
  "components/home/cinematic/thesis/ScrollDisclosureStory.tsx",
  "components/home/cinematic/thesis/PassportHeroObject.tsx",
  "components/protocol-visuals/PolicyAuthorizationFlowVisual.tsx",
  "components/protocol-visuals/VerificationLifecycleTrustBoundary.tsx",
  "components/protocol-visuals/DecisionReceiptVerificationInteractive.tsx",
  "components/passport/PassportReusableCredentialsPanel.tsx",
  "lib/passport/reusableCredential/presentationDisclosure.ts",
  "lib/passport/reusableCredential/summarize.ts",
] as const;

const EM_EN_DASH = /[\u2013\u2014]/;

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  expect(existsSync(path), `missing public copy file: ${rel}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("public copy dash guard (Build #566)", () => {
  for (const rel of PUBLIC_COPY_FILES) {
    it(`no em or en dash punctuation in ${rel}`, () => {
      const src = read(rel);
      const lines = src.split("\n");
      const violations: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trimStart().startsWith("//")) continue;
        if (line.trimStart().startsWith("*")) continue;
        if (EM_EN_DASH.test(line)) {
          violations.push(`${i + 1}: ${line.trim()}`);
        }
      }
      expect(violations, violations.join("\n")).toEqual([]);
    });
  }
});
