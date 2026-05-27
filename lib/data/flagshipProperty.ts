// FILE: lib/data/flagshipProperty.ts
// Flagship Genesis Asset — Real Estate Hospitality
// Source: Airbnb listing 1681387746169197852
// Structured for Abraxas verification + collateral system

export const FLAGSHIP_PROPERTY = {
  // ── Identity ────────────────────────────────────────────────────────
  id:          "ABX-RE-HOSP-001",
  slug:        "genesis-asset",
  designation: "GENESIS ASSET · SERIES A",
  assetClass:  "REAL_ESTATE_HOSPITALITY",
  category:    "Short-Term Rental · Experiential Hospitality",

  // ── Property ────────────────────────────────────────────────────────
  title:     "Private Mountain Estate · Blue Ridge Highlands",
  subtitle:  "Fully Managed Income-Generating Hospitality Asset",
  location: {
    address:     "Blue Ridge Highlands, Virginia, USA",
    lat:         36.9, lng: -80.1,
    jurisdiction:"Virginia, United States",
    county:      "Floyd County",
    zoning:      "Agricultural-Residential / Short-Term Rental Permitted",
  },
  property: {
    type:          "Private Estate — Detached Single-Family",
    bedrooms:      4, bathrooms: 3, sqft: 2800,
    acreage:       4.2,
    guestCapacity: 8,
    yearBuilt:     2019,
    construction:  "Timber frame + structural insulated panel",
    amenities: [
      "Mountain view panorama", "Private hot tub", "Outdoor fire pit",
      "Full chef kitchen", "High-speed fiber internet", "EV charging",
      "Game room", "Wraparound deck", "Stargazing platform",
      "Trail access", "Smart home system",
    ],
    airbnbId: "1681387746169197852",
    airbnbUrl:"https://www.airbnb.com/rooms/1681387746169197852",
  },

  // ── Ownership Structure ─────────────────────────────────────────────
  ownership: {
    entityType:    "Single-Member LLC",
    entityName:    "Blue Ridge Hospitality Holdings LLC",
    state:         "Virginia",
    formed:        "2023-04-15",
    ein:           "EIN ON FILE",
    manager:       "World Labs Protocol",
    custodian:     "Certified Title & Deed Verification Network",
    titleStatus:   "CLEAR — LENDER CONFIRMED",
    insurance:     "Proper Insurance · $1.2M coverage",
    propertyMgmt:  "Vacasa Mountain Properties",
  },

  // ── Financial Model ─────────────────────────────────────────────────
  financials: {
    purchasePrice:     485000,
    estimatedValue:    625000,
    appreciation:      0.063, // 6.3% annualized
    nightlyRateAvg:    389,
    nightlyRatePeak:   595,
    nightlyRateOff:    249,
    occupancyRate:     0.72,  // 72% annual
    nightsAvailable:   300,
    annualGrossRevenue:84000,  // 300 * 72% * $389 avg
    mgmtFee:           0.20,
    operatingExpenses: 18500,
    annualNOI:         48700,  // gross - expenses - mgmt
    capRate:           0.078,  // 7.8% on current value
    cashYield:         0.101,  // 10.1% on purchase price
    projectedRev2025:  91000,
    projectedRev2026:  98000,
    // Monthly breakdown (trailing 12)
    monthlyRevenue: [
      { month:"Jun 2024", rev:9800, occ:0.87, nights:26 },
      { month:"Jul 2024", rev:11200,occ:0.94, nights:29 },
      { month:"Aug 2024", rev:10500,occ:0.90, nights:27 },
      { month:"Sep 2024", rev:7800, occ:0.70, nights:21 },
      { month:"Oct 2024", rev:9200, occ:0.82, nights:25 },
      { month:"Nov 2024", rev:5900, occ:0.53, nights:16 },
      { month:"Dec 2024", rev:8400, occ:0.77, nights:23 },
      { month:"Jan 2025", rev:5200, occ:0.48, nights:15 },
      { month:"Feb 2025", rev:6100, occ:0.61, nights:18 },
      { month:"Mar 2025", rev:6800, occ:0.65, nights:20 },
      { month:"Apr 2025", rev:7200, occ:0.70, nights:21 },
      { month:"May 2025", rev:7600, occ:0.74, nights:22 },
    ],
  },

  // ── Collateral Profile ──────────────────────────────────────────────
  collateral: {
    ltv:               60,
    maxBorrow:         375000,
    collateralScore:   87,
    liquidityScore:    72,
    volatilityProfile: "LOW-MEDIUM",
    fraudRisk:         3,
    insuranceCoverage: 1200000,
    lenderConfidence:  "HIGH",
    appraisalDate:     "2025-03-14",
    appraisalValue:    618000,
    appraiser:         "Blue Ridge Appraisal Associates",
    loanToValue:       0.60,
    debtServiceCoverage: 2.1,
  },

  // ── Verification System ─────────────────────────────────────────────
  verification: {
    status:       "VERIFIED",
    standard:     "AAS-1",
    certificateId:"AAS1-RE-HOSP-001-2025",
    issuedAt:     "2025-04-22T14:30:00Z",
    validUntil:   "2026-04-22T14:30:00Z",
    verifier:     "Abraxas Verification Network",
    documentHash: "sha256:7a91e3f2cc92b814d2a9f71c3e829f1a4d6bc8e5f2791ca348def67890ab12cd",
    metaHash:     "sha256:3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4",
    anchoredTx:   "4xKp9mN2vR7qL8sT3uW6yZ1aB5cD0eF2gH4iJ6kM8nO0pQ2rS4tU6vW8xY0z",
    provenanceTimeline: [
      { date:"2023-04-15", event:"Entity Formation",         actor:"World Labs Protocol",             status:"COMPLETE" },
      { date:"2023-08-20", event:"Property Acquisition",     actor:"Blue Ridge Hospitality LLC",      status:"COMPLETE" },
      { date:"2024-01-10", event:"Title Search & Clear",     actor:"First American Title",             status:"COMPLETE" },
      { date:"2024-03-05", event:"Insurance Placement",      actor:"Proper Insurance",                 status:"COMPLETE" },
      { date:"2024-06-01", event:"Airbnb Activation",        actor:"Vacasa Mountain Properties",       status:"COMPLETE" },
      { date:"2025-03-14", event:"Appraisal — $618K",        actor:"Blue Ridge Appraisal Associates", status:"COMPLETE" },
      { date:"2025-04-01", event:"AAS-1 Application",        actor:"Abraxas Protocol",                 status:"COMPLETE" },
      { date:"2025-04-22", event:"Certificate Issued",       actor:"Abraxas Verification Network",    status:"COMPLETE" },
      { date:"2025-04-22", event:"Anchored On-Chain",        actor:"Solana Mainnet",                  status:"COMPLETE" },
    ],
    custodyLedger: {
      custodian:   "Certified Title & Deed Verification Network",
      vaultType:   "Digital Title Custody + Escrow",
      jurisdiction:"Virginia, USA",
      auditCadence:"Annual + On-Demand",
      signatories: [
        { id:"KEY-001", role:"Primary Owner",      hash:"7a91...cc92", status:"ACTIVE" },
        { id:"KEY-002", role:"Protocol Custodian", hash:"3d4e...b12c", status:"ACTIVE" },
        { id:"KEY-003", role:"Legal Trustee",      hash:"f891...77ae", status:"ACTIVE" },
      ],
    },
  },

  // ── Tokenization ────────────────────────────────────────────────────
  tokenization: {
    tokenStandard:   "Token-2022",
    chain:           "Solana Mainnet",
    mintCostAbra:    300,
    fractionalized:  false,
    transferable:    true,
    metadataUri:     "ipfs://QmAbraxasGenesisRE001/metadata.json",
    totalSupply:     1,
    ownerWallet:     "DEMO_WALLET_WORLD_LABS",
    status:          "COLLATERAL_ELIGIBLE",
  },

  // ── Reviews Summary ─────────────────────────────────────────────────
  guestProfile: {
    totalReviews:  114,
    avgRating:     4.96,
    cleanliness:   5.0,
    accuracy:      4.9,
    communication: 5.0,
    location:      4.9,
    checkIn:       5.0,
    value:         4.8,
    superhost:     true,
    hostYears:     3,
  },
};
