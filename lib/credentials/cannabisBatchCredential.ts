// FILE: lib/credentials/cannabisBatchCredential.ts
// W3C VC shape for cannabis batch provenance — aligns with Abraxas asset attestation patterns.

import type { CannabisBatchRecord } from "@/lib/goodTrouble/batchProvenance";

/** VC type array for cannabis batch attestations (future issuance) */
export const CANNABIS_BATCH_VC_TYPES = [
  "VerifiableCredential",
  "AbraxasCannabisBatchCredential",
] as const;

export const CANNABIS_BATCH_SCHEMA_ID = "schema:abraxas-cannabis-batch-v1" as const;

export interface AbraxasCannabisBatchCredentialSubject {
  /** Batch registry ID (ABX-CNB-BATCH-*) */
  record_id: string;
  partner_id: string;
  batch_code: string;
  cultivar: string;
  state: string;
  organic_claim: boolean;
  coa_status: string;
  /** ISO harvest date */
  harvest_date: string;
  lab_thc_percent?: number;
  lab_cbd_percent?: number;
}

/** Map pilot batch record → VC subject (issuance-ready shape) */
export function batchToCredentialSubject(batch: CannabisBatchRecord): AbraxasCannabisBatchCredentialSubject {
  return {
    record_id: batch.record_id,
    partner_id: batch.partner_id,
    batch_code: batch.batch_code,
    cultivar: batch.cultivar,
    state: batch.state,
    organic_claim: batch.organic_claim,
    coa_status: batch.coa_status,
    harvest_date: batch.harvest_date,
    lab_thc_percent: batch.lab?.thc_percent,
    lab_cbd_percent: batch.lab?.cbd_percent,
  };
}
