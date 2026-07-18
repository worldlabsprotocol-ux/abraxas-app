// FILE: lib/assetPositioning.ts
// Position assets for tokenization now — core revenue + user loop narrative.

export const ASSET_POSITIONING_HEADLINE =
  "Position before the chain — not after the premium";

export const ASSET_POSITIONING_BODY =
  "Legacy assets tokenize quietly, then charge a premium to act. Abraxas closes the loop now: verify, registry-ready, tokenize when you choose — not when incumbents let you.";

export const ASSET_POSITIONING_STEPS = [
  {
    step: "1",
    title: "Register & verify",
    body: "Submit asset, bind wallet, complete assurance tiers your counterparties require.",
    href: "/build",
  },
  {
    step: "2",
    title: "Registry-ready",
    body: "Public ABX record, monitoring feeds, partner-visible status — act before MLS/token noise.",
    href: "/verify",
  },
  {
    step: "3",
    title: "Transact with options",
    body: "Collateral, sale, or tokenization — credentials travel; you exercise when the window opens.",
    href: "/integrate",
  },
] as const;

export const ASSET_POSITIONING_REVENUE_NOTE =
  "Protocol revenue: verification tiers, registry monitoring, partner API usage, and tokenization-ready positioning — priced for operators, not retail markups.";
