"use client";
// FILE: components/integrations/RelyingPartyProofStatus.tsx

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface ProofStatus {
  met: boolean;
  approvedProductionChecks: number;
  criteria: string;
  latest: {
    partnerId: string;
    createdAt: string;
    recordId: string | null;
  } | null;
}

export function RelyingPartyProofStatus() {
  const [status, setStatus] = useState<ProofStatus | null>(null);

  useEffect(() => {
    fetch("/api/integrations/relying-party-proof")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (!status) return null;

  return (
    <div
      className="abx-glass-panel"
      style={{
        padding: "1rem 1.15rem",
        borderRadius: 14,
        border: `1px solid ${status.met ? "rgba(16,185,129,0.35)" : "var(--border-strong)"}`,
        background: status.met ? "rgba(16,185,129,0.06)" : "var(--surface-raised)",
        marginBottom: "1rem",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.35rem" }}>
        Mainnet gate · external relying party
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: "0 0 0.5rem" }}>
        {status.criteria}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: status.met ? "var(--accent-verify, #10B981)" : "var(--accent)", margin: 0 }}>
        {status.met
          ? `✓ ${status.approvedProductionChecks} approved production check(s) logged`
          : `In progress — ${status.approvedProductionChecks} external production approvals logged`}
      </p>
      {status.latest && (
        <p style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--text-muted)", margin: "0.5rem 0 0" }}>
          Latest: {status.latest.partnerId} · {status.latest.recordId ?? "wallet/policy"} · {new Date(status.latest.createdAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
