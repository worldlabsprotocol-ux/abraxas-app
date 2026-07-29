// FILE: lib/home/protocolProofLogos.ts
// Partner logos for Protocol in Action — compact, consistent sizing.

import { GOOD_TROUBLE_REGISTRY_IMAGE } from "@/lib/goodTrouble/registryEntry";

export interface ProtocolProofLogo {
  src: string;
  alt: string;
}

export const PROTOCOL_PROOF_LOGOS: Record<string, ProtocolProofLogo> = {
  cielo: {
    src: "/assets/cielo/logo-mark.svg",
    alt: "Cielo Sunrise",
  },
  chickasaw: {
    src: "/assets/cpg/logo-mark.svg",
    alt: "Chickasaw Project",
  },
  "good-trouble": {
    src: GOOD_TROUBLE_REGISTRY_IMAGE,
    alt: "Good Trouble Canna",
  },
  passport: {
    src: "/icon-48.png",
    alt: "Abraxas Passport",
  },
};

/** Uniform logo height in Protocol in Action cards (px). */
export const PROTOCOL_PROOF_LOGO_HEIGHT = 36;
