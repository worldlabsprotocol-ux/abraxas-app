"use client";
// FILE: components/passport/PassportTrustCard.tsx
// Phase 4 unified trust status on /passport.

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

interface TrustStatus {
  ready_to_transact: boolean;
  identity: { status: string; veriff_session_id: string | null };
  credential: { active: boolean };
  on_chain: { provisioned: boolean; stamps_complete: boolean; object_id: string | null };
  intent: { proofs_count: number };
  infrastructure: { veriff_api_configured: boolean; signing_configured: boolean; sponsor_configured: boolean };
}

function dot(ok: boolean) {
  return ok ? ACCENT : "var(--text-muted)";
}

export function PassportTrustCard({ suiAddress }: { suiAddress: string | null }) {
  const [trust, setTrust] = useState<TrustStatus | null>(null);

  useEffect(() => {
    if (!suiAddress) return;
    fetch(`/api/trust/status?sui=${encodeURIComponent(suiAddress)}`)
      .then(r => r.json())
      .then(d => setTrust(d as TrustStatus))
      .catch(() => setTrust(null));
  }, [suiAddress]);

  if (!suiAddress || !trust) return null;

  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "1.15rem 1.25rem", marginBottom: "1.5rem",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
        Trust status
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
        {trust.ready_to_transact ? "Ready to transact" : "Verification in progress"}
      </div>

      <div style={{ display: "grid", gap: "0.45rem" }}>
        {[
          { label: "Veriff identity", ok: trust.identity.status === "approved", detail: trust.identity.status },
          { label: "Veriff session linked", ok: Boolean(trust.identity.veriff_session_id), detail: trust.identity.veriff_session_id ? "yes" : "missing" },
          { label: "W3C credential", ok: trust.credential.active, detail: trust.credential.active ? "active" : "pending" },
          { label: "On-chain passport", ok: trust.on_chain.provisioned, detail: trust.on_chain.stamps_complete ? "stamps complete" : "pending" },
          { label: "Intent proofs", ok: trust.intent.proofs_count > 0, detail: String(trust.intent.proofs_count) },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: FONT, fontSize: "0.75rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot(row.ok), flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>{row.label}</span>
            <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--text-muted)" }}>{row.detail}</span>
          </div>
        ))}
      </div>

      {!trust.identity.veriff_session_id && trust.identity.status === "pending" && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "#F59E0B", margin: "0.75rem 0 0", lineHeight: 1.55 }}>
          No Veriff session id saved. Redeploy latest build and click Start Precheck again so polling can finish approval.
        </p>
      )}
    </div>
  );
}
