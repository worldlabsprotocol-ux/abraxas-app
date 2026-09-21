// FILE: lib/reclaimAttestation/issuer.ts

import type { VerificationIssuerRecord } from "@/lib/verification/issuerTrust/registry";
import {
  reclaimCallbackAllowlisted,
  reclaimCallbackUrl,
  reclaimConfigurationPresent,
  reclaimIsIntegrationReady,
  reclaimMappingPresent,
} from "./config";
import { RECLAIM_ATTESTATION_DOCS } from "./contract";

export function overlayReclaimIssuerRecord(record: VerificationIssuerRecord): VerificationIssuerRecord {
  if (record.issuer_key !== "reclaim.privacy_preserving") return record;
  const ready = reclaimIsIntegrationReady();
  return {
    ...record,
    docs: RECLAIM_ATTESTATION_DOCS,
    status: ready ? "active" : "review_required",
    integration: ready ? "integration_ready" : "planned",
  };
}

export function reclaimIssuerPublicStatus() {
  const ready = reclaimIsIntegrationReady();
  return {
    configuration_present: reclaimConfigurationPresent(),
    mapping_present: reclaimMappingPresent(),
    callback_allowlisted: reclaimCallbackAllowlisted(reclaimCallbackUrl()),
    integration_ready: ready,
    holder_selectable: ready,
    partner_selectable: false,
    reviewed_live_provider: false,
    docs: RECLAIM_ATTESTATION_DOCS,
    google_is_eligibility: false,
  };
}
