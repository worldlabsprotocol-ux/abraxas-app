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
  confidenceChecks?: Array<{ source: string; status: "confirmed" | "pending" }>;
  // True for assets the founder personally reviewed before listing.
  // This is the single source of truth for that designation, read it
  // here, don't maintain a separate list of asset IDs anywhere else,
  // that's exactly how this drifts out of sync when a new asset ships.
  founderVetted?: boolean;
}

export const INVEST_CONFIGS: Record<string, AssetInvestConfig> = {

  "aas-1": {
    id: "aas-1",
    founderVetted: true,
    name: "Cielo Sunrise",
    subtitle: "Mineral Bluff, Georgia · Mountain Wellness Retreat",
    color: "#10B981",
    stats: [
      { label: "Appraised Value",  val: "$1,100,000" },
      { label: "Lending Score", val: "94 / 100" },
      { label: "Cash Yield",       val: "14.6%" },
      { label: "Yearly Return Rate", val: "9.95%" },
    ],
    options: [
      {
        title: "Borrow Against This Property",
        badge: "ACTIVE STRUCTURE",
        color: "#10B981",
        desc: "Get USDC against the property's verified equity, no sale needed. Structured as a collateral loan, the active Airbnb income services the position.",
        note: "Up to $660K available at current valuation",
      },
    ],
    confidenceChecks: [
      { source: "Title search",              status: "confirmed" },
      { source: "Appraisal",                 status: "confirmed" },
      { source: "Active rental income record", status: "confirmed" },
      { source: "Public record cross-check", status: "confirmed" },
    ],
  },

  "aas-2": {
    id: "aas-2",
    founderVetted: true,
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
        desc: "Fractional ownership in the catalog itself, including future titles. Appreciation tied to author's continued output and audience growth, settled in USDC on exit.",
        note: "Reg D framework, accredited investors",
      },
    ],
    confidenceChecks: [
      { source: "Copyright registration",  status: "confirmed" },
      { source: "Platform sales record",   status: "confirmed" },
      { source: "Royalty audit",           status: "pending" },
      { source: "Rights chain verification", status: "pending" },
    ],
  },

  "aas-3": {
    id: "aas-3",
    founderVetted: true,
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
        desc: "Fractional stake in the IP across all completed formats: TV pilot, anime series, and future live play adaptation. Investors share in licensing and distribution proceeds, paid in USDC.",
        note: "Acquisition discussions active with production partners",
      },
      {
        title: "Format-Specific Rights",
        badge: "TARGETED",
        color: "#EC4899",
        desc: "Invest in a single format, TV/film or anime, rather than the full IP package. Lower entry, narrower upside tied to that format's deal outcome. Distributions paid in USDC.",
        note: "Choose TV pilot or anime track independently",
      },
    ],
    confidenceChecks: [
      { source: "Script registration",         status: "confirmed" },
      { source: "Production talks documented", status: "confirmed" },
      { source: "Distribution rights audit",   status: "pending" },
      { source: "Valuation appraisal",         status: "pending" },
    ],
  },

  "aas-4": {
    id: "aas-4",
    founderVetted: true,
    name: "Smyrna Townhome",
    subtitle: "Smyrna, GA 30080 · 2BD/2BA Townhome · 6 min from Truist Park / The Battery Atlanta",
    color: "#06B6D4",
    stats: [
      { label: "Property Type",    val: "Condo / Townhouse" },
      { label: "Bedrooms / Bath",  val: "2 BD / 2 BA" },
      { label: "Square Footage",   val: "1,220 sq ft" },
      { label: "Stories",          val: "2" },
      { label: "Total Rooms",      val: "5" },
      { label: "Year Built",       val: "1984" },
      { label: "Lien Status",      val: "Clear" },
      { label: "Purchase (1999)",  val: "$76,200" },
      { label: "Current Est.",     val: "$208,200+" },
      { label: "Appreciation",     val: "~3x since purchase" },
    ],
    historicalNote:
      "Purchased March 1999 for $76,200 (public record confirmed). Current estimated value $208,200+, approximately 3x appreciation over 25 years without a traditional bank refinance. Located in Smyrna's 30080 corridor, six minutes from Truist Park and The Battery Atlanta, a $1B+ mixed-use development that has fundamentally repriced the surrounding residential market. Construction and commercial investment in the Smyrna/Cumberland area has continued accelerating since The Battery opened in 2017, making this area one of metro Atlanta's most defensible holds. The owner has chosen not to take the traditional bank loan route, positioning this asset for a structured on-chain solution that better fits the long-term thesis: hold the equity, access liquidity on favorable terms, and continue benefiting from the ongoing commercial development in the immediate area.",
    options: [
      {
        title: "On-Chain Equity Loan",
        badge: "PREFERRED STRUCTURE",
        color: "#06B6D4",
        desc: "Property is paid off and clear. Borrow USDC against the verified equity without selling, without a bank, and without a refinance. Owner keeps full ownership, occupancy, and future appreciation.",
        note: "Up to 60% of appraised value, zero existing debt on the property",
      },
      {
        title: "Fractional Appreciation Share",
        badge: "INVESTOR OPTION",
        color: "#8B5CF6",
        desc: "Investors participate in the ongoing appreciation of a Battery Atlanta-adjacent property through a tokenized equity position. Paid in USDC on future sale or refinance event.",
        note: "Owner retains majority ownership and full management control",
      },
      {
        title: "Short-Term Rental Income",
        badge: "STR POTENTIAL",
        color: "#F59E0B",
        desc: "6 minutes from Truist Park puts this in one of Atlanta's strongest short-term rental demand zones on game days, concerts, and Braves season. Tokenized rental income distributed monthly in USDC.",
        note: "The Battery Atlanta draws 3M+ visitors annually, STR premium supported",
      },
    ],
    confidenceChecks: [
      { source: "Public sale record (March 1999)",  status: "confirmed" },
      { source: "Lien search, clear title",        status: "confirmed" },
      { source: "Comparable sales analysis",        status: "confirmed" },
      { source: "Independent appraisal",            status: "confirmed" },
    ],
  },

  "aas-5": {
    id: "aas-5",
    founderVetted: true,
    name: "Naj Tulum",
    subtitle: "Aldea Zama, Tulum, Mexico · Condo-Hotel Unit",
    color: "#F59E0B",
    stats: [
      { label: "Location",        val: "Aldea Zama, Tulum, MX" },
      { label: "Purchased",       val: "2023" },
      { label: "Ownership",       val: "Owned outright" },
      { label: "Title structure", val: "Fideicomiso (bank trust)" },
      { label: "Monthly income",  val: "$1,500 / month" },
      { label: "Lien Status",     val: "Clear · No debt" },
    ],
    historicalNote:
      "Purchased in 2023, owned outright with no existing debt. Naj Tulum is a boutique condo-hotel in Aldea Zama, one of Tulum's most established planned communities, with paved infrastructure and strong rental demand from international tourism. Foreign ownership of coastal Mexican real estate is held through a fideicomiso, a bank trust structure, which Abraxas verifies as part of confirming clear title, the same rigor applied to any US-based asset on the platform.",
    options: [
      {
        title: "Borrow Against This Property",
        badge: "OWNED OUTRIGHT",
        color: "#F59E0B",
        desc: "Get USDC against the unit's verified equity, no sale needed. The property is debt-free, the existing monthly rental income can service the position.",
        note: "No existing debt, full equity available as collateral",
      },
      {
        title: "Rental Income Share",
        badge: "INVESTOR OPTION",
        color: "#8B5CF6",
        desc: "Participate in the unit's recurring rental income, distributed monthly in USDC, from an international tourism market with strong, consistent demand.",
        note: "Current monthly income: $1,500",
      },
    ],
    confidenceChecks: [
      { source: "Fideicomiso (bank trust) title verification", status: "confirmed" },
      { source: "Purchase record (2023)",                      status: "confirmed" },
      { source: "Lien search, clear title",                    status: "confirmed" },
      { source: "Independent appraisal",                       status: "pending" },
    ],
  },

  "aas-6": {
    id: "aas-6",
    founderVetted: true,
    name: "The Clove",
    subtitle: "Blu Pearl Development, Zanzibar · Sold Out, Track Record",
    color: "#06B6D4",
    stats: [
      { label: "Land / Build",       val: "179m² / 149m²" },
      { label: "Purchased",          val: "2023" },
      { label: "Status",             val: "Sold out" },
      { label: "Ref. nightly rate",  val: "$232 (developer-published)" },
      { label: "Ref. ROI range",     val: "23.8% to 32% (developer projection)" },
    ],
    historicalNote:
      "Purchased in 2023, since sold out. Shown as a completed track record, not an open offering, no investment options exist for this asset.",
    options: [],
    confidenceChecks: [
      { source: "Purchase record (2023)",       status: "confirmed" },
      { source: "Construction completion",      status: "confirmed" },
      { source: "Sale confirmation",            status: "confirmed" },
      { source: "Independent appraisal",        status: "pending" },
    ],
  },
};
