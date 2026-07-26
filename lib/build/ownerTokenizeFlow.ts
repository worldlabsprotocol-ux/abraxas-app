// FILE: lib/build/ownerTokenizeFlow.ts
// Everyday-owner copy and asset types for /build tokenize wizard.

export const TOKENIZE_STEPS = ["pick", "describe", "submit", "done"] as const;
export type TokenizeStep = (typeof TOKENIZE_STEPS)[number];

export const OWNER_ASSET_OPTIONS = [
  { id: "real_estate", label: "Home or land", sub: "Property you own or hold title to" },
  { id: "wyoming_llc", label: "Business", sub: "LLC, company, or operating asset" },
  { id: "music_royalties", label: "Music or creative", sub: "Catalog, royalties, art, or IP" },
  { id: "equipment", label: "Equipment", sub: "Machinery, vehicles, or inventory" },
  { id: "other", label: "Something else", sub: "We will help you classify it" },
] as const;

export type OwnerAssetTypeId = (typeof OWNER_ASSET_OPTIONS)[number]["id"];

export function tokenizeStepLabel(step: TokenizeStep): string {
  switch (step) {
    case "pick":
      return "What you own";
    case "describe":
      return "A few details";
    case "submit":
      return "Send to Abraxas";
    case "done":
      return "Done";
  }
}
