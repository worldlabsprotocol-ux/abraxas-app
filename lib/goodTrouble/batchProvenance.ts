// FILE: lib/goodTrouble/batchProvenance.ts
// Cannabis batch / product provenance — foundation for Good Trouble SDK + W3C VC issuance.

import { GOOD_TROUBLE_PARTNER_ID } from "@/lib/goodTrouble/constants";

/** Abraxas vertical record ID prefix for cannabis batches (pilot fixtures) */
export const GOOD_TROUBLE_BATCH_RECORD_PREFIX = "ABX-CNB-BATCH" as const;

export type CoaStatus = "pending" | "on_file" | "lab_verified";
export type CultivarCategory = "indica" | "sativa" | "hybrid" | "indica_hybrid" | "sativa_hybrid";

export interface CannabisBatchRecord {
  /** Abraxas registry-style ID, e.g. ABX-CNB-BATCH-007 */
  record_id: string;
  partner_id: typeof GOOD_TROUBLE_PARTNER_ID;
  /** Partner batch / lot identifier */
  batch_code: string;
  cultivar: string;
  category: CultivarCategory;
  harvest_date: string;
  packaged_date?: string;
  state: "MO";
  organic_claim: boolean;
  coa_status: CoaStatus;
  /** Lab results — attested by partner; Abraxas does not run labs in pilot */
  lab?: {
    thc_percent?: number;
    cbd_percent?: number;
    lab_name?: string;
    report_ref?: string;
  };
  /** Human-readable terpene / effect notes from cultivator (not Abraxas-verified medical claims) */
  profile_notes?: string;
}

/**
 * Pilot fixture batches modeled on public Good Trouble cultivar names.
 * Replace with COA-backed records when production attestation flow is live.
 */
export const GOOD_TROUBLE_SAMPLE_BATCHES: CannabisBatchRecord[] = [
  {
    record_id: "ABX-CNB-BATCH-001",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    batch_code: "GT-KC-2026-CHO-01",
    cultivar: "Chocolope",
    category: "sativa_hybrid",
    harvest_date: "2026-05-12",
    packaged_date: "2026-06-01",
    state: "MO",
    organic_claim: true,
    coa_status: "on_file",
    lab: { thc_percent: 28.1, cbd_percent: 0.4, lab_name: "Partner COA (pilot)", report_ref: "COA-GT-CHO-2026-05" },
    profile_notes: "Rich cocoa and coffee notes. Daytime clarity — cultivator description.",
  },
  {
    record_id: "ABX-CNB-BATCH-002",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    batch_code: "GT-KC-2026-FPO-01",
    cultivar: "Fruity Pebbles OG",
    category: "indica_hybrid",
    harvest_date: "2026-05-18",
    packaged_date: "2026-06-08",
    state: "MO",
    organic_claim: true,
    coa_status: "on_file",
    lab: { thc_percent: 32.4, cbd_percent: 0.2, lab_name: "Partner COA (pilot)", report_ref: "COA-GT-FPO-2026-05" },
    profile_notes: "Sweet, fruity tropical finish. Energetic onset easing to calm — per brand profile.",
  },
  {
    record_id: "ABX-CNB-BATCH-003",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    batch_code: "GT-KC-2026-GEL-01",
    cultivar: "Gelato",
    category: "hybrid",
    harvest_date: "2026-05-22",
    packaged_date: "2026-06-12",
    state: "MO",
    organic_claim: true,
    coa_status: "on_file",
    lab: { thc_percent: 29.6, cbd_percent: 0.3, lab_name: "Partner COA (pilot)", report_ref: "COA-GT-GEL-2026-05" },
    profile_notes: "Dessert-like berry and citrus. Balanced euphoria — cultivator description.",
  },
  {
    record_id: "ABX-CNB-BATCH-004",
    partner_id: GOOD_TROUBLE_PARTNER_ID,
    batch_code: "GT-KC-2026-ZOA-01",
    cultivar: "Zoap",
    category: "hybrid",
    harvest_date: "2026-06-02",
    packaged_date: "2026-06-20",
    state: "MO",
    organic_claim: true,
    coa_status: "pending",
    profile_notes: "Pilot batch — COA upload pending partner attestation.",
  },
];

export function getGoodTroubleBatch(recordId: string): CannabisBatchRecord | undefined {
  const q = recordId.trim().toUpperCase();
  return GOOD_TROUBLE_SAMPLE_BATCHES.find(
    b => b.record_id.toUpperCase() === q || b.batch_code.toUpperCase() === q,
  );
}

export function batchVerifyPayload(batch: CannabisBatchRecord) {
  return {
    record_id: batch.record_id,
    partner_id: batch.partner_id,
    batch_code: batch.batch_code,
    cultivar: batch.cultivar,
    coa_status: batch.coa_status,
    organic_claim: batch.organic_claim,
    assurance_note:
      "Pilot fixture — partner-attested batch metadata. Not Abraxas lab verification until L3 attestation is wired.",
  };
}
