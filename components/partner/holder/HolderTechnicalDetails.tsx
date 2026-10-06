"use client";
// FILE: components/partner/holder/HolderTechnicalDetails.tsx
// Progressive disclosure for sophisticated users — protocol details secondary.

import type { HolderTechnicalDetailsView } from "@/lib/partner/holderExperience/presentation";
import { holderBody, holderEyebrow, HOLDER_FONT } from "./styles";

export interface HolderTechnicalDetailsProps {
  details: HolderTechnicalDetailsView;
  receiptNote?: string | null;
}

export function HolderTechnicalDetails({ details, receiptNote }: HolderTechnicalDetailsProps) {
  return (
    <details className="abx-holder-technical-details" style={{ marginTop: "0.85rem" }}>
      <summary
        style={{
          fontFamily: HOLDER_FONT,
          fontSize: "0.76rem",
          fontWeight: 700,
          color: "var(--accent, #10B981)",
          cursor: "pointer",
          listStylePosition: "outside",
        }}
      >
        View details
      </summary>
      <dl
        style={{
          margin: "0.65rem 0 0",
          display: "grid",
          gap: "0.55rem",
        }}
      >
        <DetailRow label="Requesting service" value={details.requestingService} />
        <DetailRow label="Purpose" value={details.purpose} />
        <DetailRow label="Result being requested" value={details.resultRequested} />
        <DetailRow label="Result family" value={details.resultFamily} />
        <DetailRow label="Environment" value={details.environment} />
        <DetailRow label="Policy" value={details.policyTitle} />
        {receiptNote ? <DetailRow label="Receipt" value={receiptNote} /> : null}
      </dl>
    </details>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={holderEyebrow}>{label}</dt>
      <dd style={{ ...holderBody, margin: "0.15rem 0 0", fontSize: "0.76rem" }}>{value}</dd>
    </div>
  );
}
