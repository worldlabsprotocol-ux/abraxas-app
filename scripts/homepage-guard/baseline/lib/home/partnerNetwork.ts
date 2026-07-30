// FILE: lib/home/partnerNetwork.ts
// Partner Network section — live implementations vs design partners (separate from Protocol in Action).

export type PartnerNetworkStatus = "live" | "design_partner";

export interface PartnerNetworkImage {
  src: string;
  alt: string;
  objectPosition?: string;
  fit?: "cover" | "contain";
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
  fit: "contain",
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

export const LIVE_PARTNER_NETWORK_CARDS: PartnerNetworkCard[] = [
  {
    id: "good-trouble",
    name: "Good Trouble",
    status: "live",
    description:
      "First relying party demonstrating reusable age verification through Abraxas Passport.",
    href: "/good-trouble",
    image: GOOD_TROUBLE_PARTNER_IMAGE,
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
  ...LIVE_PARTNER_NETWORK_CARDS,
  ...DESIGN_PARTNER_NETWORK_CARDS,
];

export function partnerNetworkStatusLabel(status: PartnerNetworkStatus): string {
  return status === "live" ? "Live" : "Design Partner";
}

export function partnerNetworkStatusEmoji(status: PartnerNetworkStatus): string {
  return status === "live" ? "🟢" : "🟡";
}
