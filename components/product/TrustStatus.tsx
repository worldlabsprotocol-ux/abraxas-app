"use client";
// FILE: components/product/TrustStatus.tsx
// User-friendly trust / validity states with optional technical expansion.

import { useState } from "react";
import { AbxStatusBadge } from "@/components/design/AbxPrimitives";
import type { AbxStatusTone } from "@/lib/design/abraxasDesignSystem";
import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export type TrustStatusKind =
  | "verified"
  | "current"
  | "reusable"
  | "refresh_required"
  | "revoked"
  | "expired"
  | "under_review"
  | "pending"
  | "incompatible";

const TRUST_LABELS: Record<TrustStatusKind, { label: string; tone: AbxStatusTone }> = {
  verified: { label: "Verified", tone: "success" },
  current: { label: "Current", tone: "success" },
  reusable: { label: "Reusable", tone: "info" },
  refresh_required: { label: "Refresh required", tone: "warning" },
  revoked: { label: "Revoked", tone: "error" },
  expired: { label: "Expired", tone: "error" },
  under_review: { label: "Under review", tone: "warning" },
  pending: { label: "Pending", tone: "neutral" },
  incompatible: { label: "Incompatible", tone: "warning" },
};

export interface TrustStatusItem {
  kind: TrustStatusKind;
  detail?: string;
}

export interface TrustStatusProps {
  items: TrustStatusItem[];
  technicalDetails?: Array<{ label: string; value: string }>;
  audience?: "holder" | "partner" | "operator";
}

export function TrustStatus({ items, technicalDetails, audience = "holder" }: TrustStatusProps) {
  const [expanded, setExpanded] = useState(false);
  const showTechnical = audience !== "holder" && technicalDetails && technicalDetails.length > 0;

  return (
    <div className="abx-trust-status">
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {items.map((item) => {
          const meta = TRUST_LABELS[item.kind];
          return (
            <span key={item.kind} title={item.detail}>
              <AbxStatusBadge label={meta.label} tone={meta.tone} />
            </span>
          );
        })}
      </div>
      {items.some((i) => i.detail) && (
        <ul style={{ margin: "0.55rem 0 0", padding: 0, listStyle: "none", display: "grid", gap: "0.2rem" }}>
          {items.filter((i) => i.detail).map((item) => (
            <li key={item.kind} style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {TRUST_LABELS[item.kind].label}: {item.detail}
            </li>
          ))}
        </ul>
      )}
      {showTechnical && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              marginTop: "0.55rem",
              fontFamily: FONT,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded ? "Hide technical detail" : "Show technical detail"}
          </button>
          {expanded && (
            <dl style={{ margin: "0.45rem 0 0", display: "grid", gap: "0.25rem" }}>
              {technicalDetails!.map((row) => (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem" }}>
                  <dt style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>{row.label}</dt>
                  <dd style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-secondary)", margin: 0 }}>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}
