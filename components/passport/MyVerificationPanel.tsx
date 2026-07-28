"use client";
// FILE: components/passport/MyVerificationPanel.tsx
// User-facing verification status — own submission only.

import { useCallback, useEffect, useState } from "react";
import { AbraxasIdentityCapture } from "@/components/passport/AbraxasIdentityCapture";
import { Btn } from "@/components/redesign/ui";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

interface MyVerification {
  has_submission: boolean;
  status?: string;
  legal_name?: string | null;
  submitted_at?: string;
  reviewed_at?: string | null;
  reviewer_note?: string | null;
  engine_decision?: string | null;
  can_resubmit?: boolean;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  under_review: { label: "Under review", color: "#F59E0B" },
  resubmission_requested: { label: "Resubmission requested", color: "#F59E0B" },
  approved: { label: "Verified", color: ACCENT },
  rejected: { label: "Not approved", color: "#EF4444" },
  submitted: { label: "Submitted", color: "#F59E0B" },
};

export function MyVerificationPanel({
  email,
  suiAddress,
  onUpdated,
}: {
  email: string;
  suiAddress: string | null;
  onUpdated?: () => void;
}) {
  const [data, setData] = useState<MyVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/identity/my-verification");
      if (res.ok) {
        setData(await res.json() as MyVerification);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (suiAddress) void load();
  }, [suiAddress, load]);

  if (!suiAddress || loading) return null;
  if (!data?.has_submission) return null;

  const statusKey = data.status ?? "submitted";
  const statusMeta = STATUS_LABEL[statusKey] ?? STATUS_LABEL.submitted;

  return (
    <div style={{
      padding: "1rem", borderRadius: 12, marginBottom: "0.85rem",
      background: "var(--surface-inset)", border: "1px solid var(--border-strong)",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
        My identity verification
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusMeta.color }} />
        <span style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 700, color: statusMeta.color }}>
          {statusMeta.label}
        </span>
      </div>

      {data.legal_name && (
        <div style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 4 }}>
          {data.legal_name}
        </div>
      )}

      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
        {data.submitted_at && <div>Submitted {new Date(data.submitted_at).toLocaleString()}</div>}
        {data.reviewed_at && <div>Reviewed {new Date(data.reviewed_at).toLocaleString()}</div>}
        {data.engine_decision && <div>Engine recommendation: {data.engine_decision}</div>}
      </div>

      {data.reviewer_note && (
        <div style={{
          marginTop: "0.65rem", padding: "0.65rem 0.75rem", borderRadius: 8,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
        }}>
          <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "#F59E0B", marginBottom: 4 }}>
            Reviewer note
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
            {data.reviewer_note}
          </p>
        </div>
      )}

      {data.can_resubmit && !showUpload && (
        <div style={{ marginTop: "0.75rem" }}>
          <Btn size="sm" onClick={() => setShowUpload(true)}>Upload new documents</Btn>
        </div>
      )}

      {showUpload && (
        <div style={{ marginTop: "0.75rem" }}>
          <AbraxasIdentityCapture
            email={email}
            suiAddress={suiAddress}
            onSubmitted={() => {
              setShowUpload(false);
              void load();
              onUpdated?.();
            }}
          />
        </div>
      )}
    </div>
  );
}
