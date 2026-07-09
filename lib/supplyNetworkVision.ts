// FILE: lib/supplyNetworkVision.ts
// Verified Supply Network — commercial operating layer for manufacturing & beyond.

export const SUPPLY_NETWORK = {
  headline: "From asset registry to verified supply network",
  subhead:
    "The same trust primitives that verify a hospitality asset can verify suppliers, contracts, lead times, and delivery performance — one shared version of the truth.",
  supplierFields: [
    "Verified company identity",
    "Verified capabilities (what they manufacture or process)",
    "Active contracts & negotiated pricing",
    "Lead times & capacity forecasts",
    "Delivery performance history",
    "Quality metrics & certifications",
  ],
  orderLifecycle: [
    "Contract signed",
    "Material secured",
    "Production started",
    "Inspection completed",
    "Shipment sent",
    "Delivery confirmed",
  ],
  industries: ["Aerospace", "Automotive", "Defense", "Energy", "Medical devices", "Real assets & hospitality"],
  valueProp:
    "Can my suppliers actually deliver what I need, when I need it? Abraxas answers that with verified identity, attestations, and a public checker — not another siloed portal.",
} as const;
