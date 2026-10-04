"use client";
// FILE: components/partner/holder/HolderRequestHeader.tsx
// Requester identity — visually obvious before the question.

import { holderBody, holderEyebrow, holderTitle, HOLDER_FONT } from "./styles";

export interface HolderRequestHeaderProps {
  requesterName: string;
  primaryQuestion: string;
  applicationOrigin?: string | null;
}

export function HolderRequestHeader({
  requesterName,
  primaryQuestion,
  applicationOrigin,
}: HolderRequestHeaderProps) {
  return (
    <header className="abx-holder-request-header">
      <p style={holderEyebrow}>Requesting service</p>
      <p className="abx-holder-request-header__name" style={holderTitle}>
        {requesterName}
      </p>
      {applicationOrigin ? (
        <p style={{ ...holderBody, marginTop: "0.25rem", fontSize: "0.74rem", color: "var(--text-muted)" }}>
          {applicationOrigin}
        </p>
      ) : null}
      <p style={{ ...holderEyebrow, marginTop: "0.85rem" }}>Wants to confirm</p>
      <p
        className="abx-holder-request-header__question"
        style={{
          margin: "0.2rem 0 0",
          fontFamily: HOLDER_FONT,
          fontSize: "0.95rem",
          fontWeight: 700,
          lineHeight: 1.45,
          color: "var(--text-primary, #f4f4f5)",
        }}
      >
        {primaryQuestion}
      </p>
    </header>
  );
}
