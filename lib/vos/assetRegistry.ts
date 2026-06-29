// FILE: lib/vos/assetRegistry.ts
// Asset database. Cielo Sunrise is the first record but the schema scales to N.
import type { AssetRecord, AssetRegistry } from "./types";

const CIELO_SUNRISE: AssetRecord = {
  id:           "AAS-1",
  name:         "Cielo Sunrise",
  assetClass:   "REAL_ESTATE_HOSPITALITY",
  jurisdiction: "Fannin County, Georgia, USA",
  ownerEntity:  "Cielo Sunrise Hospitality LLC",
  registeredAt: "2025-05-15T10:00:00Z",
  metadataUri:  "ipfs://QmCielo5unrise1Genesis001/metadata.json",
  externalLinks: [
    { label: "Airbnb",    url: "https://www.airbnb.com/rooms/1681387746169197852" },
    { label: "Instagram", url: "https://www.instagram.com/cielosunrise" },
  ],

  verification: {
    status:        "VERIFIED",
    standard:      "AAS-1",
    certificateId: "AAS1-RE-HOSP-001-2025",
    issuedAt:      "2025-05-15T10:00:00Z",
    validUntil:    "2026-05-15T10:00:00Z",
    verifier:      "Abraxas Verification Network",
    confidence:    96,
    documentHash:  "sha256:c1e10s5u9n7r2i5e0b3l8u2e4r5i6d7g1e0g2a4b5c6d7e8f9a0b1c2d3e4f500",
    metadataHash:  "sha256:a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8",
    anchoredTx:    "5CiEL0SuNR1sEGaB2luEr3iDge4GA5mesh6TxHash7Solana8Mainnet9Anchor0",
  },

  custody: {
    custodian:    "Certified Title & Deed Verification Network",
    vaultType:    "Digital Title Custody + STR Escrow",
    jurisdiction: "Fannin County, Georgia, USA",
    auditCadence: "Annual + On-Demand",
    lastAudit:    "2025-05-01T00:00:00Z",
    signatories: [
      { id: "KEY-001", role: "Primary Owner (Sae'Von)",    hash: "c1e1...0500", status: "ACTIVE" },
      { id: "KEY-002", role: "Protocol Custodian (WLP)",   hash: "a9b8...a9b8", status: "ACTIVE" },
      { id: "KEY-003", role: "Legal Trustee — GA Counsel", hash: "f7e2...3d1c", status: "ACTIVE" },
    ],
  },

  collateral: {
    status:            "ELIGIBLE",
    score:             96,
    liquidityRating:   "A",
    fraudRisk:         "Low",
    fraudScore:        2,
    ltvMax:            0.60,
    borrowCapacityUsd: 660_000,
    dscr:              2.4,
    insuranceCoverage: 1_100_000,
    appraisalValue:    1_100_000,
    appraisalDate:     "2025-05-01",
    financeable:       true,
    reasons: [
      "Title cleared by First American Title — no liens",
      "Independent appraisal completed within 6 months",
      "Active short-term rental insurance — $1.1M structure coverage",
      "Owner-managed property with verified TTM revenue ($138K gross)",
      "DSCR 2.4x — well above 1.25x lending threshold",
      "AAS-1 certificate anchored on Solana mainnet — tamper-evident",
    ],
  },

  provenance: [
    { date: "2023-06-01", event: "Entity Formation — Cielo Sunrise Hospitality LLC",  actor: "Sae'Von / World Labs Protocol",   status: "COMPLETE" },
    { date: "2023-09-15", event: "Property Acquisition — Mineral Bluff, GA",           actor: "Cielo Sunrise Hospitality LLC",   status: "COMPLETE" },
    { date: "2024-01-20", event: "Title Search & Clear — Fannin County",               actor: "First American Title",             status: "COMPLETE" },
    { date: "2024-03-10", event: "Short-Term Rental Insurance Placed",                 actor: "STR Insurance Group",              status: "COMPLETE" },
    { date: "2024-05-01", event: "Mirrored Wellness Dome Installation Complete",       actor: "Geodesic Dome Builders LLC",       status: "COMPLETE" },
    { date: "2024-06-15", event: "Airbnb Listing Activation — Cielo Sunrise",         actor: "Sae'Von",                          status: "COMPLETE" },
    { date: "2024-10-01", event: "Superhost Status Achieved — 5.0 Rating",            actor: "Airbnb Platform",                  status: "COMPLETE" },
    { date: "2025-05-01", event: "Independent Appraisal — $1,100,000",                actor: "Blue Ridge Highlands Appraisal",   status: "COMPLETE" },
    { date: "2025-05-15", event: "AAS-1 Certificate Issued",                          actor: "Abraxas Verification Network",     status: "COMPLETE" },
    { date: "2025-05-15", event: "Certificate Anchored On-Chain — Solana Mainnet",    actor: "Abraxas Protocol",                 status: "COMPLETE", txHash: "5CiEL0SuNR1sEGaB2luEr3iDge4GA5mesh6TxHash7Solana8Mainnet9Anchor0" },
  ],
};

// In-memory registry. Replace with Supabase query later.
const RECORDS: AssetRecord[] = [CIELO_SUNRISE];

export const assetRegistry: AssetRegistry = {
  list(): AssetRecord[] {
    return RECORDS;
  },
  get(id: string): AssetRecord | undefined {
    const q = id.toLowerCase().trim();
    return RECORDS.find(
      a => a.id.toLowerCase() === q || a.name.toLowerCase() === q
    );
  },
  search(q: string): AssetRecord[] {
    const term = q.toLowerCase();
    return RECORDS.filter(
      a => a.id.toLowerCase().includes(term)
        || a.name.toLowerCase().includes(term)
        || a.jurisdiction.toLowerCase().includes(term)
        || a.assetClass.toLowerCase().includes(term)
    );
  },
};
