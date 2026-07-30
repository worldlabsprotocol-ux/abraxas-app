// FILE: lib/home/partnerNetwork.ts
// Partner Network section — live implementations vs design partners (separate from Protocol in Action).

export type PartnerNetworkStatus = "live" | "design_partner";

export interface PartnerNetworkImage {
  src: string;
  alt: string;
  objectPosition?: string;
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

/** Featured visual for the cannabis ecosystem — event photography, not logos. */
export const PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE: PartnerNetworkImage = {
  src: "/assets/partner-network/cannabis-ecosystem-event.jpg",
  alt: "SMAK'D premium rolling papers at The Session Atlanta — cannabis hospitality event",
  objectPosition: "center 42%",
};

export const LIVE_PARTNER_NETWORK_CARDS: PartnerNetworkCard[] = [
  {
    id: "good-trouble",
    name: "Good Trouble",
    status: "live",
    description:
      "First relying party demonstrating reusable age verification through Abraxas Passport.",
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
  },
  {
    id: "premiere",
    name: "The Premiere Upscale Smoking Experience",
    status: "design_partner",
    description:
      "Invitation-only cannabis hospitality experience exploring reusable guest credentials and trusted access.",
    image: PARTNER_NETWORK_CANNABIS_FEATURED_IMAGE,
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
