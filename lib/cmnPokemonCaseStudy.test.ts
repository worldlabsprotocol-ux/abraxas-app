import { describe, expect, it } from "vitest";
import {
  CMN_DESIGNS_HERO_NUMBER,
  CMN_DESIGNS_PHOTO_NUMBERS,
  CMN_DESIGNS_REGISTRY_IMAGE,
  cmnDesignsSlideshowPaths,
} from "@/lib/cmnDesignsMedia";
import { CMN_DESIGNS_HERO_SRC, cmnDesignsPhotoRotation } from "@/lib/cmnDesignsDisplay";
import { CMN_POKEMON_ASSET } from "@/lib/cmnPokemonCaseStudy";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { REGISTRY_ASSETS } from "@/lib/data/registryAssets";

describe("cmnDesignsMedia", () => {
  it("uses cmn21.jpg as registry hero", () => {
    expect(CMN_DESIGNS_REGISTRY_IMAGE.src).toBe("/assets/cmn21.jpg");
    expect(CMN_DESIGNS_HERO_SRC).toBe("/assets/cmn21.jpg");
    expect(CMN_DESIGNS_HERO_NUMBER).toBe(21);
  });

  it("excludes missing cmn8 slot", () => {
    expect(CMN_DESIGNS_PHOTO_NUMBERS).not.toContain(8);
    expect(CMN_DESIGNS_PHOTO_NUMBERS).toHaveLength(28);
  });

  it("starts slideshow with hero image", () => {
    const paths = cmnDesignsSlideshowPaths();
    expect(paths[0]).toBe("/assets/cmn21.jpg");
    expect(paths).toHaveLength(28);
  });

  it("rotates non-hero slabs 180° CCW when gallery expands", () => {
    expect(cmnDesignsPhotoRotation("/assets/cmn21.jpg")).toBe(0);
    expect(cmnDesignsPhotoRotation("/assets/cmn1.jpg")).toBe(-180);
    expect(cmnDesignsPhotoRotation("/assets/cmn22.jpg")).toBe(-180);
  });

  it("registers PSA Pokémon in explore and registry catalogs", () => {
    const explore = EXPLORE_ASSETS.find(a => a.id === "cmn-pokemon-collection");
    const registry = REGISTRY_ASSETS.find(a => a.abxId === CMN_POKEMON_ASSET.id);
    expect(explore?.image).toBe(CMN_DESIGNS_REGISTRY_IMAGE.src);
    expect(explore?.name).toBe("PSA Pokémon · Graded Collection");
    expect(explore?.secondaryValue).toBe("More slabs soon");
    expect(registry?.slug).toBe("cmn-pokemon-collection");
    expect(registry?.verifyState).toBe("verified");
  });
});
