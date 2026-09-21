// FILE: lib/verification/issuerTrust/project.ts

import {
  ISSUER_TRUST_STATUS_LABELS,
  VERIFICATION_ISSUER_TRUST_NOTICE,
  VERIFICATION_ISSUER_TRUST_VERSION,
} from "./contract";
import { isHolderSelectable, issuerRecordIsCurrent } from "./match";
import { opaqueIssuerRef, VERIFICATION_ISSUER_TRUST_RECORDS } from "./registry";

export function projectIssuerTrustRegistry(now?: Date) {
  return {
    version: VERIFICATION_ISSUER_TRUST_VERSION,
    notice: VERIFICATION_ISSUER_TRUST_NOTICE,
    creates_policy: false as const,
    publishes_catalog: false as const,
    activates_mainnet: false as const,
    browser_can_publish: false as const,
    items: VERIFICATION_ISSUER_TRUST_RECORDS.map((record) => ({
      issuer_ref: opaqueIssuerRef(record.issuer_key, record.record_version),
      record_version: record.record_version,
      label: record.label,
      method_category: record.method_category,
      assurance_level: record.assurance_level,
      result_categories: [...record.result_categories],
      subject_binding: record.subject_binding,
      environments: [...record.environments],
      disclosure_boundary: record.disclosure_boundary,
      status: record.status,
      status_label: ISSUER_TRUST_STATUS_LABELS[record.status],
      valid_from: record.valid_from,
      valid_until: record.valid_until,
      docs: record.docs,
      integration: record.integration,
      current: issuerRecordIsCurrent(record, now),
      holder_selectable: isHolderSelectable(record),
      partner_selectable: false as const,
    })),
  };
}
