"use client";
// FILE: components/partner/launchpad/PartnerLaunchpadTechnicalDetails.tsx

import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export interface TechnicalDetailsData {
  applicationId: string;
  partnerId?: string;
  publicSlug?: string;
  bindingId?: string | null;
  policyId: string;
  policyTemplateId: string;
  resultFamily?: string;
  environment: string;
  keyPrefix?: string | null;
  integrationStatus: string;
  allowedReturnUrls: string[];
  productionActive?: boolean;
}

export function PartnerLaunchpadTechnicalDetails({
  data,
}: {
  data: TechnicalDetailsData;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Application ID", value: data.applicationId },
    ...(data.partnerId ? [{ label: "Partner ID", value: data.partnerId }] : []),
    ...(data.publicSlug ? [{ label: "Public slug", value: data.publicSlug }] : []),
    ...(data.bindingId ? [{ label: "Binding ID", value: data.bindingId }] : []),
    { label: "Policy ID", value: data.policyId },
    { label: "Policy template", value: data.policyTemplateId },
    ...(data.resultFamily ? [{ label: "Result family", value: data.resultFamily }] : []),
    { label: "Environment", value: data.environment },
    { label: "Credential prefix", value: data.keyPrefix ?? "Not configured" },
    { label: "Integration status", value: data.integrationStatus },
    { label: "Production active", value: data.productionActive ? "Yes" : "No" },
    {
      label: "Callback URLs",
      value: data.allowedReturnUrls.length ? `${data.allowedReturnUrls.length} configured` : "None",
    },
  ];

  return (
    <details style={{ marginTop: "0.85rem" }}>
      <summary
        style={{
          fontFamily: FONT,
          fontSize: "0.74rem",
          fontWeight: 700,
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
      >
        View technical details
      </summary>
      <div
        style={{
          marginTop: "0.65rem",
          padding: "0.75rem",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--surface-inset)",
          display: "grid",
          gap: "0.45rem",
        }}
      >
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 34%) 1fr",
              gap: "0.65rem",
              alignItems: "start",
            }}
          >
            <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)" }}>{row.label}</span>
            <code
              style={{
                fontFamily: MONO,
                fontSize: "0.64rem",
                color: "var(--text-secondary)",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {row.value}
            </code>
          </div>
        ))}
        <p style={{ fontFamily: FONT, fontSize: "0.64rem", color: "var(--text-muted)", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
          Developer tools such as starter kits, webhooks, verifyForAction examples, and integration events remain available in the advanced sections below.
        </p>
      </div>
    </details>
  );
}
