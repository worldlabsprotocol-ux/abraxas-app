// FILE: lib/home/protocolProofLogos.ts
// Partner media for Protocol in Action — compact strip, per-asset fit rules.

import { PROTOCOL_PROOF_IMAGES } from "@/lib/home/protocolProofMedia";

/** Hand + smoke brand graphic — Protocol in Action proof media for Good Trouble. */
export const GOOD_TROUBLE_PROTOCOL_PROOF_IMAGE = "/assets/partner-network/good-trouble-partner-brand.png";

export interface ProtocolProofLogo {
  src: string;
  alt: string;
  /** cover for landscape photos; contain for wordmarks and portrait logos */
  fit?: "cover" | "contain";
  objectPosition?: string;
  slotHeight?: number;
  /** Scale up contained logos (portrait assets in a wide card). */
  containScale?: number;
}

export const PROTOCOL_PROOF_LOGOS: Record<string, ProtocolProofLogo> = {
  cielo: {
    src: PROTOCOL_PROOF_IMAGES.cielo.src,
    alt: PROTOCOL_PROOF_IMAGES.cielo.alt,
    fit: "cover",
    objectPosition: "58% 42%",
    slotHeight: 76,
  },
  chickasaw: {
    src: PROTOCOL_PROOF_IMAGES.chickasaw.src,
    alt: PROTOCOL_PROOF_IMAGES.chickasaw.alt,
    fit: "cover",
    objectPosition: "center 40%",
    slotHeight: 76,
  },
  "good-trouble": {
    src: GOOD_TROUBLE_PROTOCOL_PROOF_IMAGE,
    alt: "Good Trouble Canna",
    fit: "cover",
    objectPosition: "center center",
    slotHeight: 76,
  },
  passport: {
    src: "/icon-48.png",
    alt: "Abraxas Passport",
    fit: "contain",
    slotHeight: 56,
  },
};

/** Default media strip height (px). */
export const PROTOCOL_PROOF_LOGO_HEIGHT = 72;
