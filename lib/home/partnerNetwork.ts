// FILE: lib/home/partnerNetwork.ts
// Partner Network section — live implementations vs design partners (separate from Protocol in Action).

export type PartnerNetworkStatus = "integration_in_development" | "design_partner";

export interface PartnerNetworkImage {
  src: string;
  alt: string;
  objectPosition?: string;
  fit?: "cover" | "contain";
  /** Fills letterbox gaps when the asset has its own brand field color. */
  mediaBackground?: string;
}

export interface PartnerNetworkCard {
  id: string;
  name: string;
  status: PartnerNetworkStatus;
  description: string;
  href?: string;
  image?: PartnerNetworkImage;
}

export const PARTNER_NETWORK_TITLE = "Partner Network";

export const PARTNER_NETWORK_SUBTITLE =
  "Organizations building on reusable trust through Abraxas.";

/** Good Trouble script logo — Partner Network card (registry wordmark). */
export const GOOD_TROUBLE_PARTNER_IMAGE: PartnerNetworkImage = {
  src: "/assets/good-trouble/brand-logo.png",
  alt: "Good Trouble — reusable age verification for cannabis retail",
  objectPosition: "center center",
  fit: "cover",
  mediaBackground: "#c45c2a",
};

/** Premiere lookbook cover — invitation-only luxury hospitality (from partner PDF). */
export const PREMIERE_PARTNER_IMAGE: PartnerNetworkImage = {
  src: "/assets/partner-network/premiere-lookbook-cover.jpg",
  alt: "The Premiere Upscale Smoking Experience — invitation-only luxury cannabis hospitality",
  objectPosition: "center 45%",
};

/** SMAK'D brand lifestyle — consumer cannabis brand (official rusmakd.com photography). */
export const SMAKD_PARTNER_IMAGE: PartnerNetworkImage = {
  src: "/assets/partner-network/smakd-brand-lifestyle.jpg",
  alt: "SMAK'D premium rolling papers — consumer cannabis brand",
  objectPosition: "center 35%",
};

export const INTEGRATION_PARTNER_NETWORK_CARDS: PartnerNetworkCard[] = [
  {
    id: "good-trouble",
    name: "Good Trouble",
    status: "integration_in_development",
    description:
      "Integration in development for reusable age-verification workflows through Abraxas Passport.",
    href: "/good-trouble",
  },
];

export const DESIGN_PARTNER_NETWORK_CARDS: PartnerNetworkCard[] = [
  {
    id: "smakd",
    name: "SMAK'D",
    status: "design_partner",
    description:
      "Premium cannabis consumer brand exploring portable customer identity and loyalty.",
    image: SMAKD_PARTNER_IMAGE,
  },
  {
    id: "premiere",
    name: "The Premiere Upscale Smoking Experience",
    status: "design_partner",
    description:
      "Invitation-only cannabis hospitality experience exploring reusable guest credentials and trusted access.",
    image: PREMIERE_PARTNER_IMAGE,
  },
];

export const PARTNER_NETWORK_CARDS: PartnerNetworkCard[] = [
  ...INTEGRATION_PARTNER_NETWORK_CARDS,
  ...DESIGN_PARTNER_NETWORK_CARDS,
];

/** Cards shown on the public homepage — integration partners only (no design-partner brand wall). */
export const HOMEPAGE_PARTNER_INTEGRATION_CARDS = INTEGRATION_PARTNER_NETWORK_CARDS;

/** @deprecated Use INTEGRATION_PARTNER_NETWORK_CARDS */
export const LIVE_PARTNER_NETWORK_CARDS = INTEGRATION_PARTNER_NETWORK_CARDS;

export function partnerNetworkStatusLabel(status: PartnerNetworkStatus): string {
  switch (status) {
    case "integration_in_development":
      return "Integration in development";
    case "design_partner":
      return "Design Partner";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unsupported partner network status: ${_exhaustive}`);
    }
  }
}

export function partnerNetworkStatusEmoji(status: PartnerNetworkStatus): string {
  switch (status) {
    case "integration_in_development":
      return "🟡";
    case "design_partner":
      return "🟡";
    default: {
      const _exhaustive: never = status;
      throw new Error(`Unsupported partner network status: ${_exhaustive}`);
    }
  }
}
