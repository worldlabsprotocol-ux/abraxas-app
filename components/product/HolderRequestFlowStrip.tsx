"use client";
// FILE: components/product/HolderRequestFlowStrip.tsx
// Compact partner → Passport → minimal answer visualization for holder consent.

import { ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export interface HolderRequestFlowStripProps {
  partnerName: string;
  question: string;
  sharedLabel: string;
}

export function HolderRequestFlowStrip({
  partnerName,
  question,
  sharedLabel,
}: HolderRequestFlowStripProps) {
  return (
    <div
      className="abx-holder-flow-strip"
      role="img"
      aria-label={`${partnerName} asks a question; your Passport returns ${sharedLabel} only`}
    >
      <div className="abx-holder-flow-strip__step" style={{ fontFamily: FONT }}>
        <strong>{partnerName}</strong>
        <br />
        {question}
      </div>
      <span className="abx-holder-flow-strip__arrow" aria-hidden>
        →
      </span>
      <div className="abx-holder-flow-strip__step" style={{ fontFamily: FONT }}>
        Your Passport
      </div>
      <span className="abx-holder-flow-strip__arrow" aria-hidden>
        →
      </span>
      <div className="abx-holder-flow-strip__step" style={{ fontFamily: FONT }}>
        <strong style={{ color: "#10B981" }}>{sharedLabel}</strong>
      </div>
    </div>
  );
}
