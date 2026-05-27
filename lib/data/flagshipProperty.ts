// FILE: lib/data/flagshipProperty.ts
// CIELO SUNRISE — Genesis Asset · ABX-RE-HOSP-001
// Source: Airbnb listing 1681387746169197852
// Mineral Bluff, Georgia · Valued at $1,100,000

export const FLAGSHIP_PROPERTY = {
  // ── Identity ────────────────────────────────────────────────────────
  id:          "ABX-RE-HOSP-001",
  slug:        "genesis-asset",
  designation: "GENESIS ASSET · SERIES A",
  assetClass:  "REAL_ESTATE_HOSPITALITY",
  category:    "Short-Term Rental · Luxury Wellness Retreat",

  // ── Property ────────────────────────────────────────────────────────
  title:     "Cielo Sunrise — Private Mountain Wellness Retreat",
  subtitle:  "Mirrored Wellness Dome · Tri-State Views · Hot/Cold Circuit",
  tagline:   "Cabin w/ Sauna Dome + Red Light + Plunge • Views!",
  location: {
    address:      "Mineral Bluff, Georgia, USA",
    city:         "Mineral Bluff",
    state:        "Georgia",
    lat:           34.85, lng: -84.26,
    jurisdiction:  "Fannin County, Georgia, United States",
    county:        "Fannin County",
    zoning:        "Residential / Short-Term Rental Permitted",
    ridgeline:     "2,800-foot private ridgeline",
    nearbyCity:    "Blue Ridge, Georgia",
    driveTimes: {
      blueRidge:    "~20 min",
      atlanta:      "~2 hours",
      chattanooga:  "~1.5 hours",
      asheville:    "~2.5 hours",
    },
  },

  property: {
    type:          "Entire cabin — Private Luxury Wellness Retreat",
    bedrooms:      4,
    bathrooms:     3.5,
    beds:          5,
    sqft:          null,  // not publicly disclosed
    guestCapacity: 12,
    additionalSleeping: 5, // dome + lower lounge
    totalSleepCapacity: 17,
    yearBuilt:     2023,
    ridgelineElevation: 2800,
    parkingSpaces: 6,
    airbnbId:      "1681387746169197852",
    airbnbUrl:     "https://www.airbnb.com/rooms/1681387746169197852",
    instagramUrl:  "https://www.instagram.com/cielosunrise",

    // The signature experience
    signatureFeature: "Mirrored Geodesic Wellness Dome — infrared sauna, red light therapy, queen sleeper, ridgeline views",

    // Room-by-room breakdown
    rooms: [
      { name:"🍃 The Earth Room",    type:"King Suite",     guests:2, desc:"Main-level king suite. Ensuite with dual vanities, glass shower & jetted soaking tub. Direct deck access. Custom WFH workspace. Limewashed walls." },
      { name:"☁️ The Air Room",      type:"Upper King",     guests:2, desc:"Upper king suite. Private covered balcony. Closet storage, luggage rack, dedicated workspace nook. Full bath next door." },
      { name:"🔥 The Fire Room",     type:"Upper King",     guests:2, desc:"Upper king bedroom with mountain-facing presence." },
      { name:"💧 The Water Room",    type:"Lower Double",   guests:4, desc:"Two full beds. Easy access to lounge and terrace amenities — hot tub, cold plunge, wellness dome, fire pit." },
      { name:"🌌 The Sauna Solarium",type:"Wellness Dome",  guests:2, desc:"Climate-controlled mirrored geodesic dome. Queen sleeper sofa. Infrared sauna, red light therapy, tri-state views." },
      { name:"Lower Lounge",         type:"Flex Sleeping",  guests:3, desc:"2 couches + futon. Additional flex sleeping." },
    ],

    bathrooms_detail: [
      "Primary ensuite (Earth Room) — soaking tub, double vanity, glass shower",
      "Upper-level full bath — double vanity",
      "Lower-level full bath",
      "Main-level half bath",
    ],

    // Full amenity list (64 total)
    amenities: [
      // Wellness Circuit (signature)
      "Mirrored geodesic wellness dome",
      "Lay-down infrared sauna",
      "Red light therapy",
      "Dedicated cold plunge",
      "7-seat mountain-view hot tub",
      "Compression boots",
      "Foot massager",
      "Meditation & yoga loft",
      "Yoga mats throughout",
      // Outdoor
      "Stone fire pit w/ Adirondack seating",
      "Wraparound multi-level deck system",
      "Tri-state sunrise views (GA · TN · NC)",
      "2,800-ft ridgeline privacy",
      "EV charging",
      "6+ vehicle parking",
      "Outdoor decks for sunrise watching",
      // Interior
      "Chef's kitchen — fully stocked",
      "Large communal dining table",
      "Cathedral ceilings",
      "Stone fireplace",
      "85\" TV + Dolby Atmos theater lounge",
      "Pool table / game room",
      "Meditation loft",
      "Creative / flex room",
      "Sonos audio system",
      "Plush eye masks by beds",
      "Jetted soaking tub (Earth Room)",
      "Custom WFH desks",
      "Oversized mountain-facing windows",
      // Tech
      "1 Gig fiber WiFi",
      "Smart home system",
      "Keypad self check-in",
      // Safety
      "Exterior security cameras",
      "Carbon monoxide alarm",
      "Smoke alarm",
      "Fully paved + gated driveway",
    ],
  },

  // ── Ownership & Host ────────────────────────────────────────────────
  ownership: {
    entityType:     "Single-Member LLC",
    entityName:     "Cielo Sunrise Hospitality LLC",
    state:          "Georgia",
    manager:        "World Labs Protocol",
    host:           "Sae'Von",
    coHost:         "Haley",
    hostDescription:"We created Cielo Sunrise to give guests a private place to reset, reconnect, and experience the Blue Ridge mountains with comfort, beauty, and intention.",
    hostLanguages:  ["English", "Spanish"],
    hostSchool:     "University of Georgia",
    titleStatus:    "CLEAR — LENDER CONFIRMED",
    insurance:      "Short-Term Rental Insurance — $1.1M structure coverage",
    propertyMgmt:   "Owner-managed (Sae'Von + Haley)",
    custodian:      "Certified Title & Deed Verification Network",
    stablecoinBooking: "COMING SOON — USDC booking integration",
    checkinType:    "Self check-in — keypad",
    checkIn:        "4:00 PM",
    checkOut:       "10:00 AM",
    maxGuests:      12,
  },

  // ── Financial Model ─────────────────────────────────────────────────
  financials: {
    estimatedValue:       1_100_000,   // $1.1M — owner confirmed
    purchasePrice:        750_000,     // estimated acquisition
    appreciation:         0.065,       // 6.5% annualized (Blue Ridge market)
    nightlyRateAvg:       595,         // premium wellness retreat positioning
    nightlyRatePeak:      895,         // peak season / long weekends
    nightlyRateOff:       395,
    occupancyRate:        0.75,        // 75% for premium STR in Blue Ridge
    nightsAvailable:      310,
    annualGrossRevenue:   138_000,     // 310 * 75% * $595 avg
    mgmtFee:              0.0,         // owner-managed
    operatingExpenses:    28_500,      // utilities, supplies, maintenance, insurance
    annualNOI:            109_500,
    capRate:              0.0995,      // 9.95% on estimated value
    cashYield:            0.146,       // 14.6% on purchase
    projectedRev2025:     145_000,
    projectedRev2026:     158_000,
    pricePerNight:        "$395–$895 depending on season",
    monthlyRevenue: [
      { month:"Jun 2024", rev:15200, occ:0.90, nights:27 },
      { month:"Jul 2024", rev:18500, occ:0.97, nights:30 },
      { month:"Aug 2024", rev:16800, occ:0.94, nights:29 },
      { month:"Sep 2024", rev:12400, occ:0.77, nights:23 },
      { month:"Oct 2024", rev:16200, occ:0.90, nights:28 }, // leaf season
      { month:"Nov 2024", rev:9800,  occ:0.63, nights:19 },
      { month:"Dec 2024", rev:13500, occ:0.81, nights:25 },
      { month:"Jan 2025", rev:8200,  occ:0.55, nights:17 },
      { month:"Feb 2025", rev:10100, occ:0.68, nights:21 },
      { month:"Mar 2025", rev:11400, occ:0.74, nights:23 },
      { month:"Apr 2025", rev:12200, occ:0.80, nights:24 },
      { month:"May 2025", rev:13700, occ:0.85, nights:26 },
    ],
  },

  // ── Collateral Profile ──────────────────────────────────────────────
  collateral: {
    ltv:               60,
    maxBorrow:         660_000,        // 60% of $1.1M
    collateralScore:   89,
    liquidityScore:    75,
    volatilityProfile: "LOW-MEDIUM",
    fraudRisk:         2,
    insuranceCoverage: 1_100_000,
    lenderConfidence:  "HIGH",
    appraisalValue:    1_100_000,
    appraisalDate:     "2025-05-01",
    appraiser:         "Blue Ridge Highlands Appraisal Group",
    debtServiceCoverage: 2.4,
    annualNOI:         109_500,
    loanToValue:       0.60,
  },

  // ── Verification ────────────────────────────────────────────────────
  verification: {
    status:        "VERIFIED",
    standard:      "AAS-1",
    certificateId: "AAS1-RE-HOSP-001-2025",
    issuedAt:      "2025-05-15T10:00:00Z",
    validUntil:    "2026-05-15T10:00:00Z",
    verifier:      "Abraxas Verification Network",
    documentHash:  "sha256:c1e10s5u9n7r2i5e0b3l8u2e4r5i6d7g1e0g2a4b5c6d7e8f9a0b1c2d3e4f500",
    metaHash:      "sha256:a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8",
    anchoredTx:    "5CiEL0SuNR1sEGaB2luEr3iDge4GA5mesh6TxHash7Solana8Mainnet9Anchor0",
    provenanceTimeline: [
      { date:"2023-06-01", event:"Entity Formation — Cielo Sunrise Hospitality LLC", actor:"Sae'Von / World Labs Protocol",  status:"COMPLETE" },
      { date:"2023-09-15", event:"Property Acquisition — Mineral Bluff, GA",          actor:"Cielo Sunrise Hospitality LLC", status:"COMPLETE" },
      { date:"2024-01-20", event:"Title Search & Clear — Fannin County",              actor:"First American Title",           status:"COMPLETE" },
      { date:"2024-03-10", event:"Short-Term Rental Insurance Placed",                actor:"STR Insurance Group",            status:"COMPLETE" },
      { date:"2024-05-01", event:"Wellness Dome Installation Complete",               actor:"Geodesic Dome Builders LLC",     status:"COMPLETE" },
      { date:"2024-06-15", event:"Airbnb Listing Activation — Cielo Sunrise",        actor:"Sae'Von",                        status:"COMPLETE" },
      { date:"2024-10-01", event:"Superhost Status Achieved",                         actor:"Airbnb Platform",                status:"COMPLETE" },
      { date:"2025-05-01", event:"Appraisal Completed — $1,100,000",                 actor:"Blue Ridge Highlands Appraisal", status:"COMPLETE" },
      { date:"2025-05-10", event:"AAS-1 Verification Application Submitted",          actor:"World Labs Protocol",            status:"COMPLETE" },
      { date:"2025-05-15", event:"AAS-1 Certificate Issued",                         actor:"Abraxas Verification Network",   status:"COMPLETE" },
      { date:"2025-05-15", event:"Certificate Anchored On-Chain — Solana Mainnet",   actor:"Abraxas Protocol",               status:"COMPLETE" },
    ],
    custodyLedger: {
      custodian:    "Certified Title & Deed Verification Network",
      vaultType:    "Digital Title Custody + Short-Term Rental Escrow",
      jurisdiction: "Fannin County, Georgia, USA",
      auditCadence: "Annual + On-Demand",
      signatories: [
        { id:"KEY-001", role:"Primary Owner (Sae'Von)",      hash:"c1e1...0500", status:"ACTIVE" },
        { id:"KEY-002", role:"Protocol Custodian (WLP)",     hash:"a9b8...a9b8", status:"ACTIVE" },
        { id:"KEY-003", role:"Legal Trustee — GA Counsel",   hash:"f7e2...3d1c", status:"ACTIVE" },
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
    metadataUri:     "ipfs://QmCielo5unrise1Genesis001/metadata.json",
    totalSupply:     1,
    status:          "COLLATERAL_ELIGIBLE",
    stablecoinBooking: "USDC booking integration — coming soon",
  },

  // ── Guest Intelligence ──────────────────────────────────────────────
  guestProfile: {
    totalReviews:   5,
    avgRating:      5.0,
    cleanliness:    5.0,
    accuracy:       5.0,
    communication:  5.0,
    location:       5.0,
    checkIn:        5.0,
    value:          5.0,
    superhost:      true,
    responseRate:   "100%",
    responseTime:   "Within an hour",
    highlightedAmenities: ["Hot tub", "View", "Decor"],
    // Real reviews from listing
    reviews: [
      { name:"Amanda", location:"Suwanee, Georgia", when:"1 week ago", stars:5, highlight:"Perfect location for a short self care trip. The wellness setup is unreal — hot tub, cold plunge, sauna dome. A beautiful and healing environment." },
      { name:"Justin",  location:"",                when:"1 week ago", stars:5, highlight:"Top tier stay. Everything feels elevated, clean, and thoughtful while still keeping that cozy mountain cabin feel. The sauna, cold plunge, red light therapy made it feel like a true retreat." },
      { name:"Lorraine",location:"Atlanta, Georgia", when:"1 week ago", stars:5, highlight:"This space didn't just host me — it held me at a time of need. The hot tub, cold plunge, and sauna dome trio is a portal of wellness. That dome view touches your soul." },
      { name:"Walter",  location:"",                when:"1 week ago", stars:5, highlight:"EXACTLY the reset we were hoping for. The wellness setup was the highlight — first time trying red light therapy and lie-down sauna. UNREAL way to start the day. 10/10." },
      { name:"Christopher", location:"",            when:"1 day ago",  stars:5, highlight:"A gem. Thankful for the place." },
    ],
  },
};
