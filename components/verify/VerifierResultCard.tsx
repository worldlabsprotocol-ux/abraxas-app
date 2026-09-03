// FILE: components/verify/VerifierResultCard.tsx
// Shared result card for live + preview verifier states (server + client safe).

import Link from "next/link";
import type { VerifierResponse } from "@/lib/verifyRegistry";
import { ASSURANCE_LEVELS, assuranceRowIssuer } from "@/lib/assuranceTaxonomy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const STATE_STYLES = {
  RESOLVED_VALID: { bg: "#10B981", label: "✓ VERIFIED & ACTIVE" },
  RESOLVED_REVOKED: { bg: "#DC2626", label: "⚠ EXPIRED OR REVOKED" },
  NULL_STATE: { bg: "#64748B", label: "∅ NOT FOUND" },
} as const;

export function VerifierResultCard({
  result,
  compact,
  previewLabel,
  heroImage,
}: {
  result: VerifierResponse;
  compact?: boolean;
  previewLabel?: string;
  heroImage?: string;
}) {
  const badge = STATE_STYLES[result.state];
  const taxonomy = result.assurance_taxonomy ?? {};

  return (
    <div style={{
      borderRadius: 16, overflow: "hidden",
      border: previewLabel ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
      boxShadow: previewLabel ? "0 0 40px rgba(16,185,129,0.08)" : undefined,
    }}>
      {heroImage && (
        <div style={{ position: "relative", height: compact ? 120 : 160 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,9,11,0.85) 0%, transparent 70%)" }} />
          {result.entity_label && (
            <div style={{ position: "absolute", bottom: 12, left: 14, fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "#fff" }}>
              {result.entity_label}
            </div>
          )}
        </div>
      )}

      {previewLabel && (
        <div style={{
          padding: "0.45rem 1rem", background: "rgba(16,185,129,0.12)",
          borderBottom: "1px solid rgba(16,185,129,0.25)",
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: "#10B981",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {previewLabel}
        </div>
      )}

      <div style={{
        padding: "0.85rem 1.15rem",
        background: badge.bg,
        color: badge.bg === "#10B981" ? "#04130C" : "#fff",
        fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 800,
        letterSpacing: "0.06em",
      }}>
        {badge.label}
      </div>

      <div style={{ padding: compact ? "1rem" : "1.15rem 1.25rem" }}>
        {!heroImage && result.entity_label && (
          <div style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
            {result.entity_label}
          </div>
        )}
        {result.did && (
          <div style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "0.65rem", wordBreak: "break-all" }}>
            {result.did}
          </div>
        )}

        {!compact && (
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 1rem" }}>
            {result.notice}
          </p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: compact ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "0.5rem", marginBottom: compact ? "0.75rem" : "1rem",
        }}>
          {[
            ["Stage", result.current_pipeline_stage ?? ", "],
            ["Assurance", result.assurance_level ? `L${result.assurance_level}` : ", "],
            ...(compact ? [] : [["Class", result.asset_class ?? ", "]]),
            ["Last sync", result.last_sync_timestamp ? new Date(result.last_sync_timestamp).toLocaleDateString() : ", "],
          ].map(([k, v]) => (
            <div key={k} style={{ padding: "0.55rem", borderRadius: 8, background: "var(--surface-inset)", border: "1px solid var(--border)" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-primary)", wordBreak: "break-word" }}>{v}</div>
            </div>
          ))}
        </div>

        {!compact && Object.keys(taxonomy).length > 0 && (
          <>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700, color: "#10B981", marginBottom: "0.5rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Assurance taxonomy
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              {ASSURANCE_LEVELS.map(level => {
                const key = level.level === 1 ? "L1_IdentityClaim"
                  : level.level === 2 ? "L2_LegalReview"
                  : level.level === 3 ? "L3_ProfessionalAttestation"
                  : "L4_ActiveMonitoring";
                const row = taxonomy[key as keyof typeof taxonomy];
                if (!row) return null;
                const status = row.status ?? ", ";
                const issuer = assuranceRowIssuer(row);
                return (
                  <div key={key} style={{ padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-secondary)" }}>{level.shortLabel}</span>
                      <span style={{ fontFamily: FONT, fontSize: "0.65rem", fontWeight: 700, color: status === "VERIFIED" || status === "ACTIVE" ? "#10B981" : "var(--text-muted)" }}>{status}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 2 }}>
                      Issuer: {issuer}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {result.metadata_uri && !compact && (
          <div style={{ marginTop: "0.85rem" }}>
            <Link href={result.metadata_uri.startsWith("/") ? result.metadata_uri : result.metadata_uri}
              style={{ fontFamily: FONT, fontSize: "0.76rem", color: "#10B981", textDecoration: "none", fontWeight: 600 }}>
              View asset dossier →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
