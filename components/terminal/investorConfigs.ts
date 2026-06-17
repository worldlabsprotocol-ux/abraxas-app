// FILE: components/terminal/investorConfigs.ts
// Per-asset investment structure data. Drives InvestorPortalModal.
// Adding a new asset = adding one entry here, no new components needed.

export interface InvestmentOption {
  title: string;
  badge: string;
  color: string;
  desc: string;
  note: string;
}

export interface AssetInvestConfig {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  stats: Array<{ label: string; val: string }>;
  options: InvestmentOption[];
  historicalNote?: string;
}

export const INVEST_CONFIGS: Record<string, AssetInvestConfig> = {

  "aas-1": {
    id: "aas-1",
    name: "Cielo Sunrise",
    subtitle: "Mineral Bluff, Georgia · Mountain Wellness Retreat",
    color: "#10B981",
    stats: [
      { label: "Appraised Value",  val: "$1,100,000" },
      { label: "Collateral Score", val: "89 / 100" },
      { label: "Cash Yield",       val: "14.6%" },
      { label: "Cap Rate",        val: "9.95%" },
    ],
    options: [
      {
        title: "Collateral Loan",
        badge: "ACTIVE STRUCTURE",
        color: "#10B981",
        desc: "Property-backed USDC loan against verified equity. Operating retreat with active Airbnb income servicing the position.",
        note: "Up to $660K available at current valuation",
      },
    ],
  },

  "aas-2": {
    id: "aas-2",
    name: "DeMarko Reddins",
    subtitle: "Published Author Catalog · Literary IP",
    color: "#6366F1",
    stats: [
      { label: "Asset Class",   val: "Literary IP" },
      { label: "Revenue Source", val: "KDP + Distributors" },
      { label: "Rights Type",   val: "Publishing / Royalties" },
      { label: "Status",        val: "VERIFICATION PENDING" },
    ],
    options: [
      {
        title: "Royalty Stream Token",
        badge: "RECOMMENDED",
        color: "#6366F1",
        desc: "Tokenize future royalty income across the published catalog. Investors receive a proportional share of distribution revenue as it's earned, paid in USDC.",
        note: "Catalog spans multiple titles across platforms",
      },
      {
        title: "Catalog Equity",
        badge: "LONG-TERM",
        color: "#8B5CF6",
        desc: "Fractional ownership in the catalog itself, including future titles. Appreciation tied to author's continued output and audience growth.",
        note: "Reg D framework, accredited investors",
      },
    ],
  },

  "aas-3": {
    id: "aas-3",
    name: "14 Days in Beijing",
    subtitle: "Chancellor K. Jackson · Multi-Format IP",
    color: "#F59E0B",
    stats: [
      { label: "TV Pilot",   val: "13 EP · COMPLETE" },
      { label: "Anime Series", val: "17 EP · COMPLETE" },
      { label: "Stage",      val: "ACQUISITION TALKS" },
      { label: "Status",     val: "VERIFICATION PENDING" },
    ],
    options: [
      {
        title: "Production Fractional Equity",
        badge: "RECOMMENDED",
        color: "#F59E0B",
        desc: "Fractional stake in the IP across all completed formats: TV pilot, anime series, and future live play adaptation. Investors share in licensing and distribution proceeds.",
        note: "Acquisition discussions active with production partners",
      },
      {
        title: "Format-Specific Rights",
        badge: "TARGETED",
        color: "#EC4899",
        desc: "Invest in a single format, TV/film or anime, rather than the full IP package. Lower entry, narrower upside tied to that format's deal outcome.",
        note: "Choose TV pilot or anime track independently",
      },
    ],
  },

  "aas-4": {
    id: "aas-4",
    name: "Smyrna Townhome",
    subtitle: "Smyrna, Georgia · 6 min from Truist Park",
    color: "#06B6D4",
    stats: [
      { label: "Property Type",  val: "Townhome" },
      { label: "Lien Status",   val: "PAID OFF · CLEAR" },
      { label: "Original Purchase (1999)", val: "$70,000" },
      { label: "Current Value (Est.)",    val: "$208,000" },
    ],
    historicalNote:
      "Purchased in 1999 for approximately $70,000. Current estimated value is approximately $208,000, roughly 3x appreciation over 25 years. This reflects Smyrna's transformation into one of metro Atlanta's strongest residential markets following The Battery Atlanta development.",
    options: [
      {
        title: "Collateral Loan",
        badge: "RECOMMENDED",
        color: "#06B6D4",
        desc: "Property is paid off, so you can borrow USDC against equity at up to 60% LTV. No sale required. Owner keeps full ownership and occupancy.",
        note: "~60% of appraised value available, zero existing debt",
      },
      {
        title: "Fractional Equity",
        badge: "INVESTOR OPTION",
        color: "#8B5CF6",
        desc: "Tokenize a defined percentage of equity as a Reg D offering. Investors earn proportional appreciation on future sale or refinance.",
        note: "Owner retains majority ownership and management",
      },
      {
        title: "Rental Income Stream",
        badge: "STR POTENTIAL",
        color: "#F59E0B",
        desc: "Six minutes from The Battery Atlanta, where short-term rental demand is strong. Tokenize future rental income for monthly USDC distributions.",
        note: "Battery Atlanta proximity supports premium STR rates",
      },
    ],
  },
};
