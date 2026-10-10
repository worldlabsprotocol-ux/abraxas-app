// FILE: lib/partner/universalIntegration/commercialMeteringAudit.ts
// Static audit of billing-relevant signals — no payment processing.

export interface CommercialMeteringFinding {
  id: string;
  severity: "high" | "medium" | "low" | "info";
  signal: string;
  status: "implemented" | "partial" | "unverified" | "missing";
  detail: string;
}

export function auditCommercialMeteringCapabilities(): CommercialMeteringFinding[] {
  return [
    {
      id: "partner_api_usage_table",
      severity: "medium",
      signal: "partner_api_usage row insert on partner API calls",
      status: "implemented",
      detail: "logPartnerUsage inserts endpoint, partner_id, api_key_id, success — best-effort; skipped when Supabase env missing.",
    },
    {
      id: "metering_idempotency_receipt",
      severity: "high",
      signal: "Billable receipt issuance deduplication",
      status: "implemented",
      detail: "maybeRecordPartnerFlowReceiptMetering only records when replayStatus === issued and decision approved.",
    },
    {
      id: "metering_api_call_dedup",
      severity: "medium",
      signal: "Partner API call metering idempotency key",
      status: "implemented",
      detail: "buildPartnerApiMeteringKey hashes partnerId, method, endpoint, correlationId — excludes public receipt read endpoints.",
    },
    {
      id: "harness_exclusion",
      severity: "high",
      signal: "Exclude harness/smoke from adoption metrics",
      status: "partial",
      detail: "Launchpad activity distinguishes events; pilot evidence filters exist but operators must exclude synthetic apps manually.",
    },
    {
      id: "reconciliation_export",
      severity: "low",
      signal: "Billing reconciliation export",
      status: "unverified",
      detail: "No dedicated billing reconciliation job in repo — partner_api_usage + metering events require external ETL for invoices.",
    },
    {
      id: "cross_tenant_metering",
      severity: "high",
      signal: "Tenant attribution on metering rows",
      status: "implemented",
      detail: "Metering hooks require entry.partner.partnerId; null partner skips recordPartnerMeteringEventBestEffort.",
    },
  ];
}
