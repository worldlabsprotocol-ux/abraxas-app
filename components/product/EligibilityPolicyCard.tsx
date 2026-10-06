"use client";
// FILE: components/product/EligibilityPolicyCard.tsx

import { useState } from "react";
import { EnvironmentBadge } from "@/components/product/EnvironmentBadge";
import { PrivacyDisclosureCard } from "@/components/product/PrivacyDisclosureCard";
import { ABX_FONT_SANS, ABX_FONT_MONO } from "@/lib/design/abraxasDesignSystem";
import type { CompatibilityHint, PolicyCardAvailability } from "@/lib/partner/launchpad/policyPresentation";

const FONT = ABX_FONT_SANS;
const MONO = ABX_FONT_MONO;

export interface EligibilityPolicyCardProps {
  title: string;
  question: string;
  partnerReceives: string;
  partnerDoesNotReceive: string[];
  technicalId?: string;
  packId?: string;
  catalogVersion?: number;
  resultFamily?: string;
  environment?: "sandbox" | "production" | "available";
  selected?: boolean;
  onSelect?: () => void;
  availability?: PolicyCardAvailability;
  policyProductionEligible?: boolean;
  applicationProductionAuthorized?: boolean;
  compatibilityHint?: CompatibilityHint;
  requestVolume?: number | null;
  verifiedReceipts?: number | null;
  evidenceReuseCount?: number | null;
  minimumAssurance?: string;
  receiptLifetimeHours?: number;
  reuseNotice?: string;
  recommendedReason?: string;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

const AVAILABILITY_LABELS: Record<PolicyCardAvailability, string> = {
  active: "Production active",
  available: "Available",
  sandbox_only: "Sandbox only",
  production_eligible: "Production eligible",
  configured: "Configured",
  requires_review: "Production review required",
  unavailable: "Unavailable",
  retired: "Retired",
};

const COMPATIBILITY_LABELS: Record<CompatibilityHint, string> = {
  reusable_available: "Reusable evidence available",
  refresh_required: "Refresh required",
  different_evidence_required: "Different verified evidence required",
  reuse_unavailable: "Reuse unavailable",
  unavailable: "Reuse status unavailable",
};

export function EligibilityPolicyCard({
  title,
  question,
  partnerReceives,
  partnerDoesNotReceive,
  technicalId,
  packId,
  catalogVersion,
  resultFamily,
  environment,
  selected,
  onSelect,
  availability,
  policyProductionEligible,
  applicationProductionAuthorized,
  compatibilityHint,
  requestVolume,
  verifiedReceipts,
  evidenceReuseCount,
  minimumAssurance,
  receiptLifetimeHours,
  reuseNotice,
  recommendedReason,
  showTechnicalDetails = false,
  compact = false,
}: EligibilityPolicyCardProps) {
  const [expanded, setExpanded] = useState(showTechnicalDetails);
  const interactive = Boolean(onSelect);

  return (
    <article
      style={{
        borderRadius: 14,
        border: selected ? "1px solid rgba(16,185,129,0.5)" : "1px solid var(--border)",
        background: selected ? "rgba(16,185,129,0.06)" : "var(--surface)",
        padding: compact ? "0.75rem 0.85rem" : "0.9rem 1rem",
        cursor: interactive ? "pointer" : undefined,
      }}
      onClick={interactive ? onSelect : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? selected : undefined}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      } : undefined}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.75rem", marginBottom: "0.65rem" }}>
        <div>
          <h3 style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 800, margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
            {title}
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: "0 0 0.2rem", lineHeight: 1.45 }}>
            {question}
          </p>
          {technicalId && (
            <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: 0 }}>
              {technicalId}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem" }}>
          {environment && environment !== "available" && <EnvironmentBadge environment={environment} />}
          {environment === "available" && (
            <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)" }}>Available</span>
          )}
          {availability && (
            <StatusChip label={AVAILABILITY_LABELS[availability]} tone={availabilityTone(availability)} />
          )}
        </div>
      </div>

      {recommendedReason && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", margin: "0 0 0.55rem", fontStyle: "italic" }}>
          {recommendedReason}
        </p>
      )}

      <PrivacyDisclosureCard
        compact
        requested={[{ label: question }]}
        shared={[{ label: partnerReceives }]}
        withheld={partnerDoesNotReceive.map((label) => ({ label }))}
      />

      {(policyProductionEligible !== undefined || applicationProductionAuthorized !== undefined) && (
        <div style={{ marginTop: "0.65rem", display: "grid", gap: "0.35rem" }}>
          {policyProductionEligible !== undefined && (
            <AuthRow label="Policy" value={policyProductionEligible ? "Production eligible" : "Sandbox only"} />
          )}
          {applicationProductionAuthorized !== undefined && (
            <AuthRow
              label="Your application"
              value={applicationProductionAuthorized ? "Production active" : "Sandbox only · production review required"}
            />
          )}
        </div>
      )}

      {compatibilityHint && compatibilityHint !== "unavailable" && (
        <p style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)", margin: "0.55rem 0 0" }}>
          {COMPATIBILITY_LABELS[compatibilityHint]}
        </p>
      )}

      {(requestVolume != null || verifiedReceipts != null || evidenceReuseCount != null) && (
        <dl style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", margin: "0.55rem 0 0", fontFamily: FONT, fontSize: "0.68rem" }}>
          {requestVolume != null && (
            <div><dt style={{ color: "var(--text-muted)", display: "inline" }}>Requests </dt><dd style={{ display: "inline", margin: 0 }}>{requestVolume}</dd></div>
          )}
          {verifiedReceipts != null && (
            <div><dt style={{ color: "var(--text-muted)", display: "inline" }}>Verified receipts </dt><dd style={{ display: "inline", margin: 0 }}>{verifiedReceipts}</dd></div>
          )}
          {evidenceReuseCount != null && (
            <div><dt style={{ color: "var(--text-muted)", display: "inline" }}>Evidence reused </dt><dd style={{ display: "inline", margin: 0 }}>{evidenceReuseCount}</dd></div>
          )}
        </dl>
      )}

      {(packId || minimumAssurance || reuseNotice) && (
        <div style={{ marginTop: "0.55rem" }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-expanded={expanded}
            style={{
              fontFamily: FONT,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "var(--accent)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {expanded ? "Hide technical details" : "Show technical details"}
          </button>
          {expanded && (
            <dl style={{ margin: "0.45rem 0 0", display: "grid", gap: "0.3rem", fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)" }}>
              {packId && <div><dt style={{ display: "inline" }}>Pack </dt><dd style={{ display: "inline", margin: 0 }}>{packId}</dd></div>}
              {catalogVersion != null && <div><dt style={{ display: "inline" }}>Version </dt><dd style={{ display: "inline", margin: 0 }}>{catalogVersion}</dd></div>}
              {resultFamily && <div><dt style={{ display: "inline" }}>Result family </dt><dd style={{ display: "inline", margin: 0 }}>{resultFamily}</dd></div>}
              {minimumAssurance && <div><dt style={{ display: "inline" }}>Minimum assurance </dt><dd style={{ display: "inline", margin: 0 }}>{minimumAssurance}</dd></div>}
              {receiptLifetimeHours != null && <div><dt style={{ display: "inline" }}>Receipt lifetime </dt><dd style={{ display: "inline", margin: 0 }}>{receiptLifetimeHours}h</dd></div>}
              {reuseNotice && (
                <dd style={{ margin: "0.25rem 0 0", fontFamily: FONT, fontSize: "0.65rem", lineHeight: 1.45, color: "var(--text-secondary)" }}>
                  {reuseNotice}
                </dd>
              )}
            </dl>
          )}
        </div>
      )}
    </article>
  );
}

function AuthRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", fontFamily: FONT, fontSize: "0.68rem" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontWeight: 700, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "success" | "warn" | "muted" | "error" }) {
  const colors = {
    success: { border: "rgba(16,185,129,0.45)", color: "#10B981" },
    warn: { border: "rgba(245,158,11,0.45)", color: "#F59E0B" },
    muted: { border: "var(--border)", color: "var(--text-muted)" },
    error: { border: "rgba(239,68,68,0.45)", color: "#EF4444" },
  }[tone];
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: "0.62rem",
        fontWeight: 700,
        padding: "0.18rem 0.45rem",
        borderRadius: 999,
        border: `1px solid ${colors.border}`,
        color: colors.color,
      }}
    >
      {label}
    </span>
  );
}

function availabilityTone(availability: PolicyCardAvailability): "success" | "warn" | "muted" | "error" {
  if (availability === "active") return "success";
  if (availability === "requires_review" || availability === "sandbox_only") return "warn";
  if (availability === "retired" || availability === "unavailable") return "error";
  return "muted";
}
