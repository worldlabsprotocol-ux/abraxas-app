"use client";
// FILE: components/product/EligibilityPolicyCard.tsx

import { EnvironmentBadge } from "@/components/product/EnvironmentBadge";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export interface EligibilityPolicyCardProps {
  title: string;
  question: string;
  partnerReceives: string;
  partnerDoesNotReceive: string[];
  technicalId?: string;
  environment?: "sandbox" | "production" | "available";
  selected?: boolean;
  onSelect?: () => void;
}

export function EligibilityPolicyCard({
  title,
  question,
  partnerReceives,
  partnerDoesNotReceive,
  technicalId,
  environment,
  selected,
  onSelect,
}: EligibilityPolicyCardProps) {
  return (
    <article
      style={{
        borderRadius: 14,
        border: selected ? "1px solid rgba(16,185,129,0.5)" : "1px solid var(--border)",
        background: selected ? "rgba(16,185,129,0.06)" : "var(--surface)",
        padding: "0.9rem 1rem",
        cursor: onSelect ? "pointer" : undefined,
      }}
      onClick={onSelect}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") onSelect(); } : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.75rem", marginBottom: "0.65rem" }}>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
            {title}
          </h3>
          {technicalId && (
            <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>
              {technicalId}
            </p>
          )}
        </div>
        {environment && environment !== "available" && <EnvironmentBadge environment={environment} />}
        {environment === "available" && (
          <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)" }}>Available</span>
        )}
      </div>

      <PrivacyDisclosureCard
        compact
        requested={[{ label: question }]}
        shared={[{ label: partnerReceives }]}
        withheld={partnerDoesNotReceive.map((label) => ({ label }))}
      />
    </article>
  );
}
