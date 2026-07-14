import { describe, expect, it } from "vitest";
import { EXPLORE_ASSETS } from "./exploreAssets";
import { REGISTRY_ASSETS } from "./registryAssets";
import {
  CIELO_REGISTRY_IMAGE,
  SMYRNA_LEGACY_STADIUM_PATH,
  SMYRNA_TOWNHOME_IMAGE,
} from "./registryAssetImages";

describe("registryAssetImages", () => {
  it("uses audited smyrna townhome path", () => {
    expect(SMYRNA_TOWNHOME_IMAGE.src).toBe("/assets/smyrna/townhome-1736.jpg");
    expect(SMYRNA_TOWNHOME_IMAGE.src).not.toBe(SMYRNA_LEGACY_STADIUM_PATH);
  });

  it("uses cielo hero sunset for registry card", () => {
    expect(CIELO_REGISTRY_IMAGE.src).toBe("/assets/cielo/hero-sunset.jpg");
    expect(CIELO_REGISTRY_IMAGE.src).not.toContain("08.jpg");
  });

  it("keeps explore and registry catalogs on audited image paths", () => {
    const forbidden = ["08.jpg", "011.webp"];
    for (const asset of EXPLORE_ASSETS) {
      for (const bad of forbidden) {
        expect(asset.image).not.toContain(bad);
      }
    }
    for (const asset of REGISTRY_ASSETS) {
      for (const bad of forbidden) {
        expect(asset.image).not.toContain(bad);
      }
    }
  });
});
