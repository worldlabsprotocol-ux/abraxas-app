// FILE: lib/home/protocolProofMedia.ts
// Canonical imagery for Protocol in Action — audited paths only.

import { CIELO_REGISTRY_IMAGE } from "@/lib/data/cieloMedia";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import { GOOD_TROUBLE_REGISTRY_IMAGE } from "@/lib/goodTrouble/registryEntry";

export interface ProtocolProofImage {
  src: string;
  alt: string;
  objectPosition?: string;
}

export const PROTOCOL_PROOF_IMAGES: Record<string, ProtocolProofImage> = {
  cielo: {
    src: CIELO_REGISTRY_IMAGE.src,
    alt: CIELO_REGISTRY_IMAGE.alt,
    objectPosition: CIELO_REGISTRY_IMAGE.objectPosition,
  },
  chickasaw: {
    src: CPG_ASSET.image,
    alt: "Chickasaw corridor land · Oklahoma",
    objectPosition: "center 40%",
  },
  "good-trouble": {
    src: GOOD_TROUBLE_REGISTRY_IMAGE,
    alt: "Good Trouble Canna · organic cultivator",
    objectPosition: "center center",
  },
};
