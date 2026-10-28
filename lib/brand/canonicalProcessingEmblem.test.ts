import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_TRUST_PROCESSING_EMBLEM,
  LIVING_SPHERE_BRAND,
} from "@/lib/brand/livingSphereBrandAssets";

const ROOT = resolve(__dirname, "../..");

describe("canonical trust processing emblem", () => {
  it("points at approved living sphere artwork", () => {
    expect(CANONICAL_TRUST_PROCESSING_EMBLEM.src).toBe(LIVING_SPHERE_BRAND.hero.src);
    expect(CANONICAL_TRUST_PROCESSING_EMBLEM.src).toContain("/brand/living-sphere/");
  });

  it("uses living sphere in AbraxasProcessingEmblem (not crystalline protocol webp)", () => {
    const src = readFileSync(resolve(ROOT, "components/brand/AbraxasProcessingEmblem.tsx"), "utf8");
    expect(src).toContain("trustProcessingEmblemForSize");
    expect(src).not.toContain("OFFICIAL_EMBLEM_HERO_WEBP");
    expect(src).not.toContain("abraxas-emblem-protocol-640");
  });

  it("uses AbraxasProcessingEmblem in wallet sign-in dialog", () => {
    const dialog = readFileSync(resolve(ROOT, "components/nav/SolanaAccountSignInDialog.tsx"), "utf8");
    expect(dialog).toContain("AbraxasProcessingEmblem");
    expect(dialog).not.toContain("orbitCore");
  });

  it("uses AbraxasProcessingEmblem during proof checking UI", () => {
    const completion = readFileSync(
      resolve(ROOT, "components/account/EphemeralSandboxVerificationCompletion.tsx"),
      "utf8",
    );
    expect(completion).toContain("AbraxasProcessingEmblem");
  });
});
