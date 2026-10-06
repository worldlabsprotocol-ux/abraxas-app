"use client";
// FILE: components/partner/holder/HolderVerificationRequest.tsx
// Primary holder request card — wallet-signing clarity hierarchy.

import type { HolderVerificationPresentation } from "@/lib/partner/holderExperience/presentation";
import { HolderRequestHeader } from "./HolderRequestHeader";
import { PrivacyBoundary } from "./PrivacyBoundary";
import { HolderTechnicalDetails } from "./HolderTechnicalDetails";
import { holderBody, holderEyebrow, holderSection, HOLDER_FONT } from "./styles";

export interface HolderVerificationRequestProps {
  presentation: HolderVerificationPresentation;
  applicationOrigin?: string | null;
  showProofSource?: boolean;
}

export function HolderVerificationRequest({
  presentation,
  applicationOrigin,
  showProofSource = true,
}: HolderVerificationRequestProps) {
  return (
    <section
      aria-labelledby="holder-verification-request-heading"
      className="abx-holder-verification-request"
      style={holderSection}
    >
      <h2
        id="holder-verification-request-heading"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Verification request from {presentation.requesterName}
      </h2>

      {presentation.isSandbox ? (
        <div className="abx-holder-sandbox-badge" role="note" style={sandboxCallout}>
          <span style={sandboxBadgeText}>{presentation.sandboxBadge}</span>
          <p style={{ ...holderBody, margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
            {presentation.sandboxDetail}
          </p>
        </div>
      ) : null}

      <HolderRequestHeader
        requesterName={presentation.requesterName}
        primaryQuestion={presentation.primaryQuestion}
        applicationOrigin={applicationOrigin}
      />

      <PrivacyBoundary
        theyReceive={presentation.theyReceive}
        staysPrivate={presentation.staysPrivate}
      />

      {showProofSource && presentation.proofSource ? (
        <div style={{ marginTop: "0.75rem" }}>
          <p style={holderEyebrow}>Using</p>
          <p style={{ ...holderBody, margin: "0.2rem 0 0", fontWeight: 600, color: "var(--text-primary)" }}>
            {presentation.proofSource}
          </p>
        </div>
      ) : null}

      <HolderTechnicalDetails details={presentation.technical} />
    </section>
  );
}

const sandboxCallout: React.CSSProperties = {
  marginBottom: "0.75rem",
  padding: "0.45rem 0.6rem",
  borderRadius: 10,
  border: "1px solid rgba(244,162,97,0.35)",
  background: "rgba(244,162,97,0.08)",
};

const sandboxBadgeText: React.CSSProperties = {
  fontFamily: HOLDER_FONT,
  fontSize: "0.62rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#F4A261",
};
