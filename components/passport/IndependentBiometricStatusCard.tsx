"use client";
// FILE: components/passport/IndependentBiometricStatusCard.tsx
// Live status for Abraxas independent IDV on /passport.

import { useEffect, useState } from "react";
import Link from "next/link";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

interface IdvStatus {
  status: "live" | "partial" | "not_configured";
  label: string;
  summary: string;
  signing_key_configured: boolean;
  on_chain_issuer_configured: boolean;
  pending_review_count: number | null;
}

const STATUS_COLOR = {
  live: "#10B981",
  partial: "#F59E0B",
  not_configured: "#F87171",
} as const;

export function IndependentBiometricStatusCard({ manualMode }: { manualMode: boolean }) {
  const [status, setStatus] = useState<IdvStatus | null>(null);

  useEffect(() => {
    if (!manualMode) return;
    fetch("/api/idv/independent/status")
      .then(r => r.json())
      .then(data => setStatus(data as IdvStatus))
      .catch(() => {});
  }, [manualMode]);

  if (!manualMode) return null;

  const color = status ? STATUS_COLOR[status.status] : "var(--text-muted)";

  return (
    <div style={{
      padding: "0.75rem 0.9rem",
      borderRadius: 12,
      marginBottom: "1rem",
      border: `1px solid ${color}44`,
      background: `${color}08`,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.1em", color }}>
          INDEPENDENT BIOMETRIC IDV {status ? `· ${status.status.toUpperCase()}` : ""}
        </span>
        <Link href="/api/idv/independent/status" style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none" }}>
          Health JSON →
        </Link>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        {status?.summary ?? "Abraxas camera capture + human review — not Veriff. Name, ID, and selfie below."}
      </p>
      {status && status.pending_review_count != null && status.pending_review_count > 0 && (
        <p style={{ fontFamily: MONO, fontSize: "0.58rem", color, margin: "6px 0 0" }}>
          {status.pending_review_count} capture(s) pending admin review
        </p>
      )}
    </div>
  );
}
