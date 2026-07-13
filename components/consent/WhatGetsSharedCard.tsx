"use client";
// FILE: components/consent/WhatGetsSharedCard.tsx
// Compact pre-consent summary in plain language.

import { buildWhatGetsSharedCopy } from "@/lib/consent/whatGetsShared";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function WhatGetsSharedCard({
  partnerName,
  policyName,
  sharedLabels,
  requestedAction,
  willShareDetail,
  willNotShareItems,
  compact,
}: {
  partnerName: string;
  policyName?: string;
  sharedLabels: string[];
  requestedAction?: string | null;
  /** Optional extra rows under "Will share" */
  willShareDetail?: string[];
  willNotShareItems?: string[];
  compact?: boolean;
}) {
  const copy = buildWhatGetsSharedCopy({
    partnerName,
    policyName,
    sharedLabels,
    requestedAction,
  });

  const notShared = willNotShareItems ?? [
    "ID document images",
    "Biometric scans",
    "Full KYC provider payloads",
    "Home address (unless Trust Rules explicitly require it)",
  ];

  return (
    <div style={{
      padding: compact ? "0.85rem 1rem" : "1rem 1.1rem",
      borderRadius: 12,
      background: `${ACCENT}0A`,
      border: `1px solid ${ACCENT}33`,
      marginBottom: compact ? "0.85rem" : "1rem",
    }}>
      <div style={{
        fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.35rem",
      }}>
        {copy.headline}
      </div>
      <p style={{
        fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.88rem",
        fontWeight: 600, color: "var(--text-primary)",
        lineHeight: 1.55, margin: "0 0 0.5rem",
      }}>
        {copy.needsLine}
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
        lineHeight: 1.55, margin: "0 0 0.75rem",
      }}>
        {copy.notSharedLine}
      </p>

      {!compact && (sharedLabels.length > 0 || willShareDetail?.length) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, color: ACCENT, marginBottom: "0.3rem" }}>
              Will share
            </div>
            {(willShareDetail ?? sharedLabels).map(item => (
              <div key={item} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: 3 }}>
                ✓ {item}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.3rem" }}>
              Will not share
            </div>
            {notShared.map(item => (
              <div key={item} style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 3 }}>
                ✗ {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
